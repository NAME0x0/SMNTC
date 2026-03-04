import type { BufferGeometry, Texture } from 'three';
import type { GeometrySourceConfig, SMNTCSource } from './types';

/**
 * Pass-through source for existing SMNTC behavior where geometry is
 * provided directly by the caller.
 */
export class GeometrySource implements SMNTCSource {
  readonly type = 'geometry' as const;
  readonly config: GeometrySourceConfig;

  constructor(config: GeometrySourceConfig) {
    this.config = config;
  }

  async getGeometry(): Promise<BufferGeometry> {
    return this.config.geometry;
  }

  async getMask(): Promise<Texture | null> {
    return this.config.maskTexture ?? null;
  }

  dispose(): void {
    // Geometry ownership stays with the caller.
  }
}
