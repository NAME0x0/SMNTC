// ============================================================================
// SMNTC v2.0 — Integration Tests (E6)
// Final validation across all v2 modules.
// ============================================================================

import { describe, expect, it } from 'vitest';
import {
  BufferGeometry,
  Float32BufferAttribute,
  Mesh,
  MeshBasicMaterial,
  Texture,
} from 'three';

// ---------------------------------------------------------------------------
// Semantic Core
// ---------------------------------------------------------------------------
import {
  resolveConstants,
  DEFAULTS,
  SURFACES,
  VIBES,
  REACTIVITIES,
  FIDELITIES,
  PALETTES,
  PATTERNS,
  PATTERN_BLENDS,
  LAYER_BLEND_MODES,
  listTokens,
} from '../index';
import type { SMNTCConfig, ShaderConstants } from '../index';

// ---------------------------------------------------------------------------
// Kernel
// ---------------------------------------------------------------------------
import { SMNTCKernel } from '../kernel/SMNTCKernel';

// ---------------------------------------------------------------------------
// Source Abstraction
// ---------------------------------------------------------------------------
import { createSource, GeometrySource } from '../source';
import type { AnySourceConfig } from '../source';

// ---------------------------------------------------------------------------
// Layer Compositor
// ---------------------------------------------------------------------------
import { composeLayerConstants } from '../layer/compositor';

// ---------------------------------------------------------------------------
// Mesh Utilities
// ---------------------------------------------------------------------------
import { optimizeGeometry, getGeometryVertexCount, buildLodGeometries } from '../mesh';

// ---------------------------------------------------------------------------
// Physics
// ---------------------------------------------------------------------------
import { Spring, SpringBank } from '../physics/spring';

// ---------------------------------------------------------------------------
// Export Targets
// ---------------------------------------------------------------------------
import { compileCssTarget } from '../export/css-target';
import type { CssTargetResult } from '../export/css-target';

// ---------------------------------------------------------------------------
// Industry Presets
// ---------------------------------------------------------------------------
import { INDUSTRY_PRESETS, getIndustryPreset } from '../semantic/industry-presets';

// ============================================================================
// 1. Semantic Token Resolution — Full Matrix
// ============================================================================

describe('Semantic token resolution — full matrix', () => {
  it('resolves defaults without errors', () => {
    const constants = resolveConstants({});
    expect(constants).toBeDefined();
    expect(constants.surfaceMode).toBe(0); // topographic
    expect(constants.frequency).toBeGreaterThan(0);
    expect(constants.wireframe).toBe(true);
  });

  it('resolves every surface token', () => {
    for (const surface of SURFACES) {
      const constants = resolveConstants({ surface });
      expect(constants.surfaceMode).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(constants.amplitude)).toBe(true);
    }
  });

  it('resolves every vibe token', () => {
    for (const vibe of VIBES) {
      const constants = resolveConstants({ vibe });
      expect(constants.frequency).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(constants.noiseSpeed)).toBe(true);
    }
  });

  it('resolves every reactivity token', () => {
    for (const reactivity of REACTIVITIES) {
      const constants = resolveConstants({ reactivity });
      expect(constants.reactivityMode).toBeGreaterThanOrEqual(0);
    }
  });

  it('resolves every fidelity token', () => {
    for (const fidelity of FIDELITIES) {
      const constants = resolveConstants({ fidelity });
      expect(constants.segments).toBeGreaterThan(0);
    }
  });

  it('resolves every palette producing valid RGB arrays', () => {
    for (const palette of PALETTES) {
      const constants = resolveConstants({ palette });
      expect(constants.primaryColor).toHaveLength(3);
      expect(constants.accentColor).toHaveLength(3);
      expect(constants.backgroundColor).toHaveLength(3);
      for (const ch of constants.primaryColor) {
        expect(ch).toBeGreaterThanOrEqual(0);
        expect(ch).toBeLessThanOrEqual(1);
      }
    }
  });

  it('resolves all surface×vibe combos without throwing', () => {
    for (const surface of SURFACES) {
      for (const vibe of VIBES) {
        expect(() => resolveConstants({ surface, vibe })).not.toThrow();
      }
    }
  });

  it('resolves post-processing VFX fields', () => {
    const constants = resolveConstants({
      glow: 0.8,
      chromatic: 0.3,
      grain: 0.1,
      vignette: 0.5,
      blur: 0.4,
      angle: 45,
    });

    expect(constants.glow).toBeCloseTo(0.8, 5);
    expect(constants.chromatic).toBeCloseTo(0.3, 5);
    expect(constants.grain).toBeCloseTo(0.1, 5);
    expect(constants.vignette).toBeCloseTo(0.5, 5);
    expect(constants.blur).toBeCloseTo(0.4, 5);
    expect(constants.angle).toBeCloseTo(45, 5);
  });
});

