import { BufferAttribute, BufferGeometry } from 'three';
import type { InterleavedBufferAttribute } from 'three';

export interface MeshOptimizationOptions {
  /**
   * Target ratio of vertices to keep in [0.01, 1.0].
   * Ignored when `targetVertexCount` is provided.
   */
  targetRatio?: number;

  /** Absolute target vertex count to keep after optimization. */
  targetVertexCount?: number;

  /** Lower bound for target vertex count. */
  minVertexCount?: number;

  /**
   * Grid cell scale multiplier.
   * Higher values produce stronger reduction.
   */
  aggressiveness?: number;
}

export interface MeshLodOptions extends MeshOptimizationOptions {
  /** Number of LOD levels including the base level. */
  levels?: number;

  /** Per-level ratio multiplier in (0, 1). */
  ratioStep?: number;
}

interface ClusterAccumulator {
  count: number;
  px: number;
  py: number;
  pz: number;
  nx: number;
  ny: number;
  nz: number;
  uvx: number;
  uvy: number;
}

const DEFAULT_MIN_VERTEX_COUNT = 32;
const DEFAULT_LEVELS = 3;
const DEFAULT_RATIO_STEP = 0.6;
const DEFAULT_AGGRESSIVENESS = 1;
const EPSILON = 1e-6;

/**
 * Reduce geometry vertex count using deterministic spatial clustering.
 * Returns a new geometry and never mutates the input.
 */
export function optimizeGeometry(
  geometry: BufferGeometry,
  options: MeshOptimizationOptions = {},
): BufferGeometry {
  const sourcePosition = geometry.getAttribute('position');
  if (!sourcePosition || sourcePosition.itemSize < 3 || sourcePosition.count < 4) {
    return geometry.clone();
  }

  const sourceCount = sourcePosition.count;
  const minVertexCount = normalizeMinVertexCount(options.minVertexCount);
  const targetCount = resolveTargetCount(sourceCount, options, minVertexCount);
  if (targetCount >= sourceCount) {
    return geometry.clone();
  }

  const source = geometry.clone();
  const clustersResult = clusterGeometry(
    source,
    targetCount,
    normalizeAggressiveness(options.aggressiveness),
  );

  if (!clustersResult) {
    return source;
  }

  const { clusterCount, vertexToCluster } = clustersResult;
  if (clusterCount < 4 || clusterCount >= sourceCount) {
    return source;
  }

  const optimized = rebuildGeometryFromClusters(source, clusterCount, vertexToCluster);
  const optimizedPos = optimized.getAttribute('position');
  if (!optimizedPos || optimizedPos.count < 4) {
    optimized.dispose();
    return source;
  }

  optimized.computeVertexNormals();
  optimized.computeBoundingBox();
  optimized.computeBoundingSphere();

  source.dispose();
  return optimized;
}

/**
 * Build progressively simplified LOD geometries.
 * The first entry is always a clone of the original geometry.
 */
export function buildLodGeometries(
  geometry: BufferGeometry,
  options: MeshLodOptions = {},
): BufferGeometry[] {
  const levels = normalizeLevels(options.levels);
  const ratioStep = normalizeRatioStep(options.ratioStep);
  const minVertexCount = normalizeMinVertexCount(options.minVertexCount);

  const lods: BufferGeometry[] = [geometry.clone()];
  const baseCount = getGeometryVertexCount(lods[0]);

  if (baseCount < 4 || levels <= 1) {
    return lods;
  }

  let previousCount = baseCount;
  for (let level = 1; level < levels; level++) {
    const targetRatio = Math.pow(ratioStep, level);
    const targetVertexCount = Math.max(
      minVertexCount,
      Math.round(baseCount * targetRatio),
    );

    const lod = optimizeGeometry(geometry, {
      ...options,
      targetVertexCount,
      minVertexCount,
    });

    const lodCount = getGeometryVertexCount(lod);
    if (lodCount >= previousCount || lodCount < 4) {
      lod.dispose();
      break;
    }

    lods.push(lod);
    previousCount = lodCount;
  }

  return lods;
}

