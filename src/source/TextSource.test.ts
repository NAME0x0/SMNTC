import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parse } from 'opentype.js';
import type { Path } from 'opentype.js';
import { TextSource } from './TextSource';

vi.mock('opentype.js', () => ({
  parse: vi.fn(),
}));

function createBinaryResponse(): Response {
  return {
    ok: true,
    arrayBuffer: async () => new ArrayBuffer(32),
    text: async () => '',
  } as Response;
}

function createCssResponse(css: string): Response {
  return {
    ok: true,
    arrayBuffer: async () => new ArrayBuffer(0),
    text: async () => css,
  } as Response;
}

function createFontPath(): Path {
  return {
    commands: [
      { type: 'M', x: 0, y: 0 },
      { type: 'L', x: 1, y: 0 },
      { type: 'L', x: 1, y: 1 },
      { type: 'L', x: 0, y: 1 },
      { type: 'Z' },
    ],
  } as Path;
}

describe('TextSource', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    const parseMock = vi.mocked(parse);
    parseMock.mockReset();
    parseMock.mockReturnValue({
      getPaths: () => [createFontPath()],
    } as any);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.clearAllMocks();
  });

  it('builds and caches geometry for direct font URLs', async () => {
    const fetchMock = vi.fn(async () => createBinaryResponse());
    globalThis.fetch = fetchMock as typeof fetch;

    const source = new TextSource({
      type: 'text',
      content: 'SMNTC',
      font: 'https://example.com/fonts/Test.ttf',
      size: 2,
      extrude: 0.2,
      segments: 8,
    });

    const geometryA = await source.getGeometry();
    const geometryB = await source.getGeometry();

    expect(geometryA).toBe(geometryB);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('https://example.com/fonts/Test.ttf');
    expect(geometryA.getAttribute('position').count).toBeGreaterThan(0);
    expect(geometryA.getAttribute('uv').count).toBeGreaterThan(0);
  });

  it('resolves Google font family names to a downloadable font file', async () => {
    const css = "@font-face{src:url(https://fonts.gstatic.com/s/inter/v99/inter.ttf) format('truetype');}";
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(createCssResponse(css))
      .mockResolvedValueOnce(createBinaryResponse());
    globalThis.fetch = fetchMock as typeof fetch;

    const source = new TextSource({
      type: 'text',
      content: 'SMNTC',
      font: 'Inter, sans-serif',
    });

    await source.getGeometry();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[0][0])).toContain('https://fonts.googleapis.com/css?family=Inter');
    expect(fetchMock.mock.calls[1][0]).toBe('https://fonts.gstatic.com/s/inter/v99/inter.ttf');
  });

  it('maps common system fonts to Google-compatible family fallbacks', async () => {
    const css = "@font-face{src:url(https://fonts.gstatic.com/s/arimo/v99/arimo.ttf) format('truetype');}";
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(createCssResponse(css))
      .mockResolvedValueOnce(createBinaryResponse());
    globalThis.fetch = fetchMock as typeof fetch;

    const source = new TextSource({
      type: 'text',
      content: 'SMNTC',
      font: 'Arial',
    });

    await source.getGeometry();
    expect(String(fetchMock.mock.calls[0][0])).toContain('family=Arimo');
  });

  it('rebuilds geometry after dispose()', async () => {
    const fetchMock = vi.fn(async () => createBinaryResponse());
    globalThis.fetch = fetchMock as typeof fetch;
    const parseMock = vi.mocked(parse);

    const source = new TextSource({
      type: 'text',
      content: 'SMNTC',
      font: 'https://example.com/fonts/Test.ttf',
    });

    const geometryA = await source.getGeometry();
    source.dispose();
    const geometryB = await source.getGeometry();

    expect(geometryA).not.toBe(geometryB);
    expect(parseMock).toHaveBeenCalledTimes(2);
  });
});
