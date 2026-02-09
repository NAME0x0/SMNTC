// ============================================================================
// SMNTC — Token Registry (Extensibility)
// Central registry for runtime token definitions and presets.
// ============================================================================

import type {
  Surface,
  Vibe,
  Reactivity,
  Fidelity,
  Palette,
  SMNTCConfig,
} from './tokens';

// ---------------------------------------------------------------------------
// Base Token Definitions (built-in)
// ---------------------------------------------------------------------------

export interface SurfaceDefinition {
  mode: number;
  noiseScale: number;
}

export interface VibeDefinition {
  frequency: number;
  amplitude: number;
  damping: number;
  noiseSpeed: number;
}

export interface ReactivityDefinition {
  mode: number;
  strength: number;
  radius: number;
}

export interface FidelityDefinition {
  segments: number;
  wireframeWidth: number;
}

export interface PaletteDefinition {
  primary: [number, number, number];
  accent: [number, number, number];
  background: [number, number, number];
}

export const BASE_SURFACE_MAP: Record<Surface, SurfaceDefinition> = {
  topographic: { mode: 0, noiseScale: 1.0 },
  crystalline: { mode: 1, noiseScale: 2.5 },
  fluid:       { mode: 2, noiseScale: 0.6 },
  glitch:      { mode: 3, noiseScale: 3.0 },
  organic:     { mode: 4, noiseScale: 0.8 },
  terrain:     { mode: 5, noiseScale: 1.5 },
  plasma:      { mode: 6, noiseScale: 2.0 },
  wave:        { mode: 7, noiseScale: 0.5 },
};

export const BASE_VIBE_MAP: Record<Vibe, VibeDefinition> = {
  stable:    { frequency: 0.1,  amplitude: 0.02, damping: 0.95, noiseSpeed: 0.05 },
  calm:      { frequency: 0.5,  amplitude: 0.08, damping: 0.80, noiseSpeed: 0.15 },
  agitated:  { frequency: 2.5,  amplitude: 0.20, damping: 0.40, noiseSpeed: 0.60 },
  chaotic:   { frequency: 5.0,  amplitude: 0.40, damping: 0.05, noiseSpeed: 1.50 },
  breathing: { frequency: 0.08, amplitude: 0.05, damping: 0.98, noiseSpeed: 0.03 },
  pulse:     { frequency: 1.2,  amplitude: 0.15, damping: 0.60, noiseSpeed: 0.30 },
  drift:     { frequency: 0.3,  amplitude: 0.06, damping: 0.85, noiseSpeed: 0.10 },
  storm:     { frequency: 4.0,  amplitude: 0.35, damping: 0.10, noiseSpeed: 1.20 },
  cinematic: { frequency: 0.2,  amplitude: 0.12, damping: 0.90, noiseSpeed: 0.08 },
};

export const BASE_REACTIVITY_MAP: Record<Reactivity, ReactivityDefinition> = {
  static:    { mode: 0, strength: 0.0,  radius: 0.0 },
  magnetic:  { mode: 1, strength: 0.5,  radius: 2.0 },
  repel:     { mode: 2, strength: 0.5,  radius: 2.0 },
  shockwave: { mode: 3, strength: 1.0,  radius: 4.0 },
};

export const BASE_FIDELITY_MAP: Record<Fidelity, FidelityDefinition> = {
  low:    { segments: 64,  wireframeWidth: 1.5 },
  medium: { segments: 128, wireframeWidth: 1.0 },
  high:   { segments: 256, wireframeWidth: 0.75 },
  ultra:  { segments: 512, wireframeWidth: 0.5 },
};

