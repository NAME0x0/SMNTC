export type VideoExportMethod = 'webcodecs' | 'mediarecorder';

export interface VideoMuxer {
  addChunk: (chunk: EncodedVideoChunk, meta?: EncodedVideoChunkMetadata) => void;
  finalize: (options: { width: number; height: number; durationMs: number; fps: number }) => Promise<Blob> | Blob;
}

export interface VideoExportOptions {
  fps?: number;
  durationMs?: number;
  bitrate?: number;
  codec?: string;
  mimeType?: string;
  preferWebCodecs?: boolean;
  keyFrameInterval?: number;
  renderFrame?: (timeMs: number, frameIndex: number) => void | Promise<void>;
  muxer?: VideoMuxer;
  signal?: AbortSignal;
}

export interface VideoExportResult {
  blob: Blob;
  mimeType: string;
  method: VideoExportMethod;
  durationMs: number;
  frames: number;
}

type ResolvedVideoExportOptions = VideoExportOptions & {
  fps: number;
  durationMs: number;
  frameCount: number;
};

type CaptureStreamCanvas = {
  captureStream: (fps?: number) => MediaStream;
};

type VideoEncoderWithSupportProbe = typeof VideoEncoder & {
  isConfigSupported?: (config: VideoEncoderConfig) => Promise<{ supported: boolean; config?: VideoEncoderConfig }>;
};

class WebCodecsSupportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WebCodecsSupportError';
  }
}

export async function exportCanvasVideo(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  options: VideoExportOptions = {},
): Promise<VideoExportResult> {
  const fps = options.fps ?? 30;
  const durationMs = options.durationMs ?? 6000;
  const frameCount = Math.max(1, Math.round((durationMs / 1000) * fps));
  const resolved: ResolvedVideoExportOptions = {
    ...options,
    fps,
    durationMs,
    frameCount,
  };

  if (options.preferWebCodecs !== false && isWebCodecsAvailable()) {
    try {
      return await exportWithWebCodecs(canvas, resolved);
    } catch (error) {
      if (error instanceof WebCodecsSupportError && canUseMediaRecorder(canvas)) {
        return exportWithMediaRecorder(canvas, resolved);
      }
      throw error;
    }
  }

  return exportWithMediaRecorder(canvas, resolved);
}

function isWebCodecsAvailable(): boolean {
  return typeof VideoEncoder !== 'undefined' && typeof VideoFrame !== 'undefined';
}

async function exportWithWebCodecs(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  options: ResolvedVideoExportOptions,
): Promise<VideoExportResult> {
  if (!options.muxer) {
    throw new WebCodecsSupportError(
      '[SMNTC] WebCodecs export requires a muxer implementation when using the WebCodecs path.',
    );
  }
  const muxer = options.muxer;

  const { width, height } = getCanvasDimensions(canvas);
  const config = createVideoEncoderConfig(canvas, options);
  const support = await probeVideoEncoderConfigSupport(config);
  if (!support.supported) {
    throw new WebCodecsSupportError(
      `[SMNTC] WebCodecs codec/config is not supported for ${width}x${height} at ${options.fps}fps.`,
    );
  }

  const encoderConfig = support.config ?? config;
  const frameDurationUs = Math.round(1_000_000 / options.fps);
  const keyFrameInterval = Math.max(1, options.keyFrameInterval ?? options.fps);

  let rejectError: Error | null = null;
  const encoder = new VideoEncoder({
    output: (chunk, meta) => {
      muxer.addChunk(chunk, meta);
    },
    error: (err) => {
      rejectError = err instanceof Error ? err : new Error(String(err));
    },
  });

  try {
    try {
      encoder.configure(encoderConfig);
    } catch (error) {
      throw new WebCodecsSupportError(
        `[SMNTC] Failed to configure VideoEncoder with requested codec/config: ${formatErrorMessage(error)}`,
      );
    }

    for (let i = 0; i < options.frameCount; i += 1) {
      throwIfAborted(options.signal);

      const timeMs = (i / options.fps) * 1000;
      if (options.renderFrame) {
        await options.renderFrame(timeMs, i);
      }

      const frame = new VideoFrame(canvas as CanvasImageSource, {
        timestamp: i * frameDurationUs,
      });
      try {
        encoder.encode(frame, { keyFrame: i % keyFrameInterval === 0 });
      } finally {
        frame.close();
      }
    }

    await encoder.flush();

    if (rejectError) {
      throw rejectError;
    }

    const blob = await muxer.finalize({
      width,
      height,
      durationMs: options.durationMs,
      fps: options.fps,
    });

    return {
      blob,
      mimeType: blob.type || 'video/mp4',
      method: 'webcodecs',
      durationMs: options.durationMs,
      frames: options.frameCount,
    };
  } finally {
    if (encoder.state !== 'closed') {
      try {
        encoder.close();
      } catch {
        // Best-effort close to avoid leaking encoder resources on abort/error paths.
      }
    }
  }
}

