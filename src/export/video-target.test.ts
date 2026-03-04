import { afterEach, describe, expect, it, vi } from 'vitest';
import { exportCanvasVideo } from './video-target';

const originalMediaRecorder = globalThis.MediaRecorder;
const originalVideoEncoder = globalThis.VideoEncoder;
const originalVideoFrame = globalThis.VideoFrame;

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

function createMediaRecorderMock() {
  const instances: Array<{
    stopCalls: number;
    state: RecordingState;
  }> = [];

  class MockMediaRecorder {
    static isTypeSupported = vi.fn(() => true);

    state: RecordingState = 'inactive';
    mimeType: string;
    ondataavailable: ((event: BlobEvent) => void) | null = null;
    onstop: (() => void) | null = null;
    onerror: ((event: Event) => void) | null = null;
    stopCalls = 0;

    constructor(
      readonly _stream: MediaStream,
      options?: MediaRecorderOptions,
    ) {
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
        data: new Blob(['chunk'], { type: this.mimeType }),
      } as BlobEvent);
      this.onstop?.();
    }
  }

  return {
    MockMediaRecorder,
    instances,
  };
}

function createCanvasWithCaptureStream(trackStop?: () => void): {
  canvas: HTMLCanvasElement;
  captureStream: ReturnType<typeof vi.fn>;
  stopSpy: ReturnType<typeof vi.fn>;
} {
  const stopSpy = vi.fn(trackStop);
  const stream = {
    getTracks: () => [{ stop: stopSpy }],
  } as unknown as MediaStream;

  const captureStream = vi.fn(() => stream);
  const canvas = {
    width: 320,
    height: 180,
    captureStream,
  } as unknown as HTMLCanvasElement;

  return { canvas, captureStream, stopSpy };
}

describe('exportCanvasVideo', () => {
  afterEach(() => {
    restoreGlobal('MediaRecorder', originalMediaRecorder);
    restoreGlobal('VideoEncoder', originalVideoEncoder);
    restoreGlobal('VideoFrame', originalVideoFrame);
    vi.clearAllMocks();
  });

  it('falls back to MediaRecorder when WebCodecs is preferred but muxer is missing', async () => {
    const { MockMediaRecorder } = createMediaRecorderMock();
    setGlobal('MediaRecorder', MockMediaRecorder);

    let videoEncoderCtorCalls = 0;
    class MockVideoEncoder {
      static isConfigSupported = vi.fn(async () => ({ supported: true }));
      state: CodecState = 'unconfigured';

      constructor(_init: VideoEncoderInit) {
        videoEncoderCtorCalls += 1;
      }

      configure(_config: VideoEncoderConfig): void {
        this.state = 'configured';
      }

      encode(_frame: VideoFrame): void {
        // no-op
      }

      async flush(): Promise<void> {
        // no-op
      }

      close(): void {
        this.state = 'closed';
      }
    }

    class MockVideoFrame {
      constructor(
        _source: CanvasImageSource,
        _init: VideoFrameInit,
      ) {}

      close(): void {
        // no-op
      }
    }

    setGlobal('VideoEncoder', MockVideoEncoder);
    setGlobal('VideoFrame', MockVideoFrame);

    const { canvas } = createCanvasWithCaptureStream();
    const result = await exportCanvasVideo(canvas, {
      preferWebCodecs: true,
      fps: 1000,
      durationMs: 1,
    });

    expect(result.method).toBe('mediarecorder');
    expect(videoEncoderCtorCalls).toBe(0);
  });

  it('falls back to MediaRecorder when VideoEncoder config probe reports unsupported', async () => {
    const { MockMediaRecorder } = createMediaRecorderMock();
    setGlobal('MediaRecorder', MockMediaRecorder);

    class MockVideoEncoder {
      static isConfigSupported = vi.fn(async () => ({ supported: false }));
      state: CodecState = 'unconfigured';

      constructor(_init: VideoEncoderInit) {
        throw new Error('constructor should not run when config probe fails');
      }

      configure(_config: VideoEncoderConfig): void {
        // no-op
      }

      encode(_frame: VideoFrame): void {
        // no-op
      }

      async flush(): Promise<void> {
        // no-op
      }

      close(): void {
        // no-op
      }
    }

    class MockVideoFrame {
      constructor(
        _source: CanvasImageSource,
        _init: VideoFrameInit,
      ) {}

      close(): void {
        // no-op
      }
    }

    setGlobal('VideoEncoder', MockVideoEncoder);
    setGlobal('VideoFrame', MockVideoFrame);

    const muxer = {
      addChunk: vi.fn(),
      finalize: vi.fn(async () => new Blob(['muxed'], { type: 'video/mp4' })),
    };

    const { canvas } = createCanvasWithCaptureStream();
    const result = await exportCanvasVideo(canvas, {
      preferWebCodecs: true,
      fps: 1000,
      durationMs: 1,
      muxer,
    });

    expect(result.method).toBe('mediarecorder');
    expect(muxer.addChunk).not.toHaveBeenCalled();
    expect(muxer.finalize).not.toHaveBeenCalled();
  });

  it('closes VideoEncoder when renderFrame throws during WebCodecs export', async () => {
    setGlobal('MediaRecorder', undefined);

    const encoderState = {
      closeCalls: 0,
    };

    class MockVideoEncoder {
      static isConfigSupported = vi.fn(async () => ({ supported: true }));
      state: CodecState = 'unconfigured';

      constructor(_init: VideoEncoderInit) {
        // no-op
      }

      configure(_config: VideoEncoderConfig): void {
        this.state = 'configured';
      }

      encode(_frame: VideoFrame): void {
        // no-op
      }

      async flush(): Promise<void> {
        // no-op
      }

      close(): void {
        encoderState.closeCalls += 1;
        this.state = 'closed';
      }
    }

    class MockVideoFrame {
      constructor(
        _source: CanvasImageSource,
        _init: VideoFrameInit,
      ) {}

      close(): void {
        // no-op
      }
    }

    setGlobal('VideoEncoder', MockVideoEncoder);
    setGlobal('VideoFrame', MockVideoFrame);

    const canvas = {
      width: 320,
      height: 180,
    } as unknown as HTMLCanvasElement;

    const muxer = {
      addChunk: vi.fn(),
      finalize: vi.fn(async () => new Blob(['muxed'], { type: 'video/mp4' })),
    };

    await expect(
      exportCanvasVideo(canvas, {
        preferWebCodecs: true,
        fps: 1000,
        durationMs: 1,
        muxer,
        renderFrame: async () => {
          throw new Error('render failed');
        },
      }),
    ).rejects.toThrow('render failed');

    expect(encoderState.closeCalls).toBe(1);
  });

  it('stops recorder and tracks when export is aborted', async () => {
    const { MockMediaRecorder, instances } = createMediaRecorderMock();
    setGlobal('MediaRecorder', MockMediaRecorder);
    setGlobal('VideoEncoder', undefined);
    setGlobal('VideoFrame', undefined);

    const controller = new AbortController();
    const { canvas, stopSpy } = createCanvasWithCaptureStream();

    await expect(
      exportCanvasVideo(canvas, {
        preferWebCodecs: false,
        fps: 1000,
        durationMs: 3,
        signal: controller.signal,
        renderFrame: async (_timeMs, frameIndex) => {
          if (frameIndex === 0) {
            controller.abort();
          }
        },
      }),
    ).rejects.toThrow('[SMNTC] Video export aborted.');

    expect(instances).toHaveLength(1);
    expect(instances[0].stopCalls).toBeGreaterThan(0);
    expect(stopSpy).toHaveBeenCalledTimes(1);
  });
});