// Palette values in normalized RGB [0..1].
export const BASE_PALETTE_MAP: Record<Palette, PaletteDefinition> = {
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
  ocean: {
    primary:    hexToRGB('#0077b6'),
    accent:     hexToRGB('#00b4d8'),
    background: hexToRGB('#03071e'),
  },
  sunset: {
    primary:    hexToRGB('#f77f00'),
    accent:     hexToRGB('#d62828'),
    background: hexToRGB('#0d0208'),
  },
  matrix: {
    primary:    hexToRGB('#00ff41'),
    accent:     hexToRGB('#008f11'),
    background: hexToRGB('#000000'),
  },
  vapor: {
    primary:    hexToRGB('#ff71ce'),
    accent:     hexToRGB('#01cdfe'),
    background: hexToRGB('#0a0012'),
  },
  gold: {
    primary:    hexToRGB('#ffd700'),
    accent:     hexToRGB('#daa520'),
    background: hexToRGB('#0a0800'),
  },
  infrared: {
    primary:    hexToRGB('#ff0055'),
    accent:     hexToRGB('#ff6600'),
    background: hexToRGB('#0a0005'),
  },
  aurora: {
    primary:    hexToRGB('#43b581'),
    accent:     hexToRGB('#7289da'),
    background: hexToRGB('#020810'),
  },
  midnight: {
    primary:    hexToRGB('#c0c0c8'),
    accent:     hexToRGB('#4a6fa5'),
    background: hexToRGB('#0a0e1a'),
  },
};

// ---------------------------------------------------------------------------
// Registry (mutable, runtime-extendable)
// ---------------------------------------------------------------------------

const surfaceRegistry = new Map<string, SurfaceDefinition>(Object.entries(BASE_SURFACE_MAP));
const vibeRegistry = new Map<string, VibeDefinition>(Object.entries(BASE_VIBE_MAP));
const reactivityRegistry = new Map<string, ReactivityDefinition>(Object.entries(BASE_REACTIVITY_MAP));
const fidelityRegistry = new Map<string, FidelityDefinition>(Object.entries(BASE_FIDELITY_MAP));
const paletteRegistry = new Map<string, PaletteDefinition>(Object.entries(BASE_PALETTE_MAP));

export interface TokenRegistrySnapshot {
  surfaces: string[];
  vibes: string[];
  reactivities: string[];
  fidelities: string[];
  palettes: string[];
}

export function listTokens(): TokenRegistrySnapshot {
  return {
    surfaces: Array.from(surfaceRegistry.keys()),
    vibes: Array.from(vibeRegistry.keys()),
    reactivities: Array.from(reactivityRegistry.keys()),
    fidelities: Array.from(fidelityRegistry.keys()),
    palettes: Array.from(paletteRegistry.keys()),
  };
}

export function registerSurface(name: string, def: SurfaceDefinition): void {
  surfaceRegistry.set(name, def);
}

export function registerVibe(name: string, def: VibeDefinition): void {
  vibeRegistry.set(name, def);
}

export function registerReactivity(name: string, def: ReactivityDefinition): void {
  reactivityRegistry.set(name, def);
}

export function registerFidelity(name: string, def: FidelityDefinition): void {
  fidelityRegistry.set(name, def);
}

export function registerPalette(name: string, def: PaletteDefinition): void {
  paletteRegistry.set(name, def);
}

export function defineSurface(name: string, def: SurfaceDefinition): Readonly<SurfaceDefinition & { name: string }> {
  registerSurface(name, def);
  return Object.freeze({ name, ...def });
}

export function defineVibe(name: string, def: VibeDefinition): Readonly<VibeDefinition & { name: string }> {
  registerVibe(name, def);
  return Object.freeze({ name, ...def });
}

export function defineReactivity(name: string, def: ReactivityDefinition): Readonly<ReactivityDefinition & { name: string }> {
  registerReactivity(name, def);
  return Object.freeze({ name, ...def });
}

export function defineFidelity(name: string, def: FidelityDefinition): Readonly<FidelityDefinition & { name: string }> {
  registerFidelity(name, def);
  return Object.freeze({ name, ...def });
}

export function definePalette(name: string, def: PaletteDefinition): Readonly<PaletteDefinition & { name: string }> {
  registerPalette(name, def);
  return Object.freeze({ name, ...def });
}

export function getSurfaceRegistry(): ReadonlyMap<string, SurfaceDefinition> {
  return surfaceRegistry;
}

export function getVibeRegistry(): ReadonlyMap<string, VibeDefinition> {
  return vibeRegistry;
}

