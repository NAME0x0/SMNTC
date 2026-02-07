// ============================================================================
// SMNTC — React / React-Three-Fiber Integration
// Provides <SMNTCSurface /> component and useSMNTC() hook.
// ============================================================================
//
// NOTE: This module has peer dependencies on:
//   - react (>=18)
//   - @react-three/fiber (>=8)
//   - three (>=0.150)
//
// These are NOT bundled — consumers must install them.
// ============================================================================

export { SMNTCSurface } from './SMNTCSurface';
export { useSMNTC } from './useSMNTC';
export { useSMNTCMaterial } from './useSMNTCMaterial';
export { SMNTCMaterial } from '../material/SMNTCMaterial';

// Auto-register <smntcMaterial /> when R3F is available.
try {
	// eslint-disable-next-line @typescript-eslint/no-var-requires
	const Fiber = require('@react-three/fiber');
	if (Fiber?.extend) {
		// eslint-disable-next-line @typescript-eslint/no-var-requires
		const { SMNTCMaterial } = require('../material/SMNTCMaterial');
		Fiber.extend({ SMNTCMaterial });
	}
} catch {
	// React or R3F missing — ignore; the component will throw on use.
}
