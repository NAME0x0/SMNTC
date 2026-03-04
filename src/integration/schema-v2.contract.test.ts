import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  FIDELITIES,
  LAYER_BLEND_MODES,
  PALETTES,
  PATTERNS,
  PATTERN_BLENDS,
  REACTIVITIES,
  SURFACES,
  VIBES,
} from '../semantic/tokens';

type JsonValue = null | boolean | number | string | JsonValue[] | { [k: string]: JsonValue };

function loadSchema(): Record<string, JsonValue> {
  const raw = readFileSync(new URL('../../smntc.schema.v2.json', import.meta.url), 'utf8');
  return JSON.parse(raw) as Record<string, JsonValue>;
}

describe('smntc.schema.v2 canonical contract', () => {
  const schema = loadSchema() as {
    properties?: Record<string, JsonValue>;
    additionalProperties?: JsonValue;
    $defs?: Record<string, any>;
  };

  it('uses flat runtime keys at top level', () => {
    expect(schema.properties?.surface).toBeDefined();
    expect(schema.properties?.vibe).toBeDefined();
    expect(schema.properties?.palette).toBeDefined();
    expect(schema.properties?.pattern).toBeDefined();
    expect(schema.properties?.source).toBeDefined();
    expect(schema.properties?.layers).toBeDefined();

    expect(schema.properties?.animation).toBeUndefined();
    expect(schema.properties?.effects).toBeUndefined();
    expect(schema.additionalProperties).toBe(false);
  });

  it('allows only implemented runtime source variants', () => {
    const sourceConfig = schema.$defs?.sourceConfig as { oneOf: Array<{ $ref: string }> };
    const types = sourceConfig.oneOf
      .map(({ $ref }) => {
        const defName = $ref.split('/').pop() ?? '';
        return schema.$defs?.[defName]?.properties?.type?.const as string;
      })
      .sort();

    expect(types).toEqual(['geometry', 'image', 'svg', 'text']);
    expect(types).not.toContain('model');
  });

  it('matches source field names to runtime source configs', () => {
    const text = schema.$defs?.textSourceConfig as { required?: string[]; properties?: Record<string, JsonValue> };
    const svg = schema.$defs?.svgSourceConfig as { required?: string[]; properties?: Record<string, JsonValue> };
    const image = schema.$defs?.imageSourceConfig as { required?: string[]; properties?: Record<string, JsonValue> };
    const geometry = schema.$defs?.geometrySourceConfig as { required?: string[]; properties?: Record<string, JsonValue> };

    expect(text.required).toContain('content');
    expect(text.properties?.font).toBeDefined();

    expect(svg.required).toContain('path');
    expect(svg.properties?.content).toBeUndefined();

    expect(image.required).toContain('src');
    expect(geometry.required).toContain('geometry');
  });

  it('uses runtime pattern tokens and fields', () => {
    const pattern = schema.$defs?.patternConfig as { properties?: Record<string, any> };
    const tokenEnum = pattern.properties?.type?.enum as string[];

    expect(tokenEnum).toContain('hexagon');
    expect(tokenEnum).not.toContain('hex');
    expect(pattern.properties?.weight).toBeDefined();
    expect(pattern.properties?.lineWidth).toBeUndefined();
  });

  it('keeps schema enums in exact parity with runtime token exports', () => {
    const defs = schema.$defs ?? {};

    expect(defs.surface?.enum).toEqual([...SURFACES]);
    expect(defs.vibe?.enum).toEqual([...VIBES]);
    expect(defs.reactivity?.enum).toEqual([...REACTIVITIES]);
    expect(defs.fidelity?.enum).toEqual([...FIDELITIES]);
    expect(defs.palette?.enum).toEqual([...PALETTES]);

    const patternTypeEnum = defs.patternConfig?.properties?.type?.enum;
    const patternBlendEnum = defs.patternConfig?.properties?.blend?.enum;
    const layerBlendEnum = defs.layerConfig?.properties?.blend?.enum;

    expect(patternTypeEnum).toEqual([...PATTERNS]);
    expect(patternBlendEnum).toEqual([...PATTERN_BLENDS]);
    expect(layerBlendEnum).toEqual([...LAYER_BLEND_MODES]);
  });
});
