// ============================================================================
// SMNTC — Semantic Dictionary
// Maps human-readable tokens to deterministic mathematical constants.
// ============================================================================

import type {
  PatternBlendMode,
  PatternConfig,
  PatternType,
  Surface,
  Vibe,
  Reactivity,
  Fidelity,
  Palette,
  SMNTCConfig,
  ShaderConstants,
} from './tokens';
import {
  getSurfaceRegistry,
  getVibeRegistry,
  getReactivityRegistry,
  getFidelityRegistry,
  getPaletteRegistry,
  listTokens,
} from './registry';

// ---------------------------------------------------------------------------
// Public: Resolve full config → ShaderConstants
// ---------------------------------------------------------------------------

export const DEFAULTS = {
  surface: 'topographic' as Surface,
  vibe: 'calm' as Vibe,
  reactivity: 'static' as Reactivity,
  fidelity: 'medium' as Fidelity,
  palette: 'monochrome' as Palette,
  wireframe: true,
  intensity: 1.0,
  speed: 1.0,
  contourLines: 16,
  thermalGuard: true,
  angle: 0,
  grain: 0,
  glow: 0,
  chromatic: 0,
  vignette: 0,
  blur: 0,
  pattern: {
    type: 'none' as PatternType,
    scale: 8,
    weight: 0.2,
    opacity: 0.45,
    blend: 'normal' as PatternBlendMode,
    animate: false,
    rotation: 0,
    map: null,
    repeat: 1,
  } satisfies Required<PatternConfig>,
};

export function resolveConstants(config: Partial<SMNTCConfig> = {}): ShaderConstants {
  const surface =    config.surface    ?? DEFAULTS.surface;
  const vibe =       config.vibe       ?? DEFAULTS.vibe;
  const reactivity = config.reactivity ?? DEFAULTS.reactivity;
  const fidelity =   config.fidelity   ?? DEFAULTS.fidelity;
  const palette =    config.palette    ?? DEFAULTS.palette;
  const pattern: Required<PatternConfig> = {
    ...DEFAULTS.pattern,
    ...(config.pattern ?? {}),
  };
  const patternRepeat = patternRepeatToVector(pattern.repeat);

  const s = getSurfaceRegistry().get(surface);
  const v = getVibeRegistry().get(vibe);
  const r = getReactivityRegistry().get(reactivity);
  const f = getFidelityRegistry().get(fidelity);
  const p = getPaletteRegistry().get(palette);
  const available = listTokens();

  // Runtime token validation — fail fast on invalid tokens
  if (!s) throw new TypeError(`[SMNTC] Invalid surface token: "${surface}". Expected: ${available.surfaces.join(', ')}`);
  if (!v) throw new TypeError(`[SMNTC] Invalid vibe token: "${vibe}". Expected: ${available.vibes.join(', ')}`);
  if (!r) throw new TypeError(`[SMNTC] Invalid reactivity token: "${reactivity}". Expected: ${available.reactivities.join(', ')}`);
  if (!f) throw new TypeError(`[SMNTC] Invalid fidelity token: "${fidelity}". Expected: ${available.fidelities.join(', ')}`);
  if (!p) throw new TypeError(`[SMNTC] Invalid palette token: "${palette}". Expected: ${available.palettes.join(', ')}`);

  return {
    surfaceMode:        s.mode,
    frequency:          v.frequency,
    amplitude:          v.amplitude,
    damping:            v.damping,
    noiseScale:         s.noiseScale,
    noiseSpeed:         v.noiseSpeed,
    reactivityMode:     r.mode,
    reactivityStrength: r.strength,
    reactivityRadius:   r.radius,
    segments:           f.segments,
    wireframeWidth:     f.wireframeWidth,
    primaryColor:       p.primary,
    accentColor:        p.accent,
    backgroundColor:    p.background,
    wireframe:          config.wireframe    ?? DEFAULTS.wireframe,
    intensity:          clamp(config.intensity  ?? DEFAULTS.intensity, 0, 2),
    speed:              clamp(config.speed      ?? DEFAULTS.speed, 0, 5),
    contourLines:       clamp(config.contourLines ?? DEFAULTS.contourLines, 4, 64),
    angle:              clamp(config.angle      ?? DEFAULTS.angle, 0, 360),
    grain:              clamp(config.grain      ?? DEFAULTS.grain, 0, 1),
    glow:               clamp(config.glow       ?? DEFAULTS.glow, 0, 2),
    chromatic:          clamp(config.chromatic  ?? DEFAULTS.chromatic, 0, 1),
    vignette:           clamp(config.vignette   ?? DEFAULTS.vignette, 0, 1),
    blur:               clamp(config.blur       ?? DEFAULTS.blur, 0, 1),
    patternType:        patternTypeToMode(pattern.type),
    patternScale:       clamp(pattern.scale, 0.25, 64),
    patternWeight:      clamp(pattern.weight, 0.01, 1),
    patternAlpha:       clamp(pattern.opacity, 0, 1),
    patternMode:        patternBlendToMode(pattern.blend),
    patternAnimate:     pattern.animate ? 1 : 0,
    patternRotation:    clamp(pattern.rotation, 0, 360) * Math.PI / 180,
    patternRepeatX:     patternRepeat[0],
    patternRepeatY:     patternRepeat[1],
  };
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function patternTypeToMode(type: PatternType): number {
  switch (type) {
    case 'none': return 0;
    case 'grid': return 1;
    case 'hexagon': return 2;
    case 'dots': return 3;
    case 'voronoi': return 4;
    case 'waves': return 5;
    case 'concentric': return 6;
    case 'noise': return 7;
    case 'custom': return 8;
    default:
      return 0;
  }
}

function patternBlendToMode(mode: PatternBlendMode): number {
  switch (mode) {
    case 'normal': return 0;
    case 'add': return 1;
    case 'multiply': return 2;
    case 'screen': return 3;
    default:
      return 0;
  }
}

function patternRepeatToVector(
  repeat: number | [number, number],
): [number, number] {
  if (Array.isArray(repeat)) {
    return [
      clamp(repeat[0], 0.01, 64),
      clamp(repeat[1], 0.01, 64),
    ];
  }

  const v = clamp(repeat, 0.01, 64);
  return [v, v];
}

