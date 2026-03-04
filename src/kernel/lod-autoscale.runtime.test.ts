import { describe, expect, it } from 'vitest';
import { Mesh, MeshBasicMaterial, SphereGeometry } from 'three';
import type { Fidelity } from '../semantic/tokens';
import { getGeometryVertexCount } from '../mesh';
import { SMNTCMaterial } from '../material/SMNTCMaterial';
import { SMNTCKernel } from './SMNTCKernel';

describe('Runtime LOD auto-scaling behavior', () => {
  it('kernel fidelity transition swaps to lower-vertex geometry', () => {
    const geometry = new SphereGeometry(1, 64, 48);
    const mesh = new Mesh(geometry, new MeshBasicMaterial());
    const kernel = new SMNTCKernel({ fidelity: 'ultra' });

    kernel.apply(mesh);
    const ultraGeometry = mesh.geometry;
    const ultraCount = getGeometryVertexCount(ultraGeometry);

    kernel.configure({ fidelity: 'low' });

    const lowGeometry = mesh.geometry;
    const lowCount = getGeometryVertexCount(lowGeometry);

    expect(lowGeometry).not.toBe(ultraGeometry);
    expect(lowCount).toBeLessThan(ultraCount);

    kernel.dispose();
    geometry.dispose();
    (mesh.material as MeshBasicMaterial).dispose();
  });

  it('kernel auto-scaler callback path applies LOD geometry switching', () => {
    const geometry = new SphereGeometry(1, 64, 48);
    const mesh = new Mesh(geometry, new MeshBasicMaterial());
    const kernel = new SMNTCKernel({ fidelity: 'ultra' });

    kernel.apply(mesh);
    const ultraGeometry = mesh.geometry;
    const ultraCount = getGeometryVertexCount(ultraGeometry);

    const onFidelityChange = (kernel as any).autoScaler?.onFidelityChange as ((fidelity: Fidelity) => void) | null;
    expect(typeof onFidelityChange).toBe('function');
    onFidelityChange?.('low');

    const lowGeometry = mesh.geometry;
    const lowCount = getGeometryVertexCount(lowGeometry);

    expect(kernel.getConfig().fidelity).toBe('low');
    expect(lowGeometry).not.toBe(ultraGeometry);
    expect(lowCount).toBeLessThan(ultraCount);

    kernel.dispose();
    geometry.dispose();
    (mesh.material as MeshBasicMaterial).dispose();
  });

  it('material fidelity transition swaps attached mesh geometry to lower-vertex LOD', () => {
    const geometry = new SphereGeometry(1, 64, 48);
    const material = new SMNTCMaterial({ fidelity: 'ultra' });
    const mesh = new Mesh(geometry, material);

    material.attachMesh(mesh);
    const ultraGeometry = mesh.geometry;
    const ultraCount = getGeometryVertexCount(ultraGeometry);

    material.configure({ fidelity: 'low' });
    const lowGeometry = mesh.geometry;
    const lowCount = getGeometryVertexCount(lowGeometry);

    expect(lowGeometry).not.toBe(ultraGeometry);
    expect(lowCount).toBeLessThan(ultraCount);

    material.dispose();
    geometry.dispose();
  });
});