export function getReactivityRegistry(): ReadonlyMap<string, ReactivityDefinition> {
  return reactivityRegistry;
}

export function getFidelityRegistry(): ReadonlyMap<string, FidelityDefinition> {
  return fidelityRegistry;
}

export function getPaletteRegistry(): ReadonlyMap<string, PaletteDefinition> {
  return paletteRegistry;
}

// ---------------------------------------------------------------------------
// Presets
// ---------------------------------------------------------------------------

export interface PresetDefinition {
  name: string;
  description?: string;
  defaults?: Partial<SMNTCConfig>;

  // Optional custom token definitions
  surfaces?: Record<string, SurfaceDefinition>;
  vibes?: Record<string, VibeDefinition>;
  reactivities?: Record<string, ReactivityDefinition>;
  fidelities?: Record<string, FidelityDefinition>;
  palettes?: Record<string, PaletteDefinition>;

  // Optional allow-lists to constrain usage
  allowedSurfaces?: string[];
  allowedVibes?: string[];
  allowedReactivities?: string[];
  allowedFidelities?: string[];
  allowedPalettes?: string[];
}

const presetRegistry = new Map<string, PresetDefinition>();

export function registerPreset(preset: PresetDefinition): void {
  presetRegistry.set(preset.name, preset);
}

export function getPreset(name: string): PresetDefinition | undefined {
  return presetRegistry.get(name);
}

export function listPresets(): string[] {
  return Array.from(presetRegistry.keys());
}

export function definePreset(preset: PresetDefinition): Readonly<PresetDefinition> {
  if (preset.surfaces) {
    for (const [name, def] of Object.entries(preset.surfaces)) {
      registerSurface(name, def);
    }
  }
  if (preset.vibes) {
    for (const [name, def] of Object.entries(preset.vibes)) {
      registerVibe(name, def);
    }
  }
  if (preset.reactivities) {
    for (const [name, def] of Object.entries(preset.reactivities)) {
      registerReactivity(name, def);
    }
  }
  if (preset.fidelities) {
    for (const [name, def] of Object.entries(preset.fidelities)) {
      registerFidelity(name, def);
    }
  }
  if (preset.palettes) {
    for (const [name, def] of Object.entries(preset.palettes)) {
      registerPalette(name, def);
    }
  }

  const frozen = Object.freeze({ ...preset });
  registerPreset(frozen);
  return frozen;
}

export function applyPreset(
  preset: PresetDefinition,
  config: Partial<SMNTCConfig>,
): Partial<SMNTCConfig> {
  const merged = { ...preset.defaults, ...config } as Partial<SMNTCConfig>;

  if (preset.allowedSurfaces && merged.surface && !preset.allowedSurfaces.includes(merged.surface)) {
    throw new TypeError(`[SMNTC] Preset "${preset.name}" does not allow surface: "${merged.surface}".`);
  }
  if (preset.allowedVibes && merged.vibe && !preset.allowedVibes.includes(merged.vibe)) {
    throw new TypeError(`[SMNTC] Preset "${preset.name}" does not allow vibe: "${merged.vibe}".`);
  }
  if (preset.allowedReactivities && merged.reactivity && !preset.allowedReactivities.includes(merged.reactivity)) {
    throw new TypeError(`[SMNTC] Preset "${preset.name}" does not allow reactivity: "${merged.reactivity}".`);
  }
  if (preset.allowedFidelities && merged.fidelity && !preset.allowedFidelities.includes(merged.fidelity)) {
    throw new TypeError(`[SMNTC] Preset "${preset.name}" does not allow fidelity: "${merged.fidelity}".`);
  }
  if (preset.allowedPalettes && merged.palette && !preset.allowedPalettes.includes(merged.palette)) {
    throw new TypeError(`[SMNTC] Preset "${preset.name}" does not allow palette: "${merged.palette}".`);
  }

  return merged;
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function hexToRGB(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substring(0, 2), 16) / 255,
    parseInt(h.substring(2, 4), 16) / 255,
    parseInt(h.substring(4, 6), 16) / 255,
  ];
}
