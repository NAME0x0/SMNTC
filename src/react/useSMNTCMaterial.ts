// ============================================================================
// SMNTC — useSMNTCMaterial React Hook
// Creates and manages an SMNTCMaterial instance in R3F.
// ============================================================================

import { SMNTCMaterial } from '../material/SMNTCMaterial';
import type { SMNTCMaterialOptions } from '../material/SMNTCMaterial';
import type { Mesh } from 'three';

type RefObject<T> = { current: T | null };

export function useSMNTCMaterial(
  options: SMNTCMaterialOptions = {},
  meshRef?: RefObject<Mesh>,
): SMNTCMaterial {
  let React: any;
  let Fiber: any;
  try {
    React = require('react');
    Fiber = require('@react-three/fiber');
  } catch {
    throw new Error(
      '[SMNTC] useSMNTCMaterial requires react and @react-three/fiber. Install them as peer dependencies.',
    );
  }

  const { camera, gl } = Fiber.useThree();
  const materialRef: RefObject<SMNTCMaterial> = React.useRef(null);

  if (!materialRef.current) {
    materialRef.current = new SMNTCMaterial({
      ...options,
      camera,
      domElement: gl.domElement,
    });
  }

  React.useEffect(() => {
    if (meshRef?.current) {
      materialRef.current?.attachMesh(meshRef.current, camera, gl.domElement);
    }
  }, [meshRef?.current]);

  React.useEffect(() => {
    materialRef.current?.configure(options);
  }, [
    options.surface,
    options.vibe,
    options.reactivity,
    options.fidelity,
    options.palette,
    options.wireframe,
    options.intensity,
    options.speed,
    options.contourLines,
  ]);

  Fiber.useFrame((_state: any, delta: number) => {
    materialRef.current?.update(delta);
  });

  React.useEffect(() => {
    return () => {
      materialRef.current?.dispose();
      materialRef.current = null;
    };
  }, []);

  return materialRef.current;
}
