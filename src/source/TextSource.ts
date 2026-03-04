import { ExtrudeGeometry, ShapePath } from 'three';
import type { BufferGeometry, Shape } from 'three';
import { parse } from 'opentype.js';
import type { Path, PathCommand } from 'opentype.js';
import type { SMNTCSource, TextSourceConfig } from './types';

const DEFAULT_FONT_FAMILY = 'Roboto';
const FONT_FILE_EXTENSION_REGEX = /\.(ttf|otf|woff)(\?.*)?$/i;
const URL_SCHEME_REGEX = /^(https?:\/\/|data:|blob:|file:|\/|\.\/|\.\.\/)/i;

const SYSTEM_FONT_FALLBACKS: Record<string, string> = {
  arial: 'Arimo',
  'helvetica neue': 'Arimo',
  helvetica: 'Arimo',
  verdana: 'Arimo',
  tahoma: 'Arimo',
  'trebuchet ms': 'Arimo',
  georgia: 'Tinos',
  'times new roman': 'Tinos',
  times: 'Tinos',
  'courier new': 'Cousine',
  courier: 'Cousine',
};

export class TextSource implements SMNTCSource {
  readonly type = 'text' as const;
  readonly config: TextSourceConfig;

  private geometry: BufferGeometry | null = null;
  private geometryPromise: Promise<BufferGeometry> | null = null;

  constructor(config: TextSourceConfig) {
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
    const content = this.config.content.trim();
    if (!content) {
      throw new TypeError('[SMNTC] TextSource requires non-empty text content.');
    }

    const fontUrl = await this.resolveFontUrl(this.config.font);
    const fontData = await this.fetchArrayBuffer(fontUrl);
    const font = parse(fontData);
    const fontSize = this.normalizeSize(this.config.size);
    const glyphPaths = font.getPaths(content, 0, 0, fontSize, { kerning: true });

    const shapes: Shape[] = [];
    for (const glyphPath of glyphPaths) {
      shapes.push(...this.pathToShapes(glyphPath));
    }

    if (shapes.length === 0) {
      throw new TypeError(`[SMNTC] TextSource could not build shapes for "${content}".`);
    }

    const segments = this.normalizeSegments(this.config.segments);
    const depth = this.normalizeExtrudeDepth(this.config.extrude);
    const bevelEnabled = this.config.bevel ?? false;

    const geometry = new ExtrudeGeometry(shapes, {
      depth,
      bevelEnabled,
      curveSegments: segments,
      steps: Math.max(1, Math.round(segments / 2)),
      bevelSegments: bevelEnabled ? Math.max(1, Math.round(segments / 2)) : 0,
      bevelSize: bevelEnabled ? depth * 0.05 : 0,
      bevelThickness: bevelEnabled ? depth * 0.05 : 0,
    });

    geometry.computeVertexNormals();
    geometry.center();
    return geometry;
  }

  private pathToShapes(path: Path): Shape[] {
    const shapePath = new ShapePath();

    // Convert opentype path commands into Three.js subpaths.
    for (const command of path.commands) {
      this.applyPathCommand(shapePath, command);
    }

    return shapePath.toShapes(false);
  }

  private applyPathCommand(shapePath: ShapePath, command: PathCommand): void {
    switch (command.type) {
      case 'M':
        shapePath.moveTo(command.x, command.y);
        break;
      case 'L':
        shapePath.lineTo(command.x, command.y);
        break;
      case 'C':
        shapePath.bezierCurveTo(
          command.x1,
          command.y1,
          command.x2,
          command.y2,
          command.x,
          command.y,
        );
        break;
      case 'Q':
        shapePath.quadraticCurveTo(
          command.x1,
          command.y1,
          command.x,
          command.y,
        );
        break;
      case 'Z':
        shapePath.currentPath?.closePath();
        break;
      default:
        break;
    }
  }

  private async resolveFontUrl(fontSpec?: string): Promise<string> {
    const rawSpec = (fontSpec ?? '').trim();
    if (!rawSpec) {
      return this.resolveGoogleFamilyFontUrl(DEFAULT_FONT_FAMILY);
    }

    if (rawSpec.startsWith('google:')) {
      const family = rawSpec.slice('google:'.length).trim();
      return this.resolveGoogleFamilyFontUrl(family || DEFAULT_FONT_FAMILY);
    }

    if (rawSpec.includes('fonts.googleapis.com')) {
      return this.resolveGoogleCssFontUrl(rawSpec);
    }

    if (URL_SCHEME_REGEX.test(rawSpec) || FONT_FILE_EXTENSION_REGEX.test(rawSpec)) {
      return this.resolveRuntimeUrl(rawSpec);
    }

    const family = this.normalizeFontFamily(rawSpec);
    const fallbackFamily = SYSTEM_FONT_FALLBACKS[family.toLowerCase()] ?? family;
    return this.resolveGoogleFamilyFontUrl(fallbackFamily);
  }

  private async resolveGoogleFamilyFontUrl(family: string): Promise<string> {
    const encodedFamily = encodeURIComponent(family.trim()).replace(/%20/g, '+');
    const cssUrl = `https://fonts.googleapis.com/css?family=${encodedFamily}`;
    return this.resolveGoogleCssFontUrl(cssUrl);
  }

  private async resolveGoogleCssFontUrl(cssUrl: string): Promise<string> {
    const cssResponse = await fetch(cssUrl);
    if (!cssResponse.ok) {
      throw new TypeError(`[SMNTC] Failed to fetch Google Fonts CSS: ${cssUrl}`);
    }

    const cssText = await cssResponse.text();
    const fontUrl = this.extractFontFileUrlFromCss(cssText);
    return this.resolveRuntimeUrl(fontUrl);
  }

  private extractFontFileUrlFromCss(cssText: string): string {
    const entries = [...cssText.matchAll(/url\(([^)]+)\)\s*format\(['"]?([^'")]+)['"]?\)/gi)];
    if (entries.length > 0) {
      const preferredFormats = ['truetype', 'opentype', 'woff'];
      for (const format of preferredFormats) {
        const entry = entries.find((match) => match[2].toLowerCase() === format);
        if (entry) {
          return this.stripUrlToken(entry[1]);
        }
      }
      return this.stripUrlToken(entries[0][1]);
    }

    const fallbackEntry = cssText.match(/url\(([^)]+)\)/i);
    if (fallbackEntry?.[1]) {
      return this.stripUrlToken(fallbackEntry[1]);
    }

    throw new TypeError('[SMNTC] Could not resolve a font file URL from CSS.');
  }

  private stripUrlToken(token: string): string {
    return token.trim().replace(/^['"]|['"]$/g, '');
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

  private normalizeFontFamily(fontSpec: string): string {
    const firstFamily = fontSpec.split(',')[0] ?? fontSpec;
    return firstFamily.trim().replace(/^['"]|['"]$/g, '');
  }

  private async fetchArrayBuffer(url: string): Promise<ArrayBuffer> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new TypeError(`[SMNTC] Failed to fetch font binary: ${url}`);
    }
    return response.arrayBuffer();
  }

  private normalizeSize(size?: number): number {
    if (typeof size !== 'number' || !Number.isFinite(size)) {
      return 1;
    }
    return Math.max(0.001, size);
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