// ============================================================================
// 2. Source Factory Integration
// ============================================================================

describe('Source factory integration', () => {
  it('creates a GeometrySource from a geometry config', () => {
    const geom = new BufferGeometry();
    const source = createSource({ type: 'geometry', geometry: geom });
    expect(source).toBeInstanceOf(GeometrySource);
    expect(source.type).toBe('geometry');
    source.dispose();
    geom.dispose();
  });

  it('returns the same geometry passed as input', async () => {
    const geom = new BufferGeometry();
    geom.setAttribute('position', new Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0], 3));
    const source = createSource({ type: 'geometry', geometry: geom });
    const result = await source.getGeometry();
    expect(result).toBe(geom);
    source.dispose();
    geom.dispose();
  });

  it('passes mask texture through GeometrySource', async () => {
    const geom = new BufferGeometry();
    const mask = new Texture();
    const source = createSource({ type: 'geometry', geometry: geom, maskTexture: mask });
    const result = await (source as GeometrySource).getMask();
    expect(result).toBe(mask);
    source.dispose();
    geom.dispose();
  });

  it('throws for unknown source type', () => {
    expect(() => createSource({ type: 'unknown' } as unknown as AnySourceConfig)).toThrow(/Unknown source type/);
  });
});

// ============================================================================
// 3. Kernel ↔ Source ↔ Compositor Integration
// ============================================================================

describe('Kernel + Source + Compositor integration', () => {
  it('kernel applies geometry source and compositor produces valid constants', async () => {
    const geom = new BufferGeometry();
    geom.setAttribute('position', new Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0], 3));
    const mesh = new Mesh(new BufferGeometry(), new MeshBasicMaterial());

    const kernel = new SMNTCKernel({
      surface: 'fluid',
      vibe: 'drift',
      palette: 'ocean',
      source: { type: 'geometry', geometry: geom },
    });

    kernel.apply(mesh);
    await kernel.whenSourceReady();
    expect(mesh.geometry).toBe(geom);

    // Layer compositor should also work on the same config
    const layered = composeLayerConstants(
      { surface: 'fluid', vibe: 'drift', palette: 'ocean' },
      [{ opacity: 0.5, blend: 'add', animation: { palette: 'ember' } }],
    );
    expect(layered.primaryColor).toHaveLength(3);
    expect(Number.isFinite(layered.intensity)).toBe(true);

    kernel.dispose();
    geom.dispose();
  });

  it('kernel reconfigure with new source updates geometry', async () => {
    const geomA = new BufferGeometry();
    geomA.setAttribute('position', new Float32BufferAttribute([0, 0, 0], 3));
    const geomB = new BufferGeometry();
    geomB.setAttribute('position', new Float32BufferAttribute([1, 1, 1, 2, 2, 2], 3));

    const mesh = new Mesh(new BufferGeometry(), new MeshBasicMaterial());
    const kernel = new SMNTCKernel({
      source: { type: 'geometry', geometry: geomA },
    });

    kernel.apply(mesh);
    await kernel.whenSourceReady();
    expect(mesh.geometry).toBe(geomA);

    kernel.configure({
      source: { type: 'geometry', geometry: geomB },
      surface: 'crystalline',
      palette: 'gold',
    });
    await kernel.whenSourceReady();
    expect(mesh.geometry).toBe(geomB);

    kernel.dispose();
    geomA.dispose();
    geomB.dispose();
  });
});

