import { ExtrudeGeometry, Path, Shape, Vector2 } from 'three';
import type { BufferGeometry } from 'three';

export interface RasterImageData {
  width: number;
  height: number;
  data: Uint8Array | Uint8ClampedArray;
}

export interface ContourMeshOptions {
  threshold?: number;
  simplify?: number;
  adaptiveDensity?: number;
  maxAdaptiveSubdivisions?: number;
  depth?: number;
  segments?: number;
  maxContours?: number;
}

interface SegmentPoint {
  x: number;
  y: number;
}

interface Segment {
  a: SegmentPoint;
  b: SegmentPoint;
}

interface LoopMeta {
  points: Vector2[];
  area: number;
  absArea: number;
  parent: number | null;
  depth: number;
  shape: Shape | null;
}

const DEFAULT_THRESHOLD = 0.2;
const DEFAULT_SIMPLIFY = 0.05;
const DEFAULT_ADAPTIVE_DENSITY = 0;
const DEFAULT_MAX_ADAPTIVE_SUBDIVISIONS = 6;
const DEFAULT_DEPTH = 0.08;
const DEFAULT_SEGMENTS = 8;
const POINT_KEY_PRECISION = 1000;
const POINT_EPSILON = 1e-3;
const SOBEL_MAX_MAGNITUDE = Math.SQRT2 * 4;

const CASE_SEGMENTS: Record<number, Array<[number, number]>> = {
  0: [],
  1: [[3, 0]],
  2: [[0, 1]],
  3: [[3, 1]],
  4: [[1, 2]],
  5: [], // handled specially
  6: [[0, 2]],
  7: [[3, 2]],
  8: [[2, 3]],
  9: [[0, 2]],
  10: [], // handled specially
  11: [[1, 2]],
  12: [[3, 1]],
  13: [[0, 1]],
  14: [[3, 0]],
  15: [],
};

export function extractContoursFromImageData(
  imageData: RasterImageData,
  options: Pick<
    ContourMeshOptions,
    'threshold' | 'simplify' | 'adaptiveDensity' | 'maxAdaptiveSubdivisions' | 'maxContours'
  > = {},
): Vector2[][] {
  validateImageData(imageData);

  const threshold = normalizeThreshold(options.threshold);
  const simplify = normalizeSimplify(options.simplify);
  const adaptiveDensity = normalizeAdaptiveDensity(options.adaptiveDensity);
  const maxAdaptiveSubdivisions = normalizeMaxAdaptiveSubdivisions(options.maxAdaptiveSubdivisions);

  const edgeField = computeEdgeField(imageData);
  const segments = marchingSquares(edgeField, imageData.width, imageData.height, threshold);
  const loops = stitchSegments(segments);

  const epsilon = simplify * 2;
  let contours = loops
    .map((loop) => simplifyLoop(loop, epsilon))
    .filter((loop) => loop.length >= 4);

  if (adaptiveDensity > 0) {
    contours = contours
      .map((loop) => applyAdaptiveVertexDensity(
        loop,
        edgeField,
        imageData.width,
        imageData.height,
        adaptiveDensity,
        maxAdaptiveSubdivisions,
      ))
      .filter((loop) => loop.length >= 4);
  }

  contours.sort((a, b) => Math.abs(signedArea(a)) - Math.abs(signedArea(b)));
  contours.reverse();

  const maxContours = options.maxContours;
  if (typeof maxContours === 'number' && Number.isFinite(maxContours) && maxContours > 0) {
    contours = contours.slice(0, Math.round(maxContours));
  }

  return contours;
}

