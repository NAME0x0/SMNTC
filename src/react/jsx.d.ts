import type { ReactThreeFiber } from '@react-three/fiber';
import type { SMNTCMaterial } from '../material/SMNTCMaterial';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      smntcMaterial: ReactThreeFiber.Object3DNode<SMNTCMaterial, typeof SMNTCMaterial>;
    }
  }
}

export {};
