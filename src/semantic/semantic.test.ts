import { describe, it, expect } from 'vitest';
import {
  resolveConstants,
  DEFAULTS,
  SURFACES,
  VIBES,
  REACTIVITIES,
  FIDELITIES,
  PALETTES,
  listTokens,
} from '../index';
import type { SMNTCConfig, ShaderConstants } from '../index';

// ============================================================================
// Token Enumeration Tests
// ============================================================================

describe('Token Enumerations', () => {
  it('SURFACES contains exactly the expected values', () => {
    expect(SURFACES).toEqual(['topographic', 'crystalline', 'fluid', 'glitch', 'organic', 'terrain', 'plasma', 'wave']);
  });

  it('VIBES contains exactly the expected values', () => {
    expect(VIBES).toEqual(['stable', 'calm', 'agitated', 'chaotic', 'breathing', 'pulse', 'drift', 'storm', 'cinematic']);
  });

  it('REACTIVITIES contains exactly the expected values', () => {
    expect(REACTIVITIES).toEqual(['static', 'magnetic', 'repel', 'shockwave']);
  });

  it('FIDELITIES contains exactly the expected values', () => {
    expect(FIDELITIES).toEqual(['low', 'medium', 'high', 'ultra']);
  });

  it('PALETTES contains exactly the expected values', () => {
    expect(PALETTES).toEqual(['monochrome', 'ember', 'arctic', 'neon', 'phantom', 'ocean', 'sunset', 'matrix', 'vapor', 'gold', 'infrared', 'aurora', 'midnight']);
  });

  it('all enumerations are frozen (readonly)', () => {
    // as const arrays in TS are readonly, but verify they can't be mutated at runtime
    expect(Object.isFrozen(SURFACES)).toBe(true);
  });

  it('listTokens returns registry values for all categories', () => {
    expect(listTokens()).toEqual({
      surfaces: [...SURFACES],
      vibes: [...VIBES],
      reactivities: [...REACTIVITIES],
      fidelities: [...FIDELITIES],
      palettes: [...PALETTES],
    });
  });
});

// ============================================================================
// Defaults
// ============================================================================

describe('DEFAULTS', () => {
  it('provides sensible defaults for all config fields', () => {
    expect(DEFAULTS.surface).toBe('topographic');
    expect(DEFAULTS.vibe).toBe('calm');
    expect(DEFAULTS.reactivity).toBe('static');
    expect(DEFAULTS.fidelity).toBe('medium');
    expect(DEFAULTS.palette).toBe('monochrome');
    expect(DEFAULTS.wireframe).toBe(true);
    expect(DEFAULTS.intensity).toBe(1.0);
    expect(DEFAULTS.speed).toBe(1.0);
    expect(DEFAULTS.contourLines).toBe(16);
    expect(DEFAULTS.thermalGuard).toBe(true);
    expect(DEFAULTS.angle).toBe(0);
    expect(DEFAULTS.grain).toBe(0);
    expect(DEFAULTS.glow).toBe(0);
    expect(DEFAULTS.chromatic).toBe(0);
    expect(DEFAULTS.vignette).toBe(0);
    expect(DEFAULTS.blur).toBe(0);
  });
});

// ============================================================================
// resolveConstants — Default Resolution
// ============================================================================

