import { afterEach, describe, expect, it, vi } from 'vitest';
import { compileCssTarget } from '../export/css-target';
import { exportCanvasVideo } from '../export/video-target';
import { exportCanvasPng, exportSvg } from '../export/static-target';

type OriginalGlobals = {
  mediaRecorder: typeof globalThis.MediaRecorder;
  videoEncoder: typeof globalThis.VideoEncoder;
  videoFrame: typeof globalThis.VideoFrame;
};

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

function installCanvasToBlob(canvas: HTMLCanvasElement): void {
  Object.defineProperty(canvas, 'toBlob', {
    configurable: true,
    writable: true,
    value: (callback: BlobCallback, type?: string) => {
      callback(new Blob(['png-smoke'], { type: type ?? 'image/png' }));
    },
  });
}

function createMediaRecorderMock() {
  const instances: Array<{ stopCalls: number; state: RecordingState }> = [];

  class MockMediaRecorder {
    static isTypeSupported = vi.fn(() => true);

    state: RecordingState = 'inactive';
    mimeType: string;
    ondataavailable: ((event: BlobEvent) => void) | null = null;
    onstop: (() => void) | null = null;
    onerror: ((event: Event) => void) | null = null;
    stopCalls = 0;

    constructor(_stream: MediaStream, options?: MediaRecorderOptions) {
      this.mimeType = options?.mimeType ?? 'video/webm';
      instances.push(this);
    }

    start(): void {
      this.state = 'recording';
    }

    stop(): void {
      this.stopCalls += 1;
      if (this.state === 'inactive') {
        return;
      }
      this.state = 'inactive';
      this.ondataavailable?.({
        data: new Blob(['video-smoke'], { type: this.mimeType }),
      } as BlobEvent);
      this.onstop?.();
    }
  }

  return { MockMediaRecorder, instances };
}

export function runBrowserExportSmokeSuite(environmentName: string): void {
  describe(`browser export smoke (${environmentName})`, () => {
    const original: OriginalGlobals = {
      mediaRecorder: globalThis.MediaRecorder,
      videoEncoder: globalThis.VideoEncoder,
      videoFrame: globalThis.VideoFrame,
    };

    afterEach(() => {
      restoreGlobal('MediaRecorder', original.mediaRecorder);
      restoreGlobal('VideoEncoder', original.videoEncoder);
      restoreGlobal('VideoFrame', original.videoFrame);
      document.head.innerHTML = '';
      document.body.innerHTML = '';
      vi.clearAllMocks();
    });

    it('compiles CSS target and mounts it into document without throwing', () => {
      const result = compileCssTarget({
        surface: 'fluid',
        vibe: 'calm',
        palette: 'arctic',
      });

      const style = document.createElement('style');
      style.textContent = result.cssText;
      document.head.appendChild(style);

      const node = document.createElement('div');
      node.className = result.className;
      node.textContent = 'SMNTC browser smoke';
      document.body.appendChild(node);

      expect(result.cssText).toContain('@keyframes');
      expect(style.textContent).toContain(result.keyframesName);
      expect(node.className).toBe(result.className);
      expect(document.querySelector(`.${result.className}`)).toBe(node);
    });

    it('exports PNG from a real document canvas element', async () => {
      const canvas = document.createElement('canvas');
      canvas.width = 32;
      canvas.height = 32;
      installCanvasToBlob(canvas);

      const blob = await exportCanvasPng(canvas);
      expect(blob.type).toBe('image/png');
      expect(blob.size).toBeGreaterThan(0);
    });

    it('exports SVG from a real SVGElement', async () => {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', '0');
      rect.setAttribute('y', '0');
      rect.setAttribute('width', '10');
      rect.setAttribute('height', '10');
      svg.appendChild(rect);

      const blob = exportSvg(svg, { width: 128, height: 64 });
      const text = await blob.text();

      expect(blob.type).toContain('image/svg+xml');
      expect(text).toContain('<svg');
      expect(text).toContain('width="128"');
      expect(text).toContain('height="64"');
    });

    it('exports video via MediaRecorder fallback from a document canvas', async () => {
      const { MockMediaRecorder, instances } = createMediaRecorderMock();
      setGlobal('MediaRecorder', MockMediaRecorder);
      setGlobal('VideoEncoder', undefined);
      setGlobal('VideoFrame', undefined);

      const trackStop = vi.fn();
      const stream = {
        getTracks: () => [{ stop: trackStop }],
      } as unknown as MediaStream;

      const canvas = document.createElement('canvas') as HTMLCanvasElement & {
        captureStream: (fps?: number) => MediaStream;
      };
      canvas.width = 48;
      canvas.height = 48;
      canvas.captureStream = vi.fn(() => stream);

      const result = await exportCanvasVideo(canvas, {
        preferWebCodecs: false,
        fps: 1000,
        durationMs: 1,
      });

      expect(result.method).toBe('mediarecorder');
      expect(result.blob.type).toContain('video/');
      expect(instances).toHaveLength(1);
      expect(trackStop).toHaveBeenCalledTimes(1);
    });
  });
}
