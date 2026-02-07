// ============================================================================
// SMNTC — Semantic Transformer
// Re-exports the dictionary's resolveConstants as the public transform() API.
// Kept as a stable public interface — consumers import from here.
// ============================================================================

import type { SMNTCConfig, ShaderConstants } from './tokens';
import { resolveConstants, DEFAULTS } from './dictionary';

export { resolveConstants, DEFAULTS };
export type { SMNTCConfig, ShaderConstants };

/**
 * Resolves a partial user config into fully-qualified shader constants.
 * Alias for resolveConstants — maintained for public API stability.
 *
 * @deprecated Prefer importing `resolveConstants` directly.
 */
export const transform = resolveConstants;