describe('resolveConstants', () => {
  it('resolves empty config to defaults', () => {
    const c = resolveConstants({});
    expect(c.surfaceMode).toBe(0); // topographic
    expect(c.frequency).toBe(0.5); // calm
    expect(c.amplitude).toBe(0.08);
    expect(c.reactivityMode).toBe(0); // static
    expect(c.segments).toBe(128); // medium
    expect(c.wireframe).toBe(true);
    expect(c.intensity).toBe(1.0);
    expect(c.speed).toBe(1.0);
    expect(c.contourLines).toBe(16);
  });

  // --------------------------------------------------------------------------
  // Surface Resolution
  // --------------------------------------------------------------------------

  describe('surface tokens', () => {
    it.each([
      ['topographic', 0, 1.0],
      ['crystalline', 1, 2.5],
      ['fluid', 2, 0.6],
      ['glitch', 3, 3.0],
      ['organic', 4, 0.8],
      ['terrain', 5, 1.5],
      ['plasma', 6, 2.0],
      ['wave', 7, 0.5],
    ] as const)('%s → mode %d, noiseScale %f', (surface, expectedMode, expectedNoise) => {
      const c = resolveConstants({ surface });
      expect(c.surfaceMode).toBe(expectedMode);
      expect(c.noiseScale).toBe(expectedNoise);
    });
  });

  // --------------------------------------------------------------------------
  // Vibe Resolution
  // --------------------------------------------------------------------------

  describe('vibe tokens', () => {
    it.each([
      ['stable', 0.1, 0.02, 0.95],
      ['calm', 0.5, 0.08, 0.80],
      ['agitated', 2.5, 0.20, 0.40],
      ['chaotic', 5.0, 0.40, 0.05],
      ['breathing', 0.08, 0.05, 0.98],
      ['pulse', 1.2, 0.15, 0.60],
      ['drift', 0.3, 0.06, 0.85],
      ['storm', 4.0, 0.35, 0.10],
      ['cinematic', 0.2, 0.12, 0.90],
    ] as const)('%s → freq %f, amp %f, damp %f', (vibe, freq, amp, damp) => {
      const c = resolveConstants({ vibe });
      expect(c.frequency).toBeCloseTo(freq);
      expect(c.amplitude).toBeCloseTo(amp);
      expect(c.damping).toBeCloseTo(damp);
    });
  });

  // --------------------------------------------------------------------------
  // Reactivity Resolution
  // --------------------------------------------------------------------------

  describe('reactivity tokens', () => {
    it('static has mode 0 and zero strength/radius', () => {
      const c = resolveConstants({ reactivity: 'static' });
      expect(c.reactivityMode).toBe(0);
      expect(c.reactivityStrength).toBe(0);
      expect(c.reactivityRadius).toBe(0);
    });

    it('shockwave has the highest strength and radius', () => {
      const c = resolveConstants({ reactivity: 'shockwave' });
      expect(c.reactivityMode).toBe(3);
      expect(c.reactivityStrength).toBe(1.0);
      expect(c.reactivityRadius).toBe(4.0);
    });
  });

  // --------------------------------------------------------------------------
  // Fidelity Resolution
  // --------------------------------------------------------------------------

  describe('fidelity tokens', () => {
    it.each([
      ['low', 64],
      ['medium', 128],
      ['high', 256],
      ['ultra', 512],
    ] as const)('%s → %d segments', (fidelity, segments) => {
      const c = resolveConstants({ fidelity });
      expect(c.segments).toBe(segments);
    });

    it('wireframeWidth decreases as fidelity increases', () => {
      const low = resolveConstants({ fidelity: 'low' });
      const ultra = resolveConstants({ fidelity: 'ultra' });
      expect(low.wireframeWidth).toBeGreaterThan(ultra.wireframeWidth);
    });
  });

  // --------------------------------------------------------------------------
  // Palette Resolution
  // --------------------------------------------------------------------------

  describe('palette tokens', () => {
    it('every palette returns 3-element RGB arrays', () => {
      for (const palette of PALETTES) {
        const c = resolveConstants({ palette });
        expect(c.primaryColor).toHaveLength(3);
        expect(c.accentColor).toHaveLength(3);
        expect(c.backgroundColor).toHaveLength(3);
      }
    });

    it('all color components are in [0, 1]', () => {
      for (const palette of PALETTES) {
        const c = resolveConstants({ palette });
        for (const channel of [...c.primaryColor, ...c.accentColor, ...c.backgroundColor]) {
          expect(channel).toBeGreaterThanOrEqual(0);
          expect(channel).toBeLessThanOrEqual(1);
        }
      }
    });

    it('monochrome background is black', () => {
      const c = resolveConstants({ palette: 'monochrome' });
      expect(c.backgroundColor).toEqual([0, 0, 0]);
    });
  });

  // --------------------------------------------------------------------------
  // Numeric Clamping
  // --------------------------------------------------------------------------

  describe('numeric clamping', () => {
    it('clamps intensity to [0, 2]', () => {
      expect(resolveConstants({ intensity: -1 }).intensity).toBe(0);
      expect(resolveConstants({ intensity: 10 }).intensity).toBe(2);
      expect(resolveConstants({ intensity: 1.5 }).intensity).toBe(1.5);
    });

    it('clamps speed to [0, 5]', () => {
      expect(resolveConstants({ speed: -1 }).speed).toBe(0);
      expect(resolveConstants({ speed: 100 }).speed).toBe(5);
      expect(resolveConstants({ speed: 3.0 }).speed).toBe(3.0);
    });

    it('clamps contourLines to [4, 64]', () => {
      expect(resolveConstants({ contourLines: 1 }).contourLines).toBe(4);
      expect(resolveConstants({ contourLines: 999 }).contourLines).toBe(64);
      expect(resolveConstants({ contourLines: 32 }).contourLines).toBe(32);
    });

    it('clamps angle to [0, 360]', () => {
      expect(resolveConstants({ angle: -10 }).angle).toBe(0);
      expect(resolveConstants({ angle: 500 }).angle).toBe(360);
      expect(resolveConstants({ angle: 180 }).angle).toBe(180);
    });

    it('clamps grain to [0, 1]', () => {
      expect(resolveConstants({ grain: -0.5 }).grain).toBe(0);
      expect(resolveConstants({ grain: 3 }).grain).toBe(1);
      expect(resolveConstants({ grain: 0.5 }).grain).toBe(0.5);
    });

    it('clamps glow to [0, 2]', () => {
      expect(resolveConstants({ glow: -1 }).glow).toBe(0);
      expect(resolveConstants({ glow: 5 }).glow).toBe(2);
      expect(resolveConstants({ glow: 1.0 }).glow).toBe(1.0);
    });

    it('clamps chromatic to [0, 1]', () => {
      expect(resolveConstants({ chromatic: -0.1 }).chromatic).toBe(0);
      expect(resolveConstants({ chromatic: 2 }).chromatic).toBe(1);
      expect(resolveConstants({ chromatic: 0.3 }).chromatic).toBe(0.3);
    });

    it('clamps vignette to [0, 1]', () => {
      expect(resolveConstants({ vignette: -1 }).vignette).toBe(0);
      expect(resolveConstants({ vignette: 5 }).vignette).toBe(1);
      expect(resolveConstants({ vignette: 0.7 }).vignette).toBe(0.7);
    });

    it('clamps blur to [0, 1]', () => {
      expect(resolveConstants({ blur: -1 }).blur).toBe(0);
      expect(resolveConstants({ blur: 10 }).blur).toBe(1);
      expect(resolveConstants({ blur: 0.4 }).blur).toBe(0.4);
    });
  });

  // --------------------------------------------------------------------------
  // Invalid Token Rejection
  // --------------------------------------------------------------------------

  describe('invalid token rejection', () => {
    it('throws TypeError on invalid surface', () => {
      expect(() => resolveConstants({ surface: 'water' as any })).toThrow(TypeError);
      expect(() => resolveConstants({ surface: 'water' as any })).toThrow('[SMNTC]');
    });

    it('throws TypeError on invalid vibe', () => {
      expect(() => resolveConstants({ vibe: 'angry' as any })).toThrow(TypeError);
    });

    it('throws TypeError on invalid reactivity', () => {
      expect(() => resolveConstants({ reactivity: 'explosive' as any })).toThrow(TypeError);
    });

    it('throws TypeError on invalid fidelity', () => {
      expect(() => resolveConstants({ fidelity: 'extreme' as any })).toThrow(TypeError);
    });

    it('throws TypeError on invalid palette', () => {
      expect(() => resolveConstants({ palette: 'rainbow' as any })).toThrow(TypeError);
    });
  });

  // --------------------------------------------------------------------------
  // Determinism
  // --------------------------------------------------------------------------

  describe('determinism', () => {
    it('same input always produces the same output', () => {
      const config: SMNTCConfig = {
        surface: 'fluid',
        vibe: 'agitated',
        reactivity: 'magnetic',
        fidelity: 'high',
        palette: 'neon',
        intensity: 1.5,
        speed: 2.0,
      };

      const a = resolveConstants(config);
      const b = resolveConstants(config);
      expect(a).toEqual(b);
    });

    it('every token combination resolves without error', () => {
      for (const surface of SURFACES) {
        for (const vibe of VIBES) {
          for (const palette of PALETTES) {
            expect(() => resolveConstants({ surface, vibe, palette })).not.toThrow();
          }
        }
      }
    });
  });
});
