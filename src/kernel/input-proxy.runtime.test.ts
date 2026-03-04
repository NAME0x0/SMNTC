import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Vector3 } from 'three';
import type { Camera, Mesh, Raycaster } from 'three';
import type { SMNTCUniforms } from './uniforms';
import { InputProxy } from '../reactivity/input-proxy';

type ListenerMap = Map<string, (event: any) => void>;

function createDomElement() {
  const listeners: ListenerMap = new Map();
  const domElement = {
    addEventListener: vi.fn((type: string, handler: (event: any) => void) => {
      listeners.set(type, handler);
    }),
    removeEventListener: vi.fn((type: string) => {
      listeners.delete(type);
    }),
    getBoundingClientRect: vi.fn(() => ({
      left: 0,
      top: 0,
      width: 100,
      height: 100,
    })),
  } as unknown as HTMLElement;

  const emit = (type: string, event: any) => {
    listeners.get(type)?.(event);
  };

  return { domElement, emit };
}

function createUniforms(): SMNTCUniforms {
  return {
    uPointer: { value: new Vector3() },
    uShockTime: { value: 100 },
  } as unknown as SMNTCUniforms;
}

describe('InputProxy runtime correctness', () => {
  const globalWithWindow = globalThis as typeof globalThis & { window?: any };
  let originalWindow: any;

  beforeEach(() => {
    originalWindow = globalWithWindow.window;
    globalWithWindow.window = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
  });

  afterEach(() => {
    if (typeof originalWindow === 'undefined') {
      delete globalWithWindow.window;
    } else {
      globalWithWindow.window = originalWindow;
    }
  });

  it('uses update() timebase for shockwave elapsed time', () => {
    const { domElement, emit } = createDomElement();
    const uniforms = createUniforms();
    const point = new Vector3(1, 2, 3);
    const raycaster = {
      setFromCamera: vi.fn(),
      intersectObject: vi.fn((_mesh: Mesh, _recursive: boolean, target?: Array<{ point: Vector3 }>) => {
        const out = target ?? [];
        out.push({ point });
        return out;
      }),
    } as unknown as Raycaster;

    const proxy = new InputProxy({
      domElement,
      camera: {} as Camera,
      raycaster,
      mesh: {} as Mesh,
      uniforms,
      enableShockwave: true,
    });

    emit('pointerdown', {});
    proxy.update(5);
    expect(uniforms.uShockTime.value).toBe(0);

    proxy.update(6.25);
    expect(uniforms.uShockTime.value).toBeCloseTo(1.25, 6);

    proxy.dispose();
  });

  it('raycasts only when pointer is dirty and reuses the target array', () => {
    const { domElement, emit } = createDomElement();
    const uniforms = createUniforms();
    const point = new Vector3(4, 5, 6);
    const targets: unknown[] = [];
    const raycaster = {
      setFromCamera: vi.fn(),
      intersectObject: vi.fn((_mesh: Mesh, _recursive: boolean, target?: Array<{ point: Vector3 }>) => {
        const out = target ?? [];
        targets.push(out);
        out.push({ point });
        return out;
      }),
    } as unknown as Raycaster;

    const proxy = new InputProxy({
      domElement,
      camera: {} as Camera,
      raycaster,
      mesh: {} as Mesh,
      uniforms,
      enableShockwave: false,
    });

    proxy.update(1);
    proxy.update(2);
    expect(raycaster.intersectObject).toHaveBeenCalledTimes(1);

    emit('pointermove', { clientX: 80, clientY: 20 });
    proxy.update(3);
    expect(raycaster.intersectObject).toHaveBeenCalledTimes(2);
    expect(targets[0]).toBe(targets[1]);

    proxy.dispose();
  });

  it('in shockwave mode, raycasts only on click-position updates', () => {
    const { domElement, emit } = createDomElement();
    const uniforms = createUniforms();
    const point = new Vector3(7, 8, 9);
    const raycaster = {
      setFromCamera: vi.fn(),
      intersectObject: vi.fn((_mesh: Mesh, _recursive: boolean, target?: Array<{ point: Vector3 }>) => {
        const out = target ?? [];
        out.push({ point });
        return out;
      }),
    } as unknown as Raycaster;

    const proxy = new InputProxy({
      domElement,
      camera: {} as Camera,
      raycaster,
      mesh: {} as Mesh,
      uniforms,
      enableShockwave: true,
    });

    const subscribedEvents = (domElement.addEventListener as ReturnType<typeof vi.fn>).mock.calls
      .map(([type]) => type);
    expect(subscribedEvents).not.toContain('pointermove');
    expect(subscribedEvents).toContain('pointerdown');

    proxy.update(1);
    emit('pointermove', { clientX: 60, clientY: 40 });
    proxy.update(2);
    expect(raycaster.intersectObject).toHaveBeenCalledTimes(0);

    emit('pointerdown', { clientX: 50, clientY: 50 });
    proxy.update(3);
    expect(raycaster.intersectObject).toHaveBeenCalledTimes(1);

    proxy.dispose();
  });
});
