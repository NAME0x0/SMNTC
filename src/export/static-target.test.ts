import { afterEach, describe, expect, it } from 'vitest';
import { exportCanvasPng } from './static-target';

const originalOffscreenCanvas = globalThis.OffscreenCanvas;
const originalDocument = globalThis.document;
const originalHtmlCanvasElement = globalThis.HTMLCanvasElement;

function setGlobal(name: string, value: unknown): void {
  Object.defineProperty(globalThis, name, {
    configurable: true,
    writable: true,
    value,
  });
}

function restoreGlobal(name: string, value: unknown): void {
  if (typeof value === 'undefined') {
    delete (globalThis as Record<string, unknown>)[name];
    return;
  }

  setGlobal(name, value);
}

describe('exportCanvasPng runtime guards', () => {
  afterEach(() => {
    restoreGlobal('OffscreenCanvas', originalOffscreenCanvas);
    restoreGlobal('document', originalDocument);
    restoreGlobal('HTMLCanvasElement', originalHtmlCanvasElement);
  });

  it('throws a clear error when resize requires canvas creation but OffscreenCanvas and document are unavailable', async () => {
    setGlobal('OffscreenCanvas', undefined);
    setGlobal('document', undefined);

    const canvas = {
      width: 10,
      height: 10,
    } as unknown as HTMLCanvasElement;

    await expect(
      exportCanvasPng(canvas, { width: 20 }),
    ).rejects.toThrow(
      '[SMNTC] Cannot create canvas: OffscreenCanvas and document are unavailable in this environment.',
    );
  });

  it('uses capability checks for toBlob without relying on HTMLCanvasElement constructor', async () => {
    setGlobal('OffscreenCanvas', undefined);
    setGlobal('HTMLCanvasElement', undefined);

    const canvas = {
      width: 10,
      height: 10,
      toBlob: (callback: BlobCallback) => {
        callback(new Blob(['png-data'], { type: 'image/png' }));
      },
    } as unknown as HTMLCanvasElement;

    const blob = await exportCanvasPng(canvas);
    expect(blob.type).toBe('image/png');
    expect(blob.size).toBeGreaterThan(0);
  });
});