// ============================================================================
// 4. Mesh Optimizer Integration
// ============================================================================

describe('Mesh optimizer integration', () => {
  it('optimizeGeometry round-trips with GeometrySource', async () => {
    const { SphereGeometry } = await import('three');
    const original = new SphereGeometry(1, 32, 24);
    const optimized = optimizeGeometry(original, { targetRatio: 0.5, minVertexCount: 12 });
    expect(getGeometryVertexCount(optimized)).toBeLessThan(getGeometryVertexCount(original));

    // Feed the optimized geometry back through a source → kernel pipeline
    const source = createSource({ type: 'geometry', geometry: optimized });
    const result = await source.getGeometry();
    expect(result).toBe(optimized);
    expect(result.getAttribute('position').count).toBeGreaterThan(0);

    source.dispose();
    original.dispose();
    optimized.dispose();
  });

  it('LOD chain produces monotonically decreasing vertex counts', async () => {
    const { SphereGeometry } = await import('three');
    const original = new SphereGeometry(1, 48, 32);
    const lods = buildLodGeometries(original, { levels: 4, ratioStep: 0.6, minVertexCount: 24 });

    expect(lods.length).toBeGreaterThan(1);
    for (let i = 1; i < lods.length; i++) {
      expect(getGeometryVertexCount(lods[i])).toBeLessThan(getGeometryVertexCount(lods[i - 1]));
    }

    original.dispose();
    for (const lod of lods) lod.dispose();
  });
});

// ============================================================================
// 5. CSS Target Export — End-to-End
// ============================================================================