export function buildContourGeometryFromImageData(
  imageData: RasterImageData,
  options: ContourMeshOptions = {},
): BufferGeometry {
  const contours = extractContoursFromImageData(imageData, {
    threshold: options.threshold,
    simplify: options.simplify,
    adaptiveDensity: options.adaptiveDensity,
    maxAdaptiveSubdivisions: options.maxAdaptiveSubdivisions,
    maxContours: options.maxContours,
  });

  if (contours.length === 0) {
    throw new TypeError('[SMNTC] No contours could be extracted from image data.');
  }

  const shapes = contoursToShapes(contours, imageData.height);
  if (shapes.length === 0) {
    throw new TypeError('[SMNTC] No valid shape geometry could be generated from contours.');
  }

  const curveSegments = normalizeSegments(options.segments);
  const depth = normalizeDepth(options.depth);
  const geometry = new ExtrudeGeometry(shapes, {
    depth,
    bevelEnabled: false,
    curveSegments,
    steps: Math.max(1, Math.round(curveSegments / 2)),
  });

  geometry.computeVertexNormals();
  centerAndNormalizeGeometry(geometry);
  return geometry;
}

function validateImageData(imageData: RasterImageData): void {
  const expectedLength = imageData.width * imageData.height * 4;
  if (!Number.isInteger(imageData.width) || imageData.width < 2) {
    throw new TypeError('[SMNTC] Image width must be an integer >= 2.');
  }
  if (!Number.isInteger(imageData.height) || imageData.height < 2) {
    throw new TypeError('[SMNTC] Image height must be an integer >= 2.');
  }
  if (imageData.data.length < expectedLength) {
    throw new TypeError('[SMNTC] Image data must be RGBA and match width * height * 4.');
  }
}

function computeEdgeField(imageData: RasterImageData): Float32Array {
  const { width, height, data } = imageData;
  const intensity = new Float32Array(width * height);

  for (let i = 0, px = 0; i < data.length; i += 4, px++) {
    const r = data[i] ?? 0;
    const g = data[i + 1] ?? 0;
    const b = data[i + 2] ?? 0;
    const a = data[i + 3] ?? 0;

    const alpha = a / 255;
    const luma = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    intensity[px] = alpha * (1 - luma);
  }

  const edge = new Float32Array(width * height);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i00 = intensity[(y - 1) * width + (x - 1)];
      const i10 = intensity[(y - 1) * width + x];
      const i20 = intensity[(y - 1) * width + (x + 1)];
      const i01 = intensity[y * width + (x - 1)];
      const i21 = intensity[y * width + (x + 1)];
      const i02 = intensity[(y + 1) * width + (x - 1)];
      const i12 = intensity[(y + 1) * width + x];
      const i22 = intensity[(y + 1) * width + (x + 1)];

      const gx = -i00 - (2 * i01) - i02 + i20 + (2 * i21) + i22;
      const gy = -i00 - (2 * i10) - i20 + i02 + (2 * i12) + i22;
      const magnitude = Math.sqrt(gx * gx + gy * gy) / SOBEL_MAX_MAGNITUDE;
      edge[y * width + x] = Math.max(0, Math.min(1, magnitude));
    }
  }

  return edge;
}

function marchingSquares(
  field: Float32Array,
  width: number,
  height: number,
  threshold: number,
): Segment[] {
  const segments: Segment[] = [];

  for (let y = 0; y < height - 1; y++) {
    for (let x = 0; x < width - 1; x++) {
      const v00 = field[y * width + x];
      const v10 = field[y * width + x + 1];
      const v11 = field[(y + 1) * width + x + 1];
      const v01 = field[(y + 1) * width + x];

      const c0 = v00 >= threshold ? 1 : 0;
      const c1 = v10 >= threshold ? 1 : 0;
      const c2 = v11 >= threshold ? 1 : 0;
      const c3 = v01 >= threshold ? 1 : 0;
      const caseIndex = c0 | (c1 << 1) | (c2 << 2) | (c3 << 3);

      if (caseIndex === 0 || caseIndex === 15) {
        continue;
      }

      const edgePoints = [
        interpolateEdgePoint(x, y, x + 1, y, v00, v10, threshold), // top
        interpolateEdgePoint(x + 1, y, x + 1, y + 1, v10, v11, threshold), // right
        interpolateEdgePoint(x, y + 1, x + 1, y + 1, v01, v11, threshold), // bottom
        interpolateEdgePoint(x, y, x, y + 1, v00, v01, threshold), // left
      ];

      let edgePairs = CASE_SEGMENTS[caseIndex];
      if (caseIndex === 5 || caseIndex === 10) {
        const center = (v00 + v10 + v11 + v01) * 0.25;
        if (caseIndex === 5) {
          edgePairs = center >= threshold
            ? [[3, 2], [0, 1]]
            : [[3, 0], [1, 2]];
        } else {
          edgePairs = center >= threshold
            ? [[3, 0], [1, 2]]
            : [[0, 1], [2, 3]];
        }
      }

      for (const [edgeA, edgeB] of edgePairs) {
        const a = edgePoints[edgeA];
        const b = edgePoints[edgeB];
        if (distance(a, b) > POINT_EPSILON) {
          segments.push({ a, b });
        }
      }
    }
  }

  return segments;
}

