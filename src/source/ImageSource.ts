import type { BufferGeometry } from 'three';
import {
  buildContourGeometryFromImageData,
  type RasterImageData,
} from '../mesh/contour-mesh';
import type { ImageSourceConfig, SMNTCSource } from './types';

const MAX_RASTER_SIZE = 512;

export class ImageSource implements SMNTCSource {
  readonly type = 'image' as const;
  readonly config: ImageSourceConfig;

  private geometry: BufferGeometry | null = null;
  private geometryPromise: Promise<BufferGeometry> | null = null;

  constructor(config: ImageSourceConfig) {
    this.config = config;
  }

  async getGeometry(): Promise<BufferGeometry> {
    if (this.geometry) {
      return this.geometry;
    }
    if (this.geometryPromise) {
      return this.geometryPromise;
    }

    this.geometryPromise = this.buildGeometry()
      .then((geometry) => {
        this.geometry = geometry;
        return geometry;
      })
      .finally(() => {
        this.geometryPromise = null;
      });

    return this.geometryPromise;
  }

  dispose(): void {
    this.geometry?.dispose();
    this.geometry = null;
    this.geometryPromise = null;
  }

  private async buildGeometry(): Promise<BufferGeometry> {
    const source = this.config.src.trim();
    if (!source) {
      throw new TypeError('[SMNTC] ImageSource requires a non-empty `src` value.');
    }

    const raster = await this.loadRasterData(source);
    return buildContourGeometryFromImageData(raster, {
      threshold: this.config.threshold,
      simplify: this.config.simplify,
      adaptiveDensity: this.config.adaptiveDensity ?? 0.75,
      maxAdaptiveSubdivisions: 8,
      depth: 0.08,
      segments: 8,
      maxContours: 64,
    });
  }

  private async loadRasterData(source: string): Promise<RasterImageData> {
    const resolvedUrl = this.resolveRuntimeUrl(source);
    const response = await fetch(resolvedUrl);
    if (!response.ok) {
      throw new TypeError(`[SMNTC] Failed to fetch image source: ${resolvedUrl}`);
    }

    const blob = await response.blob();
    return this.decodeImageBlob(blob);
  }

  private async decodeImageBlob(blob: Blob): Promise<RasterImageData> {
    if (typeof createImageBitmap === 'function' && typeof OffscreenCanvas !== 'undefined') {
      const bitmap = await createImageBitmap(blob);
      try {
        const { width, height } = this.computeRasterSize(bitmap.width, bitmap.height);
        const canvas = new OffscreenCanvas(width, height);
        const context = canvas.getContext('2d');
        if (!context) {
          throw new TypeError('[SMNTC] Could not create a 2D rendering context for image processing.');
        }

        context.drawImage(bitmap, 0, 0, width, height);
        const imageData = context.getImageData(0, 0, width, height);
        return {
          width: imageData.width,
          height: imageData.height,
          data: imageData.data,
        };
      } finally {
        if (typeof bitmap.close === 'function') {
          bitmap.close();
        }
      }
    }

    if (typeof document !== 'undefined') {
      const objectUrl = URL.createObjectURL(blob);
      try {
        const image = await this.loadHtmlImage(objectUrl);
        const { width, height } = this.computeRasterSize(image.naturalWidth, image.naturalHeight);
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const context = canvas.getContext('2d');
        if (!context) {
          throw new TypeError('[SMNTC] Could not create a 2D rendering context for image processing.');
        }

        context.drawImage(image, 0, 0, width, height);
        const imageData = context.getImageData(0, 0, width, height);
        return {
          width: imageData.width,
          height: imageData.height,
          data: imageData.data,
        };
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    }

    throw new TypeError('[SMNTC] Image decoding requires browser canvas APIs (OffscreenCanvas or document canvas).');
  }

  private loadHtmlImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.decoding = 'async';
      image.crossOrigin = 'anonymous';
      image.onload = () => resolve(image);
      image.onerror = () => reject(new TypeError(`[SMNTC] Failed to decode image: ${url}`));
      image.src = url;
    });
  }

  private computeRasterSize(width: number, height: number): { width: number; height: number } {
    const maxDimension = Math.max(width, height);
    if (!Number.isFinite(maxDimension) || maxDimension <= 0) {
      throw new TypeError('[SMNTC] Source image has invalid dimensions.');
    }

    const scale = Math.min(1, MAX_RASTER_SIZE / maxDimension);
    return {
      width: Math.max(2, Math.round(width * scale)),
      height: Math.max(2, Math.round(height * scale)),
    };
  }

  private resolveRuntimeUrl(url: string): string {
    if (/^(https?:\/\/|data:|blob:|file:)/i.test(url)) {
      return url;
    }
    if (url.startsWith('//')) {
      return `https:${url}`;
    }
    if (typeof window !== 'undefined' && window.location) {
      return new URL(url, window.location.href).toString();
    }
    return url;
  }
}
