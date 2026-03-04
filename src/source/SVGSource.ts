import { ExtrudeGeometry } from 'three';
import type { BufferGeometry, Shape } from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import type { SMNTCSource, SVGSourceConfig } from './types';

const URL_SCHEME_REGEX = /^(https?:\/\/|data:|blob:|file:|\/|\.\/|\.\.\/)/i;

export class SVGSource implements SMNTCSource {
  readonly type = 'svg' as const;
  readonly config: SVGSourceConfig;

  private geometry: BufferGeometry | null = null;
  private geometryPromise: Promise<BufferGeometry> | null = null;

  constructor(config: SVGSourceConfig) {
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
    const shapes = await this.parsePathToShapes(this.config.path);
    if (shapes.length === 0) {
      throw new TypeError('[SMNTC] SVGSource could not extract any shapes.');
    }

    const segments = this.normalizeSegments(this.config.segments);
    const depth = this.normalizeExtrudeDepth(this.config.extrude);
    const geometry = new ExtrudeGeometry(shapes, {
      depth,
      bevelEnabled: false,
      curveSegments: segments,
      steps: Math.max(1, Math.round(segments / 2)),
    });

    geometry.computeVertexNormals();
    this.centerAndNormalize(geometry);
    return geometry;
  }

  private async parsePathToShapes(pathInput: string): Promise<Shape[]> {
    const input = pathInput.trim();
    if (!input) {
      throw new TypeError('[SMNTC] SVGSource requires a non-empty path value.');
    }

    if (this.isLikelyUrl(input)) {
      const svgText = await this.fetchText(this.resolveRuntimeUrl(input));
      return this.parseSvgText(svgText);
    }

    if (this.isSvgMarkup(input)) {
      return this.parseSvgText(input);
    }

    if (this.isRawPathData(input)) {
      return this.parseSvgText(this.wrapPathDataInSvg(input));
    }

    if (input.includes('<path')) {
      return this.parseSvgText(this.wrapPathMarkupInSvg(input));
    }

    // Fallback: treat unrecognized input as raw `d` path data.
    return this.parseSvgText(this.wrapPathDataInSvg(input));
  }

  private parseSvgText(svgText: string): Shape[] {
    const loader = new SVGLoader();
    const svgData = loader.parse(svgText);

    const shapes: Shape[] = [];
    for (const path of svgData.paths) {
      shapes.push(...SVGLoader.createShapes(path));
    }
    return shapes;
  }

  private centerAndNormalize(geometry: BufferGeometry): void {
    geometry.computeBoundingBox();
    geometry.center();
    geometry.computeBoundingBox();

    const bounds = geometry.boundingBox;
    if (!bounds) {
      return;
    }

    const sizeX = bounds.max.x - bounds.min.x;
    const sizeY = bounds.max.y - bounds.min.y;
    const sizeZ = bounds.max.z - bounds.min.z;
    const maxDimension = Math.max(sizeX, sizeY, sizeZ);
    if (Number.isFinite(maxDimension) && maxDimension > 0) {
      const scale = 1 / maxDimension;
      geometry.scale(scale, scale, scale);
    }
  }

  private isLikelyUrl(input: string): boolean {
    return URL_SCHEME_REGEX.test(input) || /\.svg(\?.*)?$/i.test(input);
  }

  private isSvgMarkup(input: string): boolean {
    return /^<svg[\s>]/i.test(input) || (input.includes('<svg') && input.includes('</svg>'));
  }

  private isRawPathData(input: string): boolean {
    if (input.includes('<') || input.includes('>')) {
      return false;
    }
    if (!/[A-Za-z]/.test(input)) {
      return false;
    }
    return /^[A-Za-z0-9,\.\-\s]+$/.test(input);
  }

  private wrapPathDataInSvg(pathData: string): string {
    const escaped = this.escapeAttribute(pathData);
    return `<svg xmlns="http://www.w3.org/2000/svg"><path d="${escaped}"/></svg>`;
  }

  private wrapPathMarkupInSvg(pathMarkup: string): string {
    return `<svg xmlns="http://www.w3.org/2000/svg">${pathMarkup}</svg>`;
  }

  private escapeAttribute(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
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

  private async fetchText(url: string): Promise<string> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new TypeError(`[SMNTC] Failed to fetch SVG source: ${url}`);
    }
    return response.text();
  }

  private normalizeExtrudeDepth(extrude?: number): number {
    if (typeof extrude !== 'number' || !Number.isFinite(extrude)) {
      return 0.1;
    }
    return Math.max(0, extrude);
  }

  private normalizeSegments(segments?: number): number {
    if (typeof segments !== 'number' || !Number.isFinite(segments)) {
      return 12;
    }
    return Math.max(1, Math.min(128, Math.round(segments)));
  }
}
