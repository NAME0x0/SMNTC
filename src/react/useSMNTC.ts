// ============================================================================
// SMNTC — useSMNTC React Hook
// Creates and manages an SMNTCKernel instance within a React lifecycle.
// ============================================================================

// NOTE: React types are declared inline to avoid hard dependency.
// Consumers must have React installed as a peer dependency.

import { SMNTCKernel } from '../kernel/SMNTCKernel';
import type { SMNTCKernelOptions } from '../kernel/SMNTCKernel';
import type { SMNTCConfig } from '../semantic/tokens';

// We import React types at the type level only
type RefObject<T> = { current: T | null };

/**
 * Creates and manages an SMNTCKernel instance.
 * Automatically disposes on unmount.
 *
 * Usage:
 * ```tsx
 * function MyScene() {
 *   const meshRef = useRef<THREE.Mesh>(null);
 *   const kernel = useSMNTC({ surface: 'fluid', vibe: 'calm' });
 *
 *   useEffect(() => {
 *     if (meshRef.current) kernel.apply(meshRef.current);
 *   }, []);
 *
 *   useFrame(() => kernel.update());
 *
 *   return <mesh ref={meshRef}><icosahedronGeometry args={[1, 64]} /></mesh>;
 * }
 * ```
 */
export function useSMNTC(options: SMNTCKernelOptions = {}): SMNTCKernel {
  // Dynamic import to avoid hard dependency on React
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  let React: any;
  try {
    React = require('react');
  } catch {
    throw new Error(
      '[SMNTC] useSMNTC requires React as a peer dependency. Install it with: npm install react',
    );
  }

  const kernelRef: RefObject<SMNTCKernel> = React.useRef<SMNTCKernel>(null);

  if (!kernelRef.current) {
    kernelRef.current = new SMNTCKernel(options);
  }

  // Dispose on unmount
  React.useEffect(() => {
    return () => {
      kernelRef.current?.dispose();
      kernelRef.current = null;
    };
  }, []);

  return kernelRef.current;
}

/**
 * Reactively update kernel config when props change.
 */
export function useSMNTCConfig(
  kernel: SMNTCKernel | null,
  config: Partial<SMNTCConfig>,
): void {
  let React: any;
  try {
    React = require('react');
  } catch {
    return;
  }

  React.useEffect(() => {
    if (kernel) {
      kernel.configure(config);
    }
  }, [
    kernel,
    config.surface,
    config.vibe,
    config.reactivity,
    config.fidelity,
    config.palette,
    config.wireframe,
    config.intensity,
    config.speed,
    config.contourLines,
  ]);
}