function interpolateEdgePoint(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  v1: number,
  v2: number,
  threshold: number,
): SegmentPoint {
  const delta = v2 - v1;
  const t = Math.abs(delta) < 1e-6 ? 0.5 : (threshold - v1) / delta;
  const clampedT = Math.max(0, Math.min(1, t));
  return {
    x: x1 + (x2 - x1) * clampedT,
    y: y1 + (y2 - y1) * clampedT,
  };
}

function stitchSegments(segments: Segment[]): Vector2[][] {
  const adjacency = new Map<string, string[]>();
  const points = new Map<string, Vector2>();

  const addNeighbor = (from: string, to: string): void => {
    const list = adjacency.get(from);
    if (!list) {
      adjacency.set(from, [to]);
      return;
    }
    if (!list.includes(to)) {
      list.push(to);
    }
  };

  for (const segment of segments) {
    const keyA = pointKey(segment.a);
    const keyB = pointKey(segment.b);
    if (keyA === keyB) continue;

    if (!points.has(keyA)) points.set(keyA, new Vector2(segment.a.x, segment.a.y));
    if (!points.has(keyB)) points.set(keyB, new Vector2(segment.b.x, segment.b.y));

    addNeighbor(keyA, keyB);
    addNeighbor(keyB, keyA);
  }

  const usedEdges = new Set<string>();
  const loops: Vector2[][] = [];

  const markEdge = (a: string, b: string): void => {
    usedEdges.add(edgeKey(a, b));
  };

  for (const [start, neighbors] of adjacency) {
    for (const neighbor of neighbors) {
      const initialEdge = edgeKey(start, neighbor);
      if (usedEdges.has(initialEdge)) continue;

      const keys = [start, neighbor];
      markEdge(start, neighbor);

      // Extend forward
      let prev = start;
      let current = neighbor;

      while (true) {
        const next = pickNextNeighbor(adjacency, usedEdges, current, prev);
        if (!next) break;

        markEdge(current, next);
        if (next === keys[0]) {
          keys.push(next);
          break;
        }

        keys.push(next);
        prev = current;
        current = next;

        if (keys.length > 100_000) break;
      }

      // Extend backward from start side for open traces
      prev = neighbor;
      current = start;

      while (true) {
        const next = pickNextNeighbor(adjacency, usedEdges, current, prev);
        if (!next) break;
        markEdge(current, next);
        keys.unshift(next);
        prev = current;
        current = next;
        if (keys.length > 100_000) break;
      }

      const line = keys
        .map((key) => points.get(key))
        .filter((pt): pt is Vector2 => Boolean(pt))
        .map((pt) => pt.clone());

      if (line.length < 3) continue;

      const first = line[0];
      const last = line[line.length - 1];
      if (!first || !last) continue;

      if (distance(first, last) <= POINT_EPSILON * 2) {
        line[line.length - 1] = first.clone();
      } else {
        continue; // Keep only closed contours for mesh generation.
      }

      loops.push(removeConsecutiveDuplicatePoints(line));
    }
  }

  return loops.filter((loop) => loop.length >= 4);
}

