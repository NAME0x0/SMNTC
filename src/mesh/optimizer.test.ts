import { describe, expect, it } from 'vitest';
import { SphereGeometry } from 'three';
import {
  buildLodGeometries,
  getGeometryVertexCount,
  optimizeGeometry,
} from './optimizer';

describe('mesh optimizer', () => {
  it('reduces vertex count when a lower target ratio is requested', () => {
    const source = new SphereGeometry(1, 48, 32);
    const sourceCount = getGeometryVertexCount(source);

    const optimized = optimizeGeometry(source, {
      targetRatio: 0.35,
      minVertexCount: 24,
    });

    const optimizedCount = getGeometryVertexCount(optimized);
    expect(optimizedCount).toBeGreaterThanOrEqual(24);
    expect(optimizedCount).toBeLessThan(sourceCount);
    expect(optimized.getAttribute('normal').count).toBe(optimizedCount);
    expect(optimized.getAttribute('position').count).toBe(optimizedCount);

    source.dispose();
    optimized.dispose();
  });

  it('returns an unchanged clone when target is not lower than source', () => {
    const source = new SphereGeometry(1, 16, 12);
    const sourceCount = getGeometryVertexCount(source);

    const optimized = optimizeGeometry(source, {
      targetRatio: 1,
    });

    expect(optimized).not.toBe(source);
    expect(getGeometryVertexCount(optimized)).toBe(sourceCount);

    source.dispose();
    optimized.dispose();
  });

  it('builds monotonic LOD levels with decreasing vertex counts', () => {
    const source = new SphereGeometry(1, 40, 24);
    const lods = buildLodGeometries(source, {
      levels: 4,
      ratioStep: 0.65,
      minVertexCount: 32,
      aggressiveness: 1.1,
    });

    expect(lods.length).toBeGreaterThan(1);
    expect(getGeometryVertexCount(lods[0])).toBe(getGeometryVertexCount(source));

    for (let i = 1; i < lods.length; i++) {
      const current = getGeometryVertexCount(lods[i]);
      const previous = getGeometryVertexCount(lods[i - 1]);
      expect(current).toBeLessThan(previous);
      expect(current).toBeGreaterThanOrEqual(32);
    }

    source.dispose();
    for (const lod of lods) {
      lod.dispose();
    }
  });
});