describe('CSS target export — end-to-end', () => {
  it('compiles default config to valid CSS', () => {
    const result = compileCssTarget();
    assertValidCssResult(result);
    expect(result.cssText).toContain(`.${result.className}`);
    expect(result.cssText).toContain(`@keyframes ${result.keyframesName}`);
  });

  it('compiles every surface token without errors', () => {
    for (const surface of SURFACES) {
      const result = compileCssTarget({ surface });
      assertValidCssResult(result);
    }
  });

  it('compiles every palette token producing color variables', () => {
    for (const palette of PALETTES) {
      const result = compileCssTarget({ palette });
      expect(result.cssText).toContain('--smntc-primary');
      expect(result.cssText).toContain('--smntc-accent');
      expect(result.cssText).toContain('--smntc-background');
    }
  });

  it('generates SVG filter defs for filter-based surfaces', () => {
    const filterSurfaces: Array<SMNTCConfig['surface']> = ['fluid', 'organic', 'wave', 'plasma', 'terrain'];
    for (const surface of filterSurfaces) {
      const result = compileCssTarget({ surface });
      expect(result.svgDefs).toContain('<svg');
      expect(result.svgDefs).toContain('feTurbulence');
      expect(result.svgDefs).toContain('feDisplacementMap');
    }
  });

  it('does NOT generate SVG defs for non-filter surfaces', () => {
    const noFilterSurfaces: Array<SMNTCConfig['surface']> = ['topographic', 'crystalline', 'glitch'];
    for (const surface of noFilterSurfaces) {
      const result = compileCssTarget({ surface });
      expect(result.svgDefs).toBe('');
    }
  });

  it('applies pattern CSS for each pattern type', () => {
    const patternTypes = PATTERNS.filter((p) => p !== 'none' && p !== 'custom') as Array<Exclude<typeof PATTERNS[number], 'none' | 'custom'>>;
    for (const type of patternTypes) {
      const result = compileCssTarget({ pattern: { type, scale: 8, opacity: 0.3 } });
      expect(result.cssText).toContain('background-image');
    }
  });

  it('includes reduce-motion media query by default (freeze mode)', () => {
    const result = compileCssTarget();
    expect(result.cssText).toContain('@media (prefers-reduced-motion: reduce)');
    expect(result.cssText).toContain('animation: none');
  });

  it('includes fade reduce-motion mode when requested', () => {
    const result = compileCssTarget({}, { reduceMotion: 'fade' });
    expect(result.cssText).toContain('@media (prefers-reduced-motion: reduce)');
    expect(result.cssText).toContain('smntc-css-fade');
  });

  it('omits reduce-motion block when set to none', () => {
    const result = compileCssTarget({}, { reduceMotion: 'none' });
    expect(result.cssText).not.toContain('@media (prefers-reduced-motion: reduce)');
  });

  it('respects custom className and keyframesName', () => {
    const result = compileCssTarget({}, { className: 'my-surface', keyframesName: 'my-anim' });
    expect(result.className).toBe('my-surface');
    expect(result.keyframesName).toBe('my-anim');
    expect(result.cssText).toContain('.my-surface');
    expect(result.cssText).toContain('@keyframes my-anim');
  });

  it('includes chromatic text-shadow when chromatic > 0', () => {
    const result = compileCssTarget({ chromatic: 0.5 });
    expect(result.cssText).toContain('text-shadow');
    expect(result.cssText).not.toContain('text-shadow: none');
  });

  it('includes glow drop-shadow when glow > 0', () => {
    const result = compileCssTarget({ glow: 0.6 });
    expect(result.cssText).toContain('drop-shadow');
  });

  it('includes vignette box-shadow when vignette > 0', () => {
    const result = compileCssTarget({ vignette: 0.4 });
    expect(result.cssText).toContain('box-shadow');
    expect(result.cssText).not.toContain('box-shadow: none');
  });

  function assertValidCssResult(result: CssTargetResult): void {
    expect(typeof result.className).toBe('string');
    expect(result.className.length).toBeGreaterThan(0);
    expect(typeof result.keyframesName).toBe('string');
    expect(result.keyframesName.length).toBeGreaterThan(0);
    expect(typeof result.cssText).toBe('string');
    expect(result.cssText.length).toBeGreaterThan(100);
    expect(typeof result.svgDefs).toBe('string');
  }
});

// ============================================================================
// 6. Industry Presets Validation
// ============================================================================

describe('Industry presets validation', () => {
  const presetNames = Object.keys(INDUSTRY_PRESETS);

  it('provides at least 6 presets', () => {
    expect(presetNames.length).toBeGreaterThanOrEqual(6);
  });

  it('every preset resolves to valid ShaderConstants', () => {
    for (const name of presetNames) {
      const preset = INDUSTRY_PRESETS[name];
      expect(() => resolveConstants(preset)).not.toThrow();
      const constants = resolveConstants(preset);
      expect(constants.surfaceMode).toBeGreaterThanOrEqual(0);
      expect(constants.primaryColor).toHaveLength(3);
    }
  });

  it('every preset compiles to valid CSS', () => {
    for (const name of presetNames) {
      const preset = INDUSTRY_PRESETS[name];
      const result = compileCssTarget(preset);
      expect(result.cssText.length).toBeGreaterThan(100);
      expect(result.cssText).toContain('@keyframes');
    }
  });

  it('getIndustryPreset returns expected preset', () => {
    const saas = getIndustryPreset('saas-professional');
    expect(saas.surface).toBe('topographic');
    expect(saas.vibe).toBe('stable');
  });

  it('getIndustryPreset returns fallback for unknown name', () => {
    const fallback = getIndustryPreset('nonexistent' as any);
    expect(fallback).toBeDefined();
    expect(fallback.surface).toBeDefined();
  });
});

// ============================================================================
// 7. Layer Compositor — Multi-Layer Blending
// ============================================================================