function pickNextNeighbor(
  adjacency: Map<string, string[]>,
  usedEdges: Set<string>,
  current: string,
  previous: string,
): string | null {
  const neighbors = adjacency.get(current);
  if (!neighbors) return null;

  for (const next of neighbors) {
    if (next === previous) continue;
    if (usedEdges.has(edgeKey(current, next))) continue;
    return next;
  }
  return null;
}

function simplifyLoop(loop: Vector2[], epsilon: number): Vector2[] {
  if (loop.length < 5 || epsilon <= 0) {
    return loop;
  }

  const open = loop.slice(0, -1);
  const simplified = rdp(open, epsilon);
  if (simplified.length < 3) {
    return loop;
  }

  const closed = simplified.map((pt) => pt.clone());
  closed.push(closed[0].clone());
  return removeConsecutiveDuplicatePoints(closed);
}

function applyAdaptiveVertexDensity(
  loop: Vector2[],
  edgeField: Float32Array,
  width: number,
  height: number,
  adaptiveDensity: number,
  maxAdaptiveSubdivisions: number,
): Vector2[] {
  if (loop.length < 4 || adaptiveDensity <= 0 || maxAdaptiveSubdivisions <= 0) {
    return loop;
  }

  const open = loop.slice(0, -1);
  if (open.length < 3) {
    return loop;
  }

  const complexity = open.map((_, index) => {
    return computePointComplexity(index, open, edgeField, width, height);
  });

  const adaptive: Vector2[] = [];

  for (let i = 0; i < open.length; i++) {
    const a = open[i];
    const b = open[(i + 1) % open.length];
    adaptive.push(a.clone());

    const midpointEnergy = sampleField(edgeField, width, height, (a.x + b.x) * 0.5, (a.y + b.y) * 0.5);
    const segmentComplexity = Math.max(
      midpointEnergy,
      (complexity[i] + complexity[(i + 1) % open.length]) * 0.5,
    );
    const extra = Math.round(segmentComplexity * adaptiveDensity * maxAdaptiveSubdivisions);

    for (let step = 1; step <= extra; step++) {
      const t = step / (extra + 1);
      adaptive.push(new Vector2(
        a.x + ((b.x - a.x) * t),
        a.y + ((b.y - a.y) * t),
      ));
    }
  }

  adaptive.push(adaptive[0].clone());
  return removeConsecutiveDuplicatePoints(adaptive);
}

function computePointComplexity(
  index: number,
  points: Vector2[],
  edgeField: Float32Array,
  width: number,
  height: number,
): number {
  const prev = points[(index - 1 + points.length) % points.length];
  const current = points[index];
  const next = points[(index + 1) % points.length];

  const turn = turningAngle(prev, current, next) / Math.PI;
  const edgeEnergy = sampleField(edgeField, width, height, current.x, current.y);
  return Math.max(0, Math.min(1, Math.max(turn, edgeEnergy)));
}

function turningAngle(a: Vector2, b: Vector2, c: Vector2): number {
  const abX = b.x - a.x;
  const abY = b.y - a.y;
  const bcX = c.x - b.x;
  const bcY = c.y - b.y;

  const abLen = Math.hypot(abX, abY);
  const bcLen = Math.hypot(bcX, bcY);
  if (abLen < 1e-6 || bcLen < 1e-6) {
    return 0;
  }

  const dot = ((abX / abLen) * (bcX / bcLen)) + ((abY / abLen) * (bcY / bcLen));
  const clamped = Math.max(-1, Math.min(1, dot));
  return Math.acos(clamped);
}

function sampleField(
  field: Float32Array,
  width: number,
  height: number,
  x: number,
  y: number,
): number {
  const sx = Math.max(0, Math.min(width - 1, x));
  const sy = Math.max(0, Math.min(height - 1, y));

  const x0 = Math.floor(sx);
  const y0 = Math.floor(sy);
  const x1 = Math.min(width - 1, x0 + 1);
  const y1 = Math.min(height - 1, y0 + 1);

  const tx = sx - x0;
  const ty = sy - y0;

  const i00 = field[(y0 * width) + x0] ?? 0;
  const i10 = field[(y0 * width) + x1] ?? 0;
  const i01 = field[(y1 * width) + x0] ?? 0;
  const i11 = field[(y1 * width) + x1] ?? 0;

  const top = i00 + ((i10 - i00) * tx);
  const bottom = i01 + ((i11 - i01) * tx);
  return top + ((bottom - top) * ty);
}

