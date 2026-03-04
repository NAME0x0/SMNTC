import { describe, expect, it } from 'vitest';
import { BufferGeometry, Mesh, MeshBasicMaterial, Texture } from 'three';
import { SMNTCKernel } from './SMNTCKernel';

describe('SMNTCKernel source integration', () => {
  it('applies constructor source geometry to a mesh', async () => {
    const sourceGeometry = new BufferGeometry();
    const mesh = new Mesh(new BufferGeometry(), new MeshBasicMaterial());

    const kernel = new SMNTCKernel({
      source: {
        type: 'geometry',
        geometry: sourceGeometry,
      },
    });

    kernel.apply(mesh);
    await kernel.whenSourceReady();

    expect(mesh.geometry).toBe(sourceGeometry);
    expect(kernel.getSourceError()).toBeNull();

    kernel.dispose();
  });

  it('updates applied mesh geometry when source changes', async () => {
    const geometryA = new BufferGeometry();
    const geometryB = new BufferGeometry();
    const mesh = new Mesh(new BufferGeometry(), new MeshBasicMaterial());

    const kernel = new SMNTCKernel({
      source: {
        type: 'geometry',
        geometry: geometryA,
      },
    });

    kernel.apply(mesh);
    await kernel.whenSourceReady();
    expect(mesh.geometry).toBe(geometryA);

    kernel.setSource({
      type: 'geometry',
      geometry: geometryB,
    });
    await kernel.whenSourceReady();
    expect(mesh.geometry).toBe(geometryB);

    kernel.dispose();
  });

  it('allows source updates through configure()', async () => {
    const geometryA = new BufferGeometry();
    const geometryB = new BufferGeometry();
    const mesh = new Mesh(new BufferGeometry(), new MeshBasicMaterial());

    const kernel = new SMNTCKernel({
      source: {
        type: 'geometry',
        geometry: geometryA,
      },
    });

    kernel.apply(mesh);
    await kernel.whenSourceReady();
    expect(mesh.geometry).toBe(geometryA);

    kernel.configure({
      source: {
        type: 'geometry',
        geometry: geometryB,
      },
    });
    await kernel.whenSourceReady();
    expect(mesh.geometry).toBe(geometryB);

    kernel.dispose();
  });

  it('binds source mask texture to shader uniforms', async () => {
    const sourceGeometry = new BufferGeometry();
    const sourceMask = new Texture();
    const mesh = new Mesh(new BufferGeometry(), new MeshBasicMaterial());

    const kernel = new SMNTCKernel({
      source: {
        type: 'geometry',
        geometry: sourceGeometry,
        maskTexture: sourceMask,
      },
    });

    kernel.apply(mesh);
    await kernel.whenSourceReady();

    const uniforms = kernel.getUniforms();
    expect(uniforms.uMask.value).toBe(sourceMask);
    expect(uniforms.uMaskEnabled.value).toBe(1);
    expect(uniforms.uMaskInvert.value).toBe(0);

    kernel.dispose();
  });

  it('supports source mask inversion flag', async () => {
    const sourceGeometry = new BufferGeometry();
    const sourceMask = new Texture();
    const mesh = new Mesh(new BufferGeometry(), new MeshBasicMaterial());

    const kernel = new SMNTCKernel({
      source: {
        type: 'geometry',
        geometry: sourceGeometry,
        maskTexture: sourceMask,
        maskInvert: true,
      },
    });

    kernel.apply(mesh);
    await kernel.whenSourceReady();

    const uniforms = kernel.getUniforms();
    expect(uniforms.uMaskEnabled.value).toBe(1);
    expect(uniforms.uMaskInvert.value).toBe(1);

    kernel.dispose();
  });

  it('clears mask uniforms when source without mask is configured', async () => {
    const geometryWithMask = new BufferGeometry();
    const geometryWithoutMask = new BufferGeometry();
    const sourceMask = new Texture();
    const mesh = new Mesh(new BufferGeometry(), new MeshBasicMaterial());

    const kernel = new SMNTCKernel({
      source: {
        type: 'geometry',
        geometry: geometryWithMask,
        maskTexture: sourceMask,
      },
    });

    kernel.apply(mesh);
    await kernel.whenSourceReady();
    expect(kernel.getUniforms().uMaskEnabled.value).toBe(1);

    kernel.setSource({
      type: 'geometry',
      geometry: geometryWithoutMask,
    });
    await kernel.whenSourceReady();

    const uniforms = kernel.getUniforms();
    expect(uniforms.uMask.value).toBeNull();
    expect(uniforms.uMaskEnabled.value).toBe(0);
    expect(uniforms.uMaskInvert.value).toBe(0);

    kernel.dispose();
  });

  it('maps pattern config to uniforms on construction', () => {
    const kernel = new SMNTCKernel({
      pattern: {
        type: 'dots',
        scale: 10,
        weight: 0.3,
        opacity: 0.75,
        blend: 'screen',
        animate: true,
        rotation: 180,
      },
    });

    const uniforms = kernel.getUniforms();
    expect(uniforms.uPatternType.value).toBe(3);
    expect(uniforms.uPatternScale.value).toBe(10);
    expect(uniforms.uPatternWeight.value).toBe(0.3);
    expect(uniforms.uPatternAlpha.value).toBe(0.75);
    expect(uniforms.uPatternMode.value).toBe(3);
    expect(uniforms.uPatternAnimate.value).toBe(1);
    expect(uniforms.uPatternRotation.value).toBeCloseTo(Math.PI);

    kernel.dispose();
  });

  it('updates pattern uniforms through configure()', () => {
    const kernel = new SMNTCKernel();
    kernel.configure({
      pattern: {
        type: 'grid',
        opacity: 0.9,
        blend: 'multiply',
      },
    });

    const uniforms = kernel.getUniforms();
    expect(uniforms.uPatternType.value).toBe(1);
    expect(uniforms.uPatternAlpha.value).toBe(0.9);
    expect(uniforms.uPatternMode.value).toBe(2);

    kernel.dispose();
  });

  it('binds custom pattern texture uniforms on construction', () => {
    const patternMap = new Texture();
    const kernel = new SMNTCKernel({
      pattern: {
        type: 'custom',
        map: patternMap,
        repeat: [2, 3],
      },
    });

    const uniforms = kernel.getUniforms();
    expect(uniforms.uPatternType.value).toBe(8);
    expect(uniforms.uPatternMap.value).toBe(patternMap);
    expect(uniforms.uPatternMapEnabled.value).toBe(1);
    expect(uniforms.uPatternRepeat.value.x).toBe(2);
    expect(uniforms.uPatternRepeat.value.y).toBe(3);

    kernel.dispose();
  });

  it('updates and clears custom pattern texture uniforms through configure()', () => {
    const firstMap = new Texture();
    const secondMap = new Texture();
    const kernel = new SMNTCKernel({
      pattern: {
        type: 'custom',
        map: firstMap,
        repeat: 4,
      },
    });

    kernel.configure({
      pattern: {
        map: secondMap,
        repeat: [1.5, 0.5],
      },
    });

    let uniforms = kernel.getUniforms();
    expect(uniforms.uPatternMap.value).toBe(secondMap);
    expect(uniforms.uPatternMapEnabled.value).toBe(1);
    expect(uniforms.uPatternRepeat.value.x).toBe(1.5);
    expect(uniforms.uPatternRepeat.value.y).toBe(0.5);

    kernel.configure({
      pattern: {
        map: null,
      },
    });

    uniforms = kernel.getUniforms();
    expect(uniforms.uPatternMap.value).toBeNull();
    expect(uniforms.uPatternMapEnabled.value).toBe(0);

    kernel.dispose();
  });

  it('applies layer composition through configure()', () => {
    const kernel = new SMNTCKernel({
      surface: 'topographic',
      reactivity: 'static',
    });

    kernel.configure({
      layers: [{
        opacity: 0.8,
        animation: {
          surface: 'wave',
          reactivity: 'shockwave',
        },
      }],
    });

    const uniforms = kernel.getUniforms();
    expect(uniforms.uSurfaceMode.value).toBe(7);
    expect(uniforms.uReactivityMode.value).toBe(3);
    expect(kernel.getLayers()).toHaveLength(1);

    kernel.dispose();
  });
});
