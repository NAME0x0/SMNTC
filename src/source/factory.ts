import type { AnySourceConfig, SMNTCSource } from './types';
import { GeometrySource } from './GeometrySource';
import { ImageSource } from './ImageSource';
import { SVGSource } from './SVGSource';
import { TextSource } from './TextSource';

export function createSource(config: AnySourceConfig): SMNTCSource {
  switch (config.type) {
    case 'text':
      return new TextSource(config);
    case 'svg':
      return new SVGSource(config);
    case 'image':
      return new ImageSource(config);
    case 'geometry':
      return new GeometrySource(config);
    default:
      throw new TypeError(`[SMNTC] Unknown source type: ${(config as { type?: unknown }).type}`);
  }
}