function rdp(points: Vector2[], epsilon: number): Vector2[] {
  if (points.length < 3) {
    return points.map((p) => p.clone());
  }

  let maxDistance = 0;
  let index = 0;
  const start = points[0];
  const end = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i++) {
    const distanceToLine = pointToSegmentDistance(points[i], start, end);
    if (distanceToLine > maxDistance) {
      maxDistance = distanceToLine;
      index = i;
    }
  }

  if (maxDistance > epsilon) {
    const left = rdp(points.slice(0, index + 1), epsilon);
    const right = rdp(points.slice(index), epsilon);
    return left.slice(0, -1).concat(right);
  }

  return [start.clone(), end.clone()];
}

function pointToSegmentDistance(point: Vector2, a: Vector2, b: Vector2): number {
  const abX = b.x - a.x;
  const abY = b.y - a.y;
  const apX = point.x - a.x;
  const apY = point.y - a.y;
  const denom = (abX * abX) + (abY * abY);

  if (denom <= 1e-8) {
    return Math.hypot(apX, apY);
  }

  const t = Math.max(0, Math.min(1, ((apX * abX) + (apY * abY)) / denom));
  const closestX = a.x + (abX * t);
  const closestY = a.y + (abY * t);
  return Math.hypot(point.x - closestX, point.y - closestY);
}

function contoursToShapes(contours: Vector2[][], sourceHeight: number): Shape[] {
  const loopMeta: LoopMeta[] = contours
    .map((contour) => normalizeContour(contour, sourceHeight))
    .filter((points) => points.length >= 4)
    .map((points) => {
      const area = signedArea(points);
      return {
        points,
        area,
        absArea: Math.abs(area),
        parent: null,
        depth: 0,
        shape: null,
      };
    });

  if (loopMeta.length === 0) {
    return [];
  }

  const order = loopMeta
    .map((_, index) => index)
    .sort((a, b) => loopMeta[b].absArea - loopMeta[a].absArea);

  for (const index of order) {
    const current = loopMeta[index];
    let bestParent: number | null = null;
    let bestParentArea = Infinity;
    const sample = current.points[0];

    for (const candidateIndex of order) {
      if (candidateIndex === index) continue;
      const candidate = loopMeta[candidateIndex];
      if (candidate.absArea <= current.absArea) continue;
      if (!pointInPolygon(sample, candidate.points)) continue;

      if (candidate.absArea < bestParentArea) {
        bestParent = candidateIndex;
        bestParentArea = candidate.absArea;
      }
    }

    current.parent = bestParent;
  }

  const depthFor = (index: number): number => {
    const meta = loopMeta[index];
    if (meta.parent === null) return 0;
    return depthFor(meta.parent) + 1;
  };

  for (const index of order) {
    loopMeta[index].depth = depthFor(index);
  }

  const shapes: Shape[] = [];

  for (const index of order) {
    const meta = loopMeta[index];
    if (meta.depth % 2 === 0) {
      const outer = ensureOrientation(meta.points, true);
      const shape = loopToShape(outer);
      meta.shape = shape;
      shapes.push(shape);
      continue;
    }

    const hole = ensureOrientation(meta.points, false);
    let parent = meta.parent;
    while (parent !== null && loopMeta[parent].depth % 2 !== 0) {
      parent = loopMeta[parent].parent;
    }

    if (parent !== null && loopMeta[parent].shape) {
      loopMeta[parent].shape!.holes.push(loopToPath(hole));
    }
  }

  return shapes;
}

function normalizeContour(contour: Vector2[], sourceHeight: number): Vector2[] {
  const normalized = contour.map((point) => new Vector2(point.x, sourceHeight - point.y));
  return removeConsecutiveDuplicatePoints(normalized);
}

