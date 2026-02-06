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
  SMNTCConfig,
  ShaderConstants,
} from './semantic/tokens';

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
