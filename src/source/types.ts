import type { BufferGeometry, Texture } from 'three';

export type SourceType = 'geometry' | 'text' | 'svg' | 'image';

export interface SMNTCSourceConfig {
  type: SourceType;
  /** Invert sampled mask values when applying displacement masking. */
  maskInvert?: boolean;
}

export interface TextSourceConfig extends SMNTCSourceConfig {
  type: 'text';
  content: string;
  font?: string;
  size?: number;
  extrude?: number;
  bevel?: boolean;
  segments?: number;
}

export interface SVGSourceConfig extends SMNTCSourceConfig {
  type: 'svg';
  path: string;
  extrude?: number;
  segments?: number;
}

export interface ImageSourceConfig extends SMNTCSourceConfig {
  type: 'image';
  src: string;
  threshold?: number;
  simplify?: number;
  adaptiveDensity?: number;
}

export interface GeometrySourceConfig extends SMNTCSourceConfig {
  type: 'geometry';
  geometry: BufferGeometry;
  /** Optional explicit mask texture for displacement control. */
  maskTexture?: Texture | null;
}

export type AnySourceConfig =
  | TextSourceConfig
  | SVGSourceConfig
  | ImageSourceConfig
  | GeometrySourceConfig;

export interface SMNTCSource {
  readonly type: SourceType;
  readonly config: AnySourceConfig;

  /** Generate or return the mesh geometry. */
  getGeometry(): Promise<BufferGeometry>;

  /** Get UV mask texture (optional, for masked displacement). */
  getMask?(): Promise<Texture | null>;

  /** Dispose of any resources held by the source. */
  dispose(): void;
}
