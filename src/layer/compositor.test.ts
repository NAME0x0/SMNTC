import { describe, expect, it } from 'vitest';
import { resolveConstants } from '../semantic/dictionary';
import { composeLayerConstants } from './compositor';

describe('layer compositor', () => {
  it('returns base constants when no layers are provided', () => {
    const baseConfig = {
      surface: 'fluid' as const,
      vibe: 'calm' as const,
      palette: 'monochrome' as const,
      intensity: 0.9,
    };

    const expected = resolveConstants(baseConfig);
    const composed = composeLayerConstants(baseConfig, []);
    expect(composed).toEqual(expected);
  });

  it('interpolates scalar properties by layer opacity', () => {
    const composed = composeLayerConstants(
      {
        intensity: 0.5,
        speed: 1.0,
      },
      [{
        opacity: 0.6,
        blend: 'normal',
        animation: {
          intensity: 2.0,
          speed: 3.0,
        },
      }],
    );

    expect(composed.intensity).toBeCloseTo(1.4, 5);
    expect(composed.speed).toBeCloseTo(2.2, 5);
  });

  it('overrides discrete token modes when opacity is dominant', () => {
    const composed = composeLayerConstants(
      {
        surface: 'topographic',
        reactivity: 'static',
      },
      [{
        opacity: 0.8,
        animation: {
          surface: 'wave',
          reactivity: 'shockwave',
        },
      }],
    );

    expect(composed.surfaceMode).toBe(7);
    expect(composed.reactivityMode).toBe(3);
  });

  it('applies layer blend modes to colors', () => {
    const base = { palette: 'ocean' as const };
    const layer = {
      opacity: 0.75,
      animation: { palette: 'ember' as const },
    };

    const normal = composeLayerConstants(base, [{ ...layer, blend: 'normal' }]);
    const multiply = composeLayerConstants(base, [{ ...layer, blend: 'multiply' }]);
    const screen = composeLayerConstants(base, [{ ...layer, blend: 'screen' }]);
    const overlay = composeLayerConstants(base, [{ ...layer, blend: 'overlay' }]);

    expect(multiply.primaryColor[0]).toBeLessThan(normal.primaryColor[0]);
    expect(screen.primaryColor[0]).toBeGreaterThanOrEqual(normal.primaryColor[0]);
    expect(screen.primaryColor[0]).toBeGreaterThan(multiply.primaryColor[0]);
    expect(overlay.primaryColor[0]).not.toBeCloseTo(normal.primaryColor[0], 6);
  });
});
