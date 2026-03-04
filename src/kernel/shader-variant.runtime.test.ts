import { describe, expect, it } from 'vitest';
import { Mesh, SphereGeometry } from 'three';
import { SMNTCMaterial } from '../material/SMNTCMaterial';
import { SMNTCKernel } from './SMNTCKernel';

type ShaderDefines = Record<string, number | undefined>;

function readDefines(defines: unknown): ShaderDefines {
  return (defines ?? {}) as ShaderDefines;
}

describe('Shader variant strategy', () => {
  it('kernel toggles lightweight/full shader defines based on expensive features', () => {
    const kernel = new SMNTCKernel({
      pattern: { type: 'none', opacity: 0 },
      grain: 0,
      glow: 0,
      chromatic: 0,
      vignette: 0,
      blur: 0,
    });

    let defines = readDefines(kernel.getMaterial().defines);
    expect(defines.SMNTC_ENABLE_PATTERN).toBe(0);
    expect(defines.SMNTC_ENABLE_POSTFX).toBe(0);

    kernel.configure({ glow: 0.4 });
    defines = readDefines(kernel.getMaterial().defines);
    expect(defines.SMNTC_ENABLE_POSTFX).toBe(1);

    kernel.configure({
      glow: 0,
      chromatic: 0,
      vignette: 0,
      blur: 0,
      grain: 0,
    });
    defines = readDefines(kernel.getMaterial().defines);
    expect(defines.SMNTC_ENABLE_POSTFX).toBe(0);

    kernel.configure({
      pattern: {
        type: 'grid',
        opacity: 0.6,
      },
    });
    defines = readDefines(kernel.getMaterial().defines);
    expect(defines.SMNTC_ENABLE_PATTERN).toBe(1);

    kernel.configure({
      pattern: {
        type: 'none',
        opacity: 0,
      },
    });
    defines = readDefines(kernel.getMaterial().defines);
    expect(defines.SMNTC_ENABLE_PATTERN).toBe(0);

    kernel.dispose();
  });

  it('material toggles lightweight/full shader defines based on expensive features', () => {
    const material = new SMNTCMaterial({
      pattern: { type: 'none', opacity: 0 },
      grain: 0,
      glow: 0,
      chromatic: 0,
      vignette: 0,
      blur: 0,
    });
    const mesh = new Mesh(new SphereGeometry(1, 24, 16), material);
    material.attachMesh(mesh);

    let defines = readDefines(material.defines);
    expect(defines.SMNTC_ENABLE_PATTERN).toBe(0);
    expect(defines.SMNTC_ENABLE_POSTFX).toBe(0);

    material.configure({ grain: 0.2 });
    defines = readDefines(material.defines);
    expect(defines.SMNTC_ENABLE_POSTFX).toBe(1);

    material.configure({
      grain: 0,
      glow: 0,
      chromatic: 0,
      vignette: 0,
      blur: 0,
    });
    defines = readDefines(material.defines);
    expect(defines.SMNTC_ENABLE_POSTFX).toBe(0);

    material.configure({
      pattern: {
        type: 'dots',
        opacity: 0.4,
      },
    });
    defines = readDefines(material.defines);
    expect(defines.SMNTC_ENABLE_PATTERN).toBe(1);

    material.configure({
      pattern: {
        type: 'none',
        opacity: 0,
      },
    });
    defines = readDefines(material.defines);
    expect(defines.SMNTC_ENABLE_PATTERN).toBe(0);

    material.dispose();
    mesh.geometry.dispose();
  });
});