describe('Layer compositor — multi-layer integration', () => {
  it('composes multiple layers into valid constants', () => {
    const result = composeLayerConstants(
      { surface: 'fluid', vibe: 'drift', palette: 'ocean', intensity: 1.0 },
      [
        { opacity: 0.5, blend: 'add', animation: { palette: 'ember', intensity: 1.5 } },
        { opacity: 0.3, blend: 'multiply', animation: { palette: 'neon', intensity: 0.8 } },
      ],
    );

    expect(result.primaryColor).toHaveLength(3);
    expect(Number.isFinite(result.intensity)).toBe(true);
    expect(result.surfaceMode).toBeGreaterThanOrEqual(0);
  });

  it('preserves base surface mode when layers have low opacity', () => {
    const base = resolveConstants({ surface: 'topographic' });
    const composed = composeLayerConstants(
      { surface: 'topographic' },
      [{ opacity: 0.1, blend: 'normal', animation: { surface: 'glitch' } }],
    );

    expect(composed.surfaceMode).toBe(base.surfaceMode);
  });

  it('correctly interpolates layer speed values', () => {
    const result = composeLayerConstants(
      { speed: 1.0 },
      [{ opacity: 1.0, blend: 'normal', animation: { speed: 3.0 } }],
    );

    expect(result.speed).toBeCloseTo(3.0, 1);
  });
});

// ============================================================================
// 8. Spring Physics — Cross-Module
// ============================================================================

describe('Spring physics — kernel integration', () => {
  it('SpringBank drives uniform-like property map', () => {
    const bank = new SpringBank();
    bank.ensure('intensity', 1.0);
    bank.ensure('speed', 1.0);
    bank.ensure('glow', 0);

    bank.setTarget('intensity', 2.0);
    bank.setTarget('glow', 0.8);

    // Settle over simulated ~2 seconds
    for (let i = 0; i < 120; i++) {
      bank.step(1 / 60);
    }

    expect(bank.getValue('intensity')).toBeCloseTo(2.0, 1);
    expect(bank.getValue('glow')).toBeCloseTo(0.8, 1);
    expect(bank.getValue('speed')).toBe(1.0); // unchanged target
  });

  it('settled flag reflects convergence', () => {
    const s = new Spring(0);
    s.setTarget(5);
    expect(s.settled).toBe(false);

    for (let i = 0; i < 300; i++) {
      s.step(1 / 60);
    }
    expect(s.settled).toBe(true);
    expect(s.value).toBe(5);
  });
});

// ============================================================================
// 9. Public API Barrel Export Validation
// ============================================================================

