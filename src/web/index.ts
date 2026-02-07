// ============================================================================
// SMNTC — Web Component Entry
// Defines <smntc-surface> custom element.
// ============================================================================

import { SMNTCSurfaceElement } from './SMNTCSurfaceElement';

export { SMNTCSurfaceElement } from './SMNTCSurfaceElement';

export function defineSMNTCSurface(tagName = 'smntc-surface'): void {
  if (customElements.get(tagName)) return;
  customElements.define(tagName, SMNTCSurfaceElement);
}

// Auto-define on import for convenience.
if (typeof window !== 'undefined' && typeof customElements !== 'undefined') {
  defineSMNTCSurface();
}