async function exportWithMediaRecorder(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  options: ResolvedVideoExportOptions,
): Promise<VideoExportResult> {
  if (!canUseMediaRecorder(canvas)) {
    throw new Error('[SMNTC] MediaRecorder export is not supported in this environment.');
  }

  const mimeType = options.mimeType ?? selectMediaRecorderMimeType();
  const stream = getCaptureStream(canvas)(options.fps);
  const chunks: BlobPart[] = [];
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  let started = false;

  recorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) {
      chunks.push(event.data);
    }
  };

  const stopPromise = new Promise<void>((resolve, reject) => {
    recorder.onstop = () => resolve();
    recorder.onerror = (event) => {
      const recorderError = (event as ErrorEvent).error;
      reject(
        recorderError instanceof Error
          ? recorderError
          : new Error('[SMNTC] MediaRecorder failed during video export.'),
      );
    };
  });

  const abortHandler = () => {
    requestRecorderStop(recorder);
  };
  options.signal?.addEventListener('abort', abortHandler);

  try {
    throwIfAborted(options.signal);
    recorder.start();
    started = true;

    const frameDurationMs = 1000 / options.fps;
    for (let i = 0; i < options.frameCount; i += 1) {
      throwIfAborted(options.signal);

      const timeMs = (i / options.fps) * 1000;
      if (options.renderFrame) {
        await options.renderFrame(timeMs, i);
      }

      await delay(frameDurationMs);
    }

    requestRecorderStop(recorder);
    await stopPromise;
    throwIfAborted(options.signal);

    const blob = new Blob(chunks, { type: recorder.mimeType || mimeType || 'video/webm' });

    return {
      blob,
      mimeType: blob.type,
      method: 'mediarecorder',
      durationMs: options.durationMs,
      frames: options.frameCount,
    };
  } catch (error) {
    if (started) {
      requestRecorderStop(recorder);
      await stopPromise.catch(() => undefined);
    }
    throw error;
  } finally {
    options.signal?.removeEventListener('abort', abortHandler);
    stopMediaTracks(stream);
  }
}

function selectMediaRecorderMimeType(): string | undefined {
  const candidates = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
    'video/mp4',
  ];

  if (typeof MediaRecorder === 'undefined') {
    return undefined;
  }

  if (typeof MediaRecorder.isTypeSupported !== 'function') {
    return undefined;
  }

  for (const candidate of candidates) {
    if (MediaRecorder.isTypeSupported(candidate)) {
      return candidate;
    }
  }

  return undefined;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function canUseMediaRecorder(canvas: HTMLCanvasElement | OffscreenCanvas): boolean {
  if (typeof MediaRecorder === 'undefined') {
    return false;
  }

  const captureStream = (canvas as Partial<CaptureStreamCanvas>).captureStream;
  return typeof captureStream === 'function';
}

function getCaptureStream(canvas: HTMLCanvasElement | OffscreenCanvas): (fps?: number) => MediaStream {
  const captureStream = (canvas as Partial<CaptureStreamCanvas>).captureStream;
  if (typeof captureStream !== 'function') {
    throw new Error('[SMNTC] MediaRecorder export requires canvas.captureStream().');
  }

  return captureStream;
}

function getCanvasDimensions(canvas: HTMLCanvasElement | OffscreenCanvas): { width: number; height: number } {
  const width = Number((canvas as { width?: unknown }).width);
  const height = Number((canvas as { height?: unknown }).height);

  if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) {
    throw new Error('[SMNTC] Canvas width/height must be finite positive numbers for video export.');
  }

  return { width, height };
}

function createVideoEncoderConfig(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  options: ResolvedVideoExportOptions,
): VideoEncoderConfig {
  const { width, height } = getCanvasDimensions(canvas);
  return {
    codec: options.codec ?? 'avc1.42E01E',
    width,
    height,
    bitrate: options.bitrate ?? 6_000_000,
    framerate: options.fps,
  };
}

async function probeVideoEncoderConfigSupport(
  config: VideoEncoderConfig,
): Promise<{ supported: boolean; config?: VideoEncoderConfig }> {
  const isConfigSupported = (VideoEncoder as VideoEncoderWithSupportProbe).isConfigSupported;
  if (typeof isConfigSupported !== 'function') {
    return { supported: true, config };
  }

  try {
    const support = await isConfigSupported(config);
    if (!support.supported) {
      return { supported: false };
    }

    return {
      supported: true,
      config: support.config ?? config,
    };
  } catch {
    return { supported: false };
  }
}

function requestRecorderStop(recorder: MediaRecorder): void {
  if (recorder.state === 'inactive') {
    return;
  }

  try {
    recorder.stop();
  } catch {
    // Ignore stop races; cleanup continues in finally.
  }
}

function stopMediaTracks(stream: MediaStream): void {
  const tracks = typeof stream.getTracks === 'function' ? stream.getTracks() : [];
  for (const track of tracks) {
    if (track && typeof track.stop === 'function') {
      try {
        track.stop();
      } catch {
        // Ignore track stop failures during cleanup.
      }
    }
  }
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new Error('[SMNTC] Video export aborted.');
  }
}

function formatErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return String(error);
}
