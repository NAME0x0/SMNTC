import { describe, expect, it } from 'vitest';
import {
  buildContourGeometryFromImageData,
  extractContoursFromImageData,
  type RasterImageData,
} from './contour-mesh';

function createSquareRaster(size = 48): RasterImageData {
  const data = new Uint8ClampedArray(size * size * 4);

  // Transparent white background.
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 255;
    data[i + 1] = 255;
    data[i + 2] = 255;
    data[i + 3] = 0;
  }

  // Solid black square in the middle.
  for (let y = 12; y < 36; y++) {
    for (let x = 12; x < 36; x++) {
      const idx = ((y * size) + x) * 4;
      data[idx] = 0;
      data[idx + 1] = 0;
      data[idx + 2] = 0;
      data[idx + 3] = 255;
    }
  }

  return { width: size, height: size, data };
}

function createJaggedRaster(size = 64): RasterImageData {
  const data = new Uint8ClampedArray(size * size * 4);

  for (let i = 0; i < data.length; i += 4) {
    data[i] = 255;
    data[i + 1] = 255;
    data[i + 2] = 255;
    data[i + 3] = 0;
  }

  for (let y = 8; y < 56; y++) {
    const step = Math.floor((y - 8) / 4) % 2;
    const left = 10 + (step === 0 ? 0 : 6);
    for (let x = left; x < 54; x++) {
      const idx = ((y * size) + x) * 4;
      data[idx] = 0;
      data[idx + 1] = 0;
      data[idx + 2] = 0;
      data[idx + 3] = 255;
    }
  }

  return { width: size, height: size, data };
}

describe('contour-mesh', () => {
  it('extracts at least one closed contour from raster image data', () => {
    const raster = createSquareRaster();
    const contours = extractContoursFromImageData(raster, {
      threshold: 0.12,
      simplify: 0,
    });

    expect(contours.length).toBeGreaterThan(0);
    const first = contours[0];
    expect(first.length).toBeGreaterThan(4);
    expect(first[0]?.x).toBeCloseTo(first[first.length - 1]?.x ?? 0, 3);
    expect(first[0]?.y).toBeCloseTo(first[first.length - 1]?.y ?? 0, 3);
  });

  it('simplification reduces contour point count', () => {
    const raster = createSquareRaster();
    const noSimplify = extractContoursFromImageData(raster, {
      threshold: 0.12,
      simplify: 0,
    });
    const simplified = extractContoursFromImageData(raster, {
      threshold: 0.12,
      simplify: 0.9,
    });

    const noSimplifyPoints = noSimplify.reduce((sum, contour) => sum + contour.length, 0);
    const simplifiedPoints = simplified.reduce((sum, contour) => sum + contour.length, 0);
    expect(simplifiedPoints).toBeLessThan(noSimplifyPoints);
  });

  it('builds extruded geometry from extracted contours', () => {
    const raster = createSquareRaster();
    const geometry = buildContourGeometryFromImageData(raster, {
      threshold: 0.12,
      simplify: 0.25,
      depth: 0.1,
      segments: 6,
    });

    expect(geometry.getAttribute('position').count).toBeGreaterThan(0);
    expect(geometry.getAttribute('normal').count).toBeGreaterThan(0);
    geometry.dispose();
  });

  it('adaptive density increases contour point count in detailed regions', () => {
    const raster = createJaggedRaster();

    const baseline = extractContoursFromImageData(raster, {
      threshold: 0.1,
      simplify: 0.5,
      adaptiveDensity: 0,
    });
    const adaptive = extractContoursFromImageData(raster, {
      threshold: 0.1,
      simplify: 0.5,
      adaptiveDensity: 1,
      maxAdaptiveSubdivisions: 8,
    });

    const baselinePoints = baseline.reduce((sum, contour) => sum + contour.length, 0);
    const adaptivePoints = adaptive.reduce((sum, contour) => sum + contour.length, 0);
    expect(adaptivePoints).toBeGreaterThan(baselinePoints);
  });

  it('throws when no contours can be extracted', () => {
    const size = 32;
    const empty = new Uint8ClampedArray(size * size * 4);
    const raster: RasterImageData = { width: size, height: size, data: empty };

    expect(() => buildContourGeometryFromImageData(raster)).toThrow(TypeError);
  });
});