/** Read current position vertex count for a geometry. */
export function getGeometryVertexCount(geometry: BufferGeometry): number {
  const position = geometry.getAttribute('position');
  return position ? position.count : 0;
}

function resolveTargetCount(
  sourceCount: number,
  options: MeshOptimizationOptions,
  minVertexCount: number,
): number {
  if (
    typeof options.targetVertexCount === 'number'
    && Number.isFinite(options.targetVertexCount)
    && options.targetVertexCount > 0
  ) {
    return clampVertexCount(Math.round(options.targetVertexCount), minVertexCount, sourceCount);
  }

  if (
    typeof options.targetRatio === 'number'
    && Number.isFinite(options.targetRatio)
    && options.targetRatio > 0
  ) {
    const ratio = Math.max(0.01, Math.min(1, options.targetRatio));
    return clampVertexCount(Math.round(sourceCount * ratio), minVertexCount, sourceCount);
  }

  return sourceCount;
}

function clampVertexCount(count: number, minVertexCount: number, sourceCount: number): number {
  return Math.max(minVertexCount, Math.min(sourceCount, count));
}

function clusterGeometry(
  geometry: BufferGeometry,
  targetCount: number,
  aggressiveness: number,
): { clusterCount: number; vertexToCluster: Uint32Array } | null {
  const position = geometry.getAttribute('position');
  if (!position || position.itemSize < 3 || position.count === 0) {
    return null;
  }

  const bounds = computeBounds(position);
  const spanX = Math.max(EPSILON, bounds.maxX - bounds.minX);
  const spanY = Math.max(EPSILON, bounds.maxY - bounds.minY);
  const spanZ = Math.max(EPSILON, bounds.maxZ - bounds.minZ);

  const volume = spanX * spanY * spanZ;
  const safeTarget = Math.max(4, targetCount);
  const baseCellSize = Math.cbrt(volume / safeTarget);
  const maxSpan = Math.max(spanX, spanY, spanZ);
  const cellSize = Math.max(EPSILON, (Number.isFinite(baseCellSize) ? baseCellSize : maxSpan / Math.cbrt(safeTarget)) * aggressiveness);

  const vertexToCluster = new Uint32Array(position.count);
  const keyToCluster = new Map<string, number>();
  let clusterCount = 0;

  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const y = position.getY(i);
    const z = position.getZ(i);

    const qx = Math.floor((x - bounds.minX) / cellSize);
    const qy = Math.floor((y - bounds.minY) / cellSize);
    const qz = Math.floor((z - bounds.minZ) / cellSize);
    const key = `${qx}|${qy}|${qz}`;

    let clusterIndex = keyToCluster.get(key);
    if (clusterIndex === undefined) {
      clusterIndex = clusterCount;
      keyToCluster.set(key, clusterIndex);
      clusterCount++;
    }

    vertexToCluster[i] = clusterIndex;
  }

  return { clusterCount, vertexToCluster };
}

