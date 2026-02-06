// ============================================================================
// SMNTC — Semantic Transformer
// Middleware that converts SMNTCConfig → ShaderConstants and manages
// spring-interpolated transitions between semantic states.
// ============================================================================

import type { SMNTCConfig, ShaderConstants } from './tokens';
import { resolveConstants, DEFAULTS } from './dictionary';

export { resolveConstants, DEFAULTS };
export type { SMNTCConfig, ShaderConstants };

/**
 * Resolves a partial user config into fully-qualified shader constants.
 * This is the public entry point of the Semantic Transformer.
 */
export function transform(config: SMNTCConfig): ShaderConstants {
  return resolveConstants(config);
}