function loopToShape(points: Vector2[]): Shape {
  const shape = new Shape();
  shape.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    shape.lineTo(points[i].x, points[i].y);
  }

  const first = points[0];
  const last = points[points.length - 1];
  if (distance(first, last) > POINT_EPSILON) {
    shape.lineTo(first.x, first.y);
  }

  return shape;
}

function loopToPath(points: Vector2[]): Path {
  const path = new Path();
  path.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    path.lineTo(points[i].x, points[i].y);
  }

  const first = points[0];
  const last = points[points.length - 1];
  if (distance(first, last) > POINT_EPSILON) {
    path.lineTo(first.x, first.y);
  }

  return path;
}

function ensureOrientation(points: Vector2[], clockwise: boolean): Vector2[] {
  const isClockWise = signedArea(points) < 0;
  if (isClockWise === clockwise) {
    return points;
  }

  const open = points.slice(0, -1).reverse();
  open.push(open[0].clone());
  return open;
}

function pointInPolygon(point: Vector2, polygon: Vector2[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;

    const intersects = ((yi > point.y) !== (yj > point.y))
      && (point.x < (((xj - xi) * (point.y - yi)) / ((yj - yi) || 1e-8)) + xi);

    if (intersects) inside = !inside;
  }
  return inside;
}

function removeConsecutiveDuplicatePoints(points: Vector2[]): Vector2[] {
  if (points.length === 0) return points;

  const unique: Vector2[] = [points[0].clone()];
  for (let i = 1; i < points.length; i++) {
    if (distance(points[i], unique[unique.length - 1]) > POINT_EPSILON) {
      unique.push(points[i].clone());
    }
  }

  if (unique.length >= 2 && distance(unique[0], unique[unique.length - 1]) > POINT_EPSILON) {
    unique.push(unique[0].clone());
  }

  return unique;
}

function centerAndNormalizeGeometry(geometry: BufferGeometry): void {
  geometry.computeBoundingBox();
  geometry.center();
  geometry.computeBoundingBox();

  const bounds = geometry.boundingBox;
  if (!bounds) return;

  const sizeX = bounds.max.x - bounds.min.x;
  const sizeY = bounds.max.y - bounds.min.y;
  const sizeZ = bounds.max.z - bounds.min.z;
  const maxDimension = Math.max(sizeX, sizeY, sizeZ);
  if (maxDimension > 0 && Number.isFinite(maxDimension)) {
    const scale = 1 / maxDimension;
    geometry.scale(scale, scale, scale);
  }
}

function signedArea(points: Vector2[]): number {
  let area = 0;
  for (let i = 0; i < points.length - 1; i++) {
    area += points[i].x * points[i + 1].y;
    area -= points[i + 1].x * points[i].y;
  }
  return area * 0.5;
}

function normalizeThreshold(value?: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return DEFAULT_THRESHOLD;
  }
  return Math.max(0.01, Math.min(0.99, value));
}

function normalizeSimplify(value?: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return DEFAULT_SIMPLIFY;
  }
  return Math.max(0, Math.min(1, value));
}

function normalizeAdaptiveDensity(value?: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return DEFAULT_ADAPTIVE_DENSITY;
  }
  return Math.max(0, Math.min(1, value));
}

function normalizeMaxAdaptiveSubdivisions(value?: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return DEFAULT_MAX_ADAPTIVE_SUBDIVISIONS;
  }
  return Math.max(0, Math.min(16, Math.round(value)));
}

function normalizeDepth(value?: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return DEFAULT_DEPTH;
  }
  return Math.max(0, value);
}

function normalizeSegments(value?: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return DEFAULT_SEGMENTS;
  }
  return Math.max(1, Math.min(64, Math.round(value)));
}

function pointKey(point: SegmentPoint): string {
  const x = Math.round(point.x * POINT_KEY_PRECISION);
  const y = Math.round(point.y * POINT_KEY_PRECISION);
  return `${x},${y}`;
}

function edgeKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function distance(a: SegmentPoint | Vector2, b: SegmentPoint | Vector2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