function rebuildGeometryFromClusters(
  source: BufferGeometry,
  clusterCount: number,
  vertexToCluster: Uint32Array,
): BufferGeometry {
  const position = source.getAttribute('position');
  const normal = source.getAttribute('normal');
  const uv = source.getAttribute('uv');

  const accumulators: ClusterAccumulator[] = Array.from({ length: clusterCount }, () => ({
    count: 0,
    px: 0,
    py: 0,
    pz: 0,
    nx: 0,
    ny: 0,
    nz: 0,
    uvx: 0,
    uvy: 0,
  }));

  for (let i = 0; i < position.count; i++) {
    const cluster = accumulators[vertexToCluster[i] as number];
    cluster.count++;
    cluster.px += position.getX(i);
    cluster.py += position.getY(i);
    cluster.pz += position.getZ(i);

    if (normal && normal.itemSize >= 3) {
      cluster.nx += normal.getX(i);
      cluster.ny += normal.getY(i);
      cluster.nz += normal.getZ(i);
    }

    if (uv && uv.itemSize >= 2) {
      cluster.uvx += uv.getX(i);
      cluster.uvy += uv.getY(i);
    }
  }

  const positions = new Float32Array(clusterCount * 3);
  const normals = normal && normal.itemSize >= 3 ? new Float32Array(clusterCount * 3) : null;
  const uvs = uv && uv.itemSize >= 2 ? new Float32Array(clusterCount * 2) : null;

  for (let i = 0; i < clusterCount; i++) {
    const cluster = accumulators[i];
    const invCount = cluster.count > 0 ? 1 / cluster.count : 0;

    positions[(i * 3)] = cluster.px * invCount;
    positions[(i * 3) + 1] = cluster.py * invCount;
    positions[(i * 3) + 2] = cluster.pz * invCount;

    if (normals) {
      normals[(i * 3)] = cluster.nx * invCount;
      normals[(i * 3) + 1] = cluster.ny * invCount;
      normals[(i * 3) + 2] = cluster.nz * invCount;
    }

    if (uvs) {
      uvs[(i * 2)] = cluster.uvx * invCount;
      uvs[(i * 2) + 1] = cluster.uvy * invCount;
    }
  }

  const sourceIndices = getTriangleIndices(source, position.count);
  const indices: number[] = [];
  for (let i = 0; i < sourceIndices.length; i += 3) {
    const a = vertexToCluster[sourceIndices[i] as number] as number;
    const b = vertexToCluster[sourceIndices[i + 1] as number] as number;
    const c = vertexToCluster[sourceIndices[i + 2] as number] as number;

    if (a === b || b === c || a === c) {
      continue;
    }

    indices.push(a, b, c);
  }

  if (indices.length < 3) {
    return source.clone();
  }

  const optimized = new BufferGeometry();
  optimized.setAttribute('position', new BufferAttribute(positions, 3));

  if (normals) {
    optimized.setAttribute('normal', new BufferAttribute(normals, 3));
  }

  if (uvs) {
    optimized.setAttribute('uv', new BufferAttribute(uvs, 2));
  }

  const indexArray = clusterCount > 65535
    ? Uint32Array.from(indices)
    : Uint16Array.from(indices);
  optimized.setIndex(new BufferAttribute(indexArray, 1));

  return optimized;
}

function computeBounds(position: BufferAttribute | InterleavedBufferAttribute): {
  minX: number;
  minY: number;
  minZ: number;
  maxX: number;
  maxY: number;
  maxZ: number;
} {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;

  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const y = position.getY(i);
    const z = position.getZ(i);

    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (z < minZ) minZ = z;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
    if (z > maxZ) maxZ = z;
  }

  return { minX, minY, minZ, maxX, maxY, maxZ };
}

function getTriangleIndices(geometry: BufferGeometry, vertexCount: number): Uint32Array {
  const index = geometry.getIndex();
  if (!index) {
    return Uint32Array.from({ length: vertexCount }, (_, i) => i);
  }

  const values = index.array;
  const out = new Uint32Array(index.count);
  for (let i = 0; i < index.count; i++) {
    out[i] = Number(values[i] ?? 0);
  }
  return out;
}

function normalizeMinVertexCount(value?: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return DEFAULT_MIN_VERTEX_COUNT;
  }
  return Math.max(4, Math.round(value));
}

function normalizeLevels(value?: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return DEFAULT_LEVELS;
  }
  return Math.max(1, Math.min(8, Math.round(value)));
}

function normalizeRatioStep(value?: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return DEFAULT_RATIO_STEP;
  }
  return Math.max(0.1, Math.min(0.95, value));
}

function normalizeAggressiveness(value?: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return DEFAULT_AGGRESSIVENESS;
  }
  return Math.max(0.1, Math.min(4, value));
}
