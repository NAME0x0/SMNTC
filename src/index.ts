// ============================================================================
// SMNTC — Public API (Barrel Export)
// ============================================================================

// Core Kernel
export { SMNTCKernel } from './kernel/SMNTCKernel';
export type { SMNTCKernelOptions } from './kernel/SMNTCKernel';

// Semantic Types & Transformer
export type {
  Surface,
  Vibe,
  Reactivity,
  Fidelity,
  Palette,
  PatternType,
  PatternBlendMode,
  LayerBlendMode,
  PatternConfig,
  LayerConfig,
  SMNTCConfig,
  SMNTCConfigV2,
  ShaderConstants,
} from './semantic/tokens';

export {
  SURFACES,
  VIBES,
  REACTIVITIES,
  FIDELITIES,
  PALETTES,
  PATTERNS,
  PATTERN_BLENDS,
  LAYER_BLEND_MODES,
} from './semantic/tokens';

export {
  listTokens,
  defineSurface,
  defineVibe,
  defineReactivity,
  defineFidelity,
  definePalette,
  registerSurface,
  registerVibe,
  registerReactivity,
  registerFidelity,
  registerPalette,
  definePreset,
  applyPreset,
  getPreset,
  listPresets,
} from './semantic/registry';
export type {
  SurfaceDefinition,
  VibeDefinition,
  ReactivityDefinition,
  FidelityDefinition,
  PaletteDefinition,
  PresetDefinition,
  TokenRegistrySnapshot,
} from './semantic/registry';

export { transform, resolveConstants, DEFAULTS } from './semantic/transformer';

// Physics
export { Spring, SpringBank } from './physics/spring';
export type { SpringConfig } from './physics/spring';

// Shaders (for advanced users who want to extend)
export { UBER_VERTEX_SHADER } from './kernel/shaders/uber.vert';
export { UBER_FRAGMENT_SHADER } from './kernel/shaders/uber.frag';

// Uniforms (for advanced users)
export { createUniforms, patchUniforms } from './kernel/uniforms';
export type { SMNTCUniforms } from './kernel/uniforms';

// Input Proxy (for advanced custom setups)
export { InputProxy } from './reactivity/input-proxy';

// Auto-Scaler
export { AutoScaler } from './performance/auto-scaler';

// Material (advanced use / R3F extend)
export { SMNTCMaterial } from './material/SMNTCMaterial';
export type { SMNTCMaterialOptions } from './material/SMNTCMaterial';

// Source Abstraction
export * from './source';

// Mesh Utilities
export * from './mesh';

// Layer Composition
export * from './layer';

// Export Targets
export * from './export';
