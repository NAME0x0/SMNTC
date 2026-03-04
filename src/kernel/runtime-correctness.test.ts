import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BufferGeometry, Mesh, MeshBasicMaterial } from 'three';

const inputProxyMock = vi.hoisted(() => {
  const instances: Array<{ dispose: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> }> = [];
  const ctor = vi.fn();

  class InputProxyMock {
    dispose = vi.fn();
    update = vi.fn();

    constructor(...args: unknown[]) {
      ctor(...args);
      instances.push(this);
    }
  }

  return { ctor, instances, InputProxyMock };
});

vi.mock('../reactivity/input-proxy', () => ({
  InputProxy: inputProxyMock.InputProxyMock,
}));

import { SMNTCKernel } from './SMNTCKernel';
import { UBER_VERTEX_SHADER } from './shaders/uber.vert';
import { SMNTCMaterial } from '../material/SMNTCMaterial';

describe('Runtime correctness regressions', () => {
  beforeEach(() => {
    inputProxyMock.instances.length = 0;
    inputProxyMock.ctor.mockClear();
  });

  it('starts the kernel clock when update() is called in manual mode', () => {
    const kernel = new SMNTCKernel();
    const clock = (kernel as any).clock;
    clock.stop();
    expect(clock.running).toBe(false);

    kernel.update();
    expect(clock.running).toBe(true);

    kernel.dispose();
  });

  it('disposes prior InputProxy when kernel.apply() is called again', () => {
    const kernel = new SMNTCKernel({ reactivity: 'magnetic' });
    const camera = {} as any;
    const domElement = {} as HTMLElement;
    const meshA = new Mesh(new BufferGeometry(), new MeshBasicMaterial());
    const meshB = new Mesh(new BufferGeometry(), new MeshBasicMaterial());

    kernel.apply(meshA, camera, domElement);
    expect(inputProxyMock.ctor).toHaveBeenCalledTimes(1);
    const firstProxy = inputProxyMock.instances[0];

    kernel.apply(meshB, camera, domElement);
    expect(firstProxy.dispose).toHaveBeenCalledTimes(1);
    expect(inputProxyMock.ctor).toHaveBeenCalledTimes(2);

    kernel.dispose();
  });

  it('disposes prior InputProxy when material.attachMesh() is called again', () => {
    const material = new SMNTCMaterial({ reactivity: 'magnetic' });
    const camera = {} as any;
    const domElement = {} as HTMLElement;
    const meshA = new Mesh(new BufferGeometry(), material);
    const meshB = new Mesh(new BufferGeometry(), material);

    material.attachMesh(meshA, camera, domElement);
    expect(inputProxyMock.ctor).toHaveBeenCalledTimes(1);
    const firstProxy = inputProxyMock.instances[0];

    material.attachMesh(meshB, camera, domElement);
    expect(firstProxy.dispose).toHaveBeenCalledTimes(1);
    expect(inputProxyMock.ctor).toHaveBeenCalledTimes(2);

    material.dispose();
  });

  it('uses world-space reactivity and safe shockwave falloff math in shader', () => {
    expect(UBER_VERTEX_SHADER).toContain('vec3 worldPos = (modelMatrix * vec4(pos, 1.0)).xyz;');
    expect(UBER_VERTEX_SHADER).toContain('disp += reactivityOffset(worldPos);');
    expect(UBER_VERTEX_SHADER).toContain('abs(dist - shockRadius)');
    expect(UBER_VERTEX_SHADER).not.toContain('smoothstep(shockRadius + 1.0, shockRadius, dist)');
  });
});
