// ============================================================================
// SMNTC — <SMNTCSurface /> React-Three-Fiber Component
// A declarative wrapper that renders a topographic mesh with semantic props.
// ============================================================================

import { SMNTCKernel } from '../kernel/SMNTCKernel';
import type { SMNTCConfig, Surface, Vibe, Reactivity, Palette, Fidelity } from '../semantic/tokens';
import { DEFAULTS, resolveConstants } from '../semantic/transformer';

// Module-scope dynamic imports — executed once at first import, not per render.
let React: any;
let Fiber: any;

try {
  React = require('react');
} catch {
  // Will throw at component call time if React is missing
}

try {
  Fiber = require('@react-three/fiber');
} catch {
  // Will throw at component call time if R3F is missing
}

/**
 * Props for the <SMNTCSurface /> component.
 */
export interface SMNTCSurfaceProps extends SMNTCConfig {
  /**
   * The type of base geometry to generate.
   * - `plane`: Flat plane (default). Good for backgrounds/hero sections.
   * - `sphere`: Icosahedron. Good for abstract "orbs."
   * - `torus`: Torus geometry. Good for abstract rings.
   */
  geometry?: 'plane' | 'sphere' | 'torus';

  /** Scale of the mesh. Default: [4, 4, 4]. */
  scale?: [number, number, number];

  /** Position of the mesh. Default: [0, 0, 0]. */
  position?: [number, number, number];

  /** Rotation of the mesh (Euler angles in radians). Default: [-Math.PI/2, 0, 0]. */
  rotation?: [number, number, number];
}

/**
 * <SMNTCSurface /> — Declarative topographic surface for React-Three-Fiber.
 *
 * Usage:
 * ```tsx
 * import { Canvas } from '@react-three/fiber';
 * import { SMNTCSurface } from 'smntc/react';
 *
 * function App() {
 *   return (
 *     <Canvas>
 *       <SMNTCSurface surface="fluid" vibe="calm" palette="arctic" />
 *     </Canvas>
 *   );
 * }
 * ```
 *
 * NOTE: This component requires @react-three/fiber and react as peer deps.
 * The implementation dynamically imports them to avoid hard bundling.
 */
export function SMNTCSurface(props: SMNTCSurfaceProps): any {
  if (!React) {
    throw new Error('[SMNTC] SMNTCSurface requires React. Install: npm install react');
  }
  if (!Fiber) {
    throw new Error(
      '[SMNTC] SMNTCSurface requires @react-three/fiber. Install: npm install @react-three/fiber',
    );
  }

  const {
    geometry = 'plane',
    surface = DEFAULTS.surface,
    vibe = DEFAULTS.vibe,
    reactivity = DEFAULTS.reactivity,
    fidelity = DEFAULTS.fidelity,
    palette = DEFAULTS.palette,
    wireframe = DEFAULTS.wireframe,
    intensity = DEFAULTS.intensity,
    speed = DEFAULTS.speed,
    contourLines = DEFAULTS.contourLines,
    scale = [4, 4, 4],
    position = [0, 0, 0],
    rotation = [-Math.PI / 2, 0, 0],
  } = props;

  const meshRef = React.useRef(null);
  const kernelRef = React.useRef(null) as { current: SMNTCKernel | null };
  const { camera, gl } = Fiber.useThree();

  const segments = resolveConstants({ fidelity }).segments;

  // Initialize kernel
  React.useEffect(() => {
    const kernel = new SMNTCKernel({
      surface,
      vibe,
      reactivity,
      fidelity,
      palette,
      wireframe,
      intensity,
      speed,
      contourLines,
      camera,
      domElement: gl.domElement,
    });

    kernelRef.current = kernel;

    if (meshRef.current) {
      kernel.apply(meshRef.current, camera, gl.domElement);
    }

    return () => {
      kernel.dispose();
      kernelRef.current = null;
    };
  }, []); // Mount only

  // React to prop changes
  React.useEffect(() => {
    kernelRef.current?.configure({
      surface,
      vibe,
      reactivity,
      palette,
      wireframe,
      intensity,
      speed,
      contourLines,
    });
  }, [surface, vibe, reactivity, palette, wireframe, intensity, speed, contourLines]);

  // Animation loop
  Fiber.useFrame(() => {
    kernelRef.current?.update();
  });

  // Build geometry element
  let geometryElement: any;
  if (geometry === 'sphere') {
    geometryElement = React.createElement('icosahedronGeometry', {
      args: [1, Math.min(segments, 128)],
    });
  } else if (geometry === 'torus') {
    geometryElement = React.createElement('torusGeometry', {
      args: [1, 0.4, segments / 2, segments],
    });
  } else {
    geometryElement = React.createElement('planeGeometry', {
      args: [1, 1, segments, segments],
    });
  }

  return React.createElement(
    'mesh',
    {
      ref: meshRef,
      scale,
      position,
      rotation,
    },
    geometryElement,
  );
}
