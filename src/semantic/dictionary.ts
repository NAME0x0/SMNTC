// ============================================================================
// SMNTC — Semantic Dictionary
// Maps human-readable tokens to deterministic mathematical constants.
// ============================================================================

import type {
  Surface,
  Vibe,
  Reactivity,
  Fidelity,
  Palette,
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
};

export function resolveConstants(config: {
  surface?: Surface;
  vibe?: Vibe;
  reactivity?: Reactivity;
  fidelity?: Fidelity;
  palette?: Palette;
  wireframe?: boolean;
  intensity?: number;
  speed?: number;
  contourLines?: number;
  angle?: number;
  grain?: number;
  glow?: number;
  chromatic?: number;
  vignette?: number;
  blur?: number;
}): ShaderConstants {
  const surface =    config.surface    ?? DEFAULTS.surface;
  const vibe =       config.vibe       ?? DEFAULTS.vibe;
  const reactivity = config.reactivity ?? DEFAULTS.reactivity;
  const fidelity =   config.fidelity   ?? DEFAULTS.fidelity;
  const palette =    config.palette    ?? DEFAULTS.palette;

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
  };
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

