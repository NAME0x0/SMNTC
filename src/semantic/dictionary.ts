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

// ---------------------------------------------------------------------------
// Surface → Shader Mode
// ---------------------------------------------------------------------------

const SURFACE_MAP: Record<Surface, { mode: number; noiseScale: number }> = {
  topographic: { mode: 0, noiseScale: 1.0 },
  crystalline: { mode: 1, noiseScale: 2.5 },
  fluid:       { mode: 2, noiseScale: 0.6 },
  glitch:      { mode: 3, noiseScale: 3.0 },
};

// ---------------------------------------------------------------------------
// Vibe → Frequency / Amplitude / Damping
// ---------------------------------------------------------------------------

interface VibeConstants {
  frequency: number;
  amplitude: number;
  damping: number;
  noiseSpeed: number;
}

const VIBE_MAP: Record<Vibe, VibeConstants> = {
  stable:   { frequency: 0.1,  amplitude: 0.02, damping: 0.95, noiseSpeed: 0.05 },
  calm:     { frequency: 0.5,  amplitude: 0.08, damping: 0.80, noiseSpeed: 0.15 },
  agitated: { frequency: 2.5,  amplitude: 0.20, damping: 0.40, noiseSpeed: 0.60 },
  chaotic:  { frequency: 5.0,  amplitude: 0.40, damping: 0.05, noiseSpeed: 1.50 },
};

// ---------------------------------------------------------------------------
// Reactivity → Mode / Strength / Radius
// ---------------------------------------------------------------------------

interface ReactivityConstants {
  mode: number;
  strength: number;
  radius: number;
}

const REACTIVITY_MAP: Record<Reactivity, ReactivityConstants> = {
  static:    { mode: 0, strength: 0.0,  radius: 0.0 },
  magnetic:  { mode: 1, strength: 0.5,  radius: 2.0 },
  repel:     { mode: 2, strength: 0.5,  radius: 2.0 },
  shockwave: { mode: 3, strength: 1.0,  radius: 4.0 },
};

// ---------------------------------------------------------------------------
// Fidelity → Segments / Wireframe Weight
// ---------------------------------------------------------------------------

interface FidelityConstants {
  segments: number;
  wireframeWidth: number;
}

const FIDELITY_MAP: Record<Fidelity, FidelityConstants> = {
  low:    { segments: 64,  wireframeWidth: 1.5 },
  medium: { segments: 128, wireframeWidth: 1.0 },
  high:   { segments: 256, wireframeWidth: 0.75 },
  ultra:  { segments: 512, wireframeWidth: 0.5 },
};

// ---------------------------------------------------------------------------
// Palette → RGB Triplets (normalized 0-1)
// ---------------------------------------------------------------------------

interface PaletteColors {
  primary: [number, number, number];
  accent: [number, number, number];
  background: [number, number, number];
}

function hexToRGB(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substring(0, 2), 16) / 255,
    parseInt(h.substring(2, 4), 16) / 255,
    parseInt(h.substring(4, 6), 16) / 255,
  ];
}

const PALETTE_MAP: Record<Palette, PaletteColors> = {
  monochrome: {
    primary:    hexToRGB('#e0e0e0'),
    accent:     hexToRGB('#ffffff'),
    background: hexToRGB('#000000'),
  },
  ember: {
    primary:    hexToRGB('#ff6b35'),
    accent:     hexToRGB('#ffaa00'),
    background: hexToRGB('#0a0a0a'),
  },
  arctic: {
    primary:    hexToRGB('#88ccff'),
    accent:     hexToRGB('#ffffff'),
    background: hexToRGB('#050510'),
  },
  neon: {
    primary:    hexToRGB('#00ff88'),
    accent:     hexToRGB('#ff00ff'),
    background: hexToRGB('#0a0a0a'),
  },
  phantom: {
    primary:    hexToRGB('#a0a0b0'),
    accent:     hexToRGB('#6060a0'),
    background: hexToRGB('#08080c'),
  },
};

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
}): ShaderConstants {
  const surface =    config.surface    ?? DEFAULTS.surface;
  const vibe =       config.vibe       ?? DEFAULTS.vibe;
  const reactivity = config.reactivity ?? DEFAULTS.reactivity;
  const fidelity =   config.fidelity   ?? DEFAULTS.fidelity;
  const palette =    config.palette    ?? DEFAULTS.palette;

  const s = SURFACE_MAP[surface];
  const v = VIBE_MAP[vibe];
  const r = REACTIVITY_MAP[reactivity];
  const f = FIDELITY_MAP[fidelity];
  const p = PALETTE_MAP[palette];

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
  };
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export { SURFACE_MAP, VIBE_MAP, REACTIVITY_MAP, FIDELITY_MAP, PALETTE_MAP };
