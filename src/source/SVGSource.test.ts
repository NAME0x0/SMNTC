import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Shape } from 'three';
import { SVGSource } from './SVGSource';

const { parseMock, createShapesMock } = vi.hoisted(() => ({
  parseMock: vi.fn(),
  createShapesMock: vi.fn(),
}));

vi.mock('three/examples/jsm/loaders/SVGLoader.js', () => {
  class MockSVGLoader {
    parse(input: string): unknown {
      return parseMock(input);
    }

    static createShapes(path: unknown): Shape[] {
      return createShapesMock(path);
    }
  }

  return { SVGLoader: MockSVGLoader };
});

function createSquareShape(): Shape {
  const shape = new Shape();
  shape.moveTo(0, 0);
  shape.lineTo(1, 0);
  shape.lineTo(1, 1);
  shape.lineTo(0, 1);
  shape.lineTo(0, 0);
  return shape;
}

function createTextResponse(text: string): Response {
  return {
    ok: true,
    text: async () => text,
  } as Response;
}

describe('SVGSource', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    parseMock.mockReset();
    createShapesMock.mockReset();

    parseMock.mockReturnValue({ paths: [{ id: 'path-1' }] });
    createShapesMock.mockReturnValue([createSquareShape()]);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.clearAllMocks();
  });

  it('parses raw path data and caches geometry', async () => {
    const source = new SVGSource({
      type: 'svg',
      path: 'M0 0 L100 0 L100 100 Z',
      extrude: 0.2,
      segments: 8,
    });

    const geometryA = await source.getGeometry();
    const geometryB = await source.getGeometry();

    expect(geometryA).toBe(geometryB);
    expect(parseMock).toHaveBeenCalledTimes(1);
    expect(String(parseMock.mock.calls[0][0])).toContain('<svg');
    expect(String(parseMock.mock.calls[0][0])).toContain('path d="M0 0 L100 0 L100 100 Z"');
    expect(geometryA.getAttribute('position').count).toBeGreaterThan(0);
  });

  it('accepts complete SVG markup directly', async () => {
    const source = new SVGSource({
      type: 'svg',
      path: '<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0 L1 0 L1 1 Z"/></svg>',
    });

    await source.getGeometry();
    expect(parseMock).toHaveBeenCalledTimes(1);
    expect(String(parseMock.mock.calls[0][0])).toContain('<svg');
  });

  it('fetches SVG content when a URL is provided', async () => {
    const fetchMock = vi.fn(async () =>
      createTextResponse('<svg xmlns="http://www.w3.org/2000/svg"><path d="M0 0 L1 0 L1 1 Z"/></svg>'));
    globalThis.fetch = fetchMock as typeof fetch;

    const source = new SVGSource({
      type: 'svg',
      path: 'https://example.com/logo.svg',
    });

    await source.getGeometry();
    await source.getGeometry();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('https://example.com/logo.svg');
    expect(parseMock).toHaveBeenCalledTimes(1);
  });

  it('rebuilds geometry after dispose()', async () => {
    const source = new SVGSource({
      type: 'svg',
      path: 'M0 0 L1 0 L1 1 Z',
    });

    const geometryA = await source.getGeometry();
    source.dispose();
    const geometryB = await source.getGeometry();

    expect(geometryA).not.toBe(geometryB);
    expect(parseMock).toHaveBeenCalledTimes(2);
  });
});