describe('Public API barrel export', () => {
  it('exports all expected token arrays', async () => {
    const api = await import('../index');
    expect(api.SURFACES).toBeDefined();
    expect(api.VIBES).toBeDefined();
    expect(api.REACTIVITIES).toBeDefined();
    expect(api.FIDELITIES).toBeDefined();
    expect(api.PALETTES).toBeDefined();
    expect(api.PATTERNS).toBeDefined();
    expect(api.PATTERN_BLENDS).toBeDefined();
    expect(api.LAYER_BLEND_MODES).toBeDefined();
  });

  it('exports core classes and functions', async () => {
    const api = await import('../index');
    expect(api.SMNTCKernel).toBeDefined();
    expect(api.SMNTCMaterial).toBeDefined();
    expect(api.resolveConstants).toBeDefined();
    expect(api.transform).toBeDefined();
    expect(api.DEFAULTS).toBeDefined();
    expect(api.listTokens).toBeDefined();
    expect(api.Spring).toBeDefined();
    expect(api.SpringBank).toBeDefined();
    expect(api.AutoScaler).toBeDefined();
    expect(api.InputProxy).toBeDefined();
  });

  it('exports source abstractions', async () => {
    const api = await import('../index');
    expect(api.createSource).toBeDefined();
    expect(api.GeometrySource).toBeDefined();
    expect(api.ImageSource).toBeDefined();
    expect(api.SVGSource).toBeDefined();
    expect(api.TextSource).toBeDefined();
  });

  it('exports mesh utilities', async () => {
    const api = await import('../index');
    expect(api.optimizeGeometry).toBeDefined();
    expect(api.getGeometryVertexCount).toBeDefined();
    expect(api.buildLodGeometries).toBeDefined();
    expect(api.buildContourGeometryFromImageData).toBeDefined();
    expect(api.extractContoursFromImageData).toBeDefined();
  });

  it('exports layer compositor', async () => {
    const api = await import('../index');
    expect(api.composeLayerConstants).toBeDefined();
  });

  it('exports CSS target', async () => {
    const api = await import('../index');
    expect(api.compileCssTarget).toBeDefined();
  });

  it('exports video and static helpers', async () => {
    const api = await import('../index');
    expect(api.exportCanvasVideo).toBeDefined();
    expect(api.exportCanvasPng).toBeDefined();
    expect(api.exportSvg).toBeDefined();
    expect(api.serializeSvg).toBeDefined();
  });

  it('exports shader defines for extension', async () => {
    const api = await import('../index');
    expect(api.UBER_VERTEX_SHADER).toBeDefined();
    expect(api.UBER_FRAGMENT_SHADER).toBeDefined();
    expect(api.createUniforms).toBeDefined();
    expect(api.patchUniforms).toBeDefined();
  });

  it('exports registry functions', async () => {
    const api = await import('../index');
    expect(api.defineSurface).toBeDefined();
    expect(api.defineVibe).toBeDefined();
    expect(api.defineReactivity).toBeDefined();
    expect(api.defineFidelity).toBeDefined();
    expect(api.definePalette).toBeDefined();
    expect(api.registerSurface).toBeDefined();
    expect(api.definePreset).toBeDefined();
    expect(api.applyPreset).toBeDefined();
    expect(api.getPreset).toBeDefined();
    expect(api.listPresets).toBeDefined();
  });
});

// ============================================================================
// 10. Cross-Module Config Roundtrip
// ============================================================================

describe('Cross-module config roundtrip', () => {
  it('resolves a complex v2 config through every layer', () => {
    const config: SMNTCConfig = {
      surface: 'plasma',
      vibe: 'cinematic',
      palette: 'aurora',
      reactivity: 'shockwave',
      fidelity: 'ultra',
      intensity: 1.5,
      speed: 0.7,
      glow: 0.9,
      chromatic: 0.2,
      grain: 0.05,
      vignette: 0.3,
      blur: 0.1,
      angle: 90,
      contourLines: 32,
      wireframe: false,
      pattern: {
        type: 'hexagon',
        scale: 4,
        opacity: 0.4,
        blend: 'add',
        animate: true,
        weight: 0.5,
        rotation: 30,
      },
    };

    // Semantic resolution
    const constants = resolveConstants(config);
    expect(constants.surfaceMode).toBeGreaterThanOrEqual(0);
    expect(constants.contourLines).toBe(32);
    expect(constants.wireframe).toBe(false);

    // CSS compilation
    const css = compileCssTarget(config);
    expect(css.cssText).toContain('@keyframes');
    expect(css.svgDefs).toContain('feTurbulence'); // plasma uses SVG filters

    // Layer composition on top
    const layered = composeLayerConstants(config, [
      { opacity: 0.7, blend: 'screen', animation: { surface: 'wave', palette: 'ember' } },
    ]);
    expect(layered.primaryColor).toHaveLength(3);
    expect(Number.isFinite(layered.speed)).toBe(true);
  });

  it('industry presets produce deterministic CSS output', () => {
    const resultA = compileCssTarget(INDUSTRY_PRESETS['luxury-elegant']);
    const resultB = compileCssTarget(INDUSTRY_PRESETS['luxury-elegant']);
    expect(resultA.cssText).toBe(resultB.cssText);
    expect(resultA.svgDefs).toBe(resultB.svgDefs);
  });
});
