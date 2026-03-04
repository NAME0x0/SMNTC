export interface PngExportOptions {
  width?: number;
  height?: number;
  scale?: number;
  background?: string;
  renderFrame?: () => void | Promise<void>;
  signal?: AbortSignal;
}

export interface SvgExportOptions {
  width?: number;
  height?: number;
}

export async function exportCanvasPng(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  options: PngExportOptions = {},
): Promise<Blob> {
  if (options.signal?.aborted) {
    throw new Error('[SMNTC] PNG export aborted.');
  }

  if (options.renderFrame) {
    await options.renderFrame();
  }

  const exportCanvas = resizeCanvasIfNeeded(canvas, options);
  return canvasToBlob(exportCanvas, 'image/png', options.signal);
}

export function exportSvg(svg: SVGElement | string, options: SvgExportOptions = {}): Blob {
  const svgText = typeof svg === 'string'
    ? svg
    : serializeSvg(svg, options);

  return new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
}

export function serializeSvg(svg: SVGElement, options: SvgExportOptions = {}): string {
  const clone = svg.cloneNode(true) as SVGElement;

  if (!clone.getAttribute('xmlns')) {
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  }

  if (options.width) {
    clone.setAttribute('width', String(options.width));
  }

  if (options.height) {
    clone.setAttribute('height', String(options.height));
  }

  const serializer = new XMLSerializer();
  return serializer.serializeToString(clone);
}

function resizeCanvasIfNeeded(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  options: PngExportOptions,
): HTMLCanvasElement | OffscreenCanvas {
  const scale = options.scale ?? 1;
  const targetWidth = options.width ?? Math.round(canvas.width * scale);
  const targetHeight = options.height ?? Math.round(canvas.height * scale);

  if (targetWidth === canvas.width && targetHeight === canvas.height) {
    return canvas;
  }

  const output = createCanvas(targetWidth, targetHeight);
  const ctx = output.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
  if (!ctx) {
    return canvas;
  }

  if (options.background) {
    ctx.fillStyle = options.background;
    ctx.fillRect(0, 0, targetWidth, targetHeight);
  }

  ctx.drawImage(canvas as CanvasImageSource, 0, 0, targetWidth, targetHeight);
  return output;
}

function createCanvas(width: number, height: number): HTMLCanvasElement | OffscreenCanvas {
  if (typeof OffscreenCanvas !== 'undefined') {
    return new OffscreenCanvas(width, height);
  }

  if (typeof document === 'undefined' || typeof document.createElement !== 'function') {
    throw new Error('[SMNTC] Cannot create canvas: OffscreenCanvas and document are unavailable in this environment.');
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

async function canvasToBlob(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  type: string,
  signal?: AbortSignal,
): Promise<Blob> {
  if (signal?.aborted) {
    throw new Error('[SMNTC] PNG export aborted.');
  }

  if (hasConvertToBlob(canvas)) {
    return canvas.convertToBlob({ type });
  }

  if (hasToBlob(canvas)) {
    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('[SMNTC] Failed to export canvas.'));
          return;
        }
        resolve(blob);
      }, type);
    });
  }

  if (hasToDataUrl(canvas)) {
    const dataUrl = canvas.toDataURL(type);
    return dataUrlToBlob(dataUrl);
  }

  throw new Error('[SMNTC] Canvas export is not supported in this environment.');
}

type CanvasWithConvertToBlob = (HTMLCanvasElement | OffscreenCanvas) & {
  convertToBlob: (options?: BlobPropertyBag) => Promise<Blob>;
};

type CanvasWithToBlob = (HTMLCanvasElement | OffscreenCanvas) & {
  toBlob: (callback: BlobCallback, type?: string, quality?: any) => void;
};

type CanvasWithToDataUrl = (HTMLCanvasElement | OffscreenCanvas) & {
  toDataURL: (type?: string, quality?: any) => string;
};

function hasConvertToBlob(canvas: HTMLCanvasElement | OffscreenCanvas): canvas is CanvasWithConvertToBlob {
  const convertToBlob = (canvas as Partial<CanvasWithConvertToBlob>).convertToBlob;
  return typeof convertToBlob === 'function';
}

function hasToBlob(canvas: HTMLCanvasElement | OffscreenCanvas): canvas is CanvasWithToBlob {
  const toBlob = (canvas as Partial<CanvasWithToBlob>).toBlob;
  return typeof toBlob === 'function';
}

function hasToDataUrl(canvas: HTMLCanvasElement | OffscreenCanvas): canvas is CanvasWithToDataUrl {
  const toDataURL = (canvas as Partial<CanvasWithToDataUrl>).toDataURL;
  return typeof toDataURL === 'function';
}

function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(',');
  const header = parts[0] ?? '';
  const data = parts[1] ?? '';
  const isBase64 = header.includes('base64');
  const mime = header.match(/data:([^;]+)/)?.[1] ?? 'image/png';

  if (isBase64) {
    const binary = atob(data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new Blob([bytes], { type: mime });
  }

  return new Blob([decodeURIComponent(data)], { type: mime });
}
