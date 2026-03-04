import { resolveConstants } from '../semantic/dictionary';
import type {
  LayerBlendMode,
  LayerConfig,
  SMNTCConfig,
  ShaderConstants,
} from '../semantic/tokens';

const TWO_PI = Math.PI * 2;

const SCALAR_FIELDS: Array<keyof Pick<
  ShaderConstants,
  | 'frequency'
  | 'amplitude'
  | 'damping'
  | 'noiseScale'
  | 'noiseSpeed'
  | 'reactivityStrength'
  | 'reactivityRadius'
  | 'segments'
  | 'wireframeWidth'
  | 'intensity'
  | 'speed'
  | 'contourLines'
  | 'angle'
  | 'grain'
  | 'glow'
  | 'chromatic'
  | 'vignette'
  | 'blur'
  | 'patternScale'
  | 'patternWeight'
  | 'patternAlpha'
  | 'patternRotation'
  | 'patternRepeatX'
  | 'patternRepeatY'
>> = [
  'frequency',
  'amplitude',
  'damping',
  'noiseScale',
  'noiseSpeed',
  'reactivityStrength',
  'reactivityRadius',
  'segments',
  'wireframeWidth',
  'intensity',
  'speed',
  'contourLines',
  'angle',
  'grain',
  'glow',
  'chromatic',
  'vignette',
  'blur',
  'patternScale',
  'patternWeight',
  'patternAlpha',
  'patternRotation',
  'patternRepeatX',
  'patternRepeatY',
];

/**
 * Compose semantic layer stack into a single resolved ShaderConstants object.
 * Layer numeric params interpolate by opacity, while colors use blend modes.
 */
export function composeLayerConstants(
  baseConfig: Partial<SMNTCConfig> = {},
  layers: readonly LayerConfig[] = [],
): ShaderConstants {
  let composed = cloneConstants(resolveConstants(baseConfig));

  for (const layer of layers) {
    if (!layer || layer.enabled === false) {
      continue;
    }

    const opacity = clampNumber(layer.opacity ?? 1, 0, 1);
    if (opacity <= 0) {
      continue;
    }

    const layerConfig = mergeConfig(baseConfig, layer.animation ?? {});
    const layerConstants = resolveConstants(layerConfig);
    const blend = layer.blend ?? 'normal';

    composed = blendConstants(composed, layerConstants, blend, opacity);
    composed = normalizeComposedConstants(composed);
  }

  return composed;
}

function blendConstants(
  base: ShaderConstants,
  top: ShaderConstants,
  blend: LayerBlendMode,
  opacity: number,
): ShaderConstants {
  const out = cloneConstants(base);

  for (const field of SCALAR_FIELDS) {
    out[field] = lerpNumber(base[field], top[field], opacity) as ShaderConstants[typeof field];
  }

  out.primaryColor = blendColor(base.primaryColor, top.primaryColor, blend, opacity);
  out.accentColor = blendColor(base.accentColor, top.accentColor, blend, opacity);
  out.backgroundColor = blendColor(base.backgroundColor, top.backgroundColor, blend, opacity);

  if (opacity >= 0.5) {
    out.surfaceMode = top.surfaceMode;
    out.reactivityMode = top.reactivityMode;
    out.patternType = top.patternType;
    out.patternMode = top.patternMode;
    out.patternAnimate = top.patternAnimate;
    out.wireframe = top.wireframe;
  } else {
    out.wireframe = base.wireframe;
  }

  return out;
}

function blendColor(
  base: [number, number, number],
  top: [number, number, number],
  blend: LayerBlendMode,
  opacity: number,
): [number, number, number] {
  return [
    blendChannel(base[0], top[0], blend, opacity),
    blendChannel(base[1], top[1], blend, opacity),
    blendChannel(base[2], top[2], blend, opacity),
  ];
}

function blendChannel(base: number, top: number, blend: LayerBlendMode, opacity: number): number {
  let modeValue = top;
  switch (blend) {
    case 'normal':
      modeValue = top;
      break;
    case 'add':
      modeValue = Math.min(1, base + top);
      break;
    case 'multiply':
      modeValue = base * top;
      break;
    case 'screen':
      modeValue = 1 - (1 - base) * (1 - top);
      break;
    case 'overlay':
      modeValue = base < 0.5
        ? (2 * base * top)
        : (1 - 2 * (1 - base) * (1 - top));
      break;
    default:
      modeValue = top;
      break;
  }
  return clampNumber(lerpNumber(base, modeValue, opacity), 0, 1);
}

function normalizeComposedConstants(constants: ShaderConstants): ShaderConstants {
  const out = cloneConstants(constants);

  out.segments = Math.max(16, Math.round(out.segments));
  out.wireframeWidth = Math.max(0.1, out.wireframeWidth);
  out.intensity = clampNumber(out.intensity, 0, 2);
  out.speed = clampNumber(out.speed, 0, 5);
  out.contourLines = Math.round(clampNumber(out.contourLines, 4, 64));
  out.angle = clampNumber(out.angle, 0, 360);
  out.grain = clampNumber(out.grain, 0, 1);
  out.glow = clampNumber(out.glow, 0, 2);
  out.chromatic = clampNumber(out.chromatic, 0, 1);
  out.vignette = clampNumber(out.vignette, 0, 1);
  out.blur = clampNumber(out.blur, 0, 1);
  out.patternScale = clampNumber(out.patternScale, 0.25, 64);
  out.patternWeight = clampNumber(out.patternWeight, 0.01, 1);
  out.patternAlpha = clampNumber(out.patternAlpha, 0, 1);
  out.patternRotation = clampNumber(out.patternRotation, 0, TWO_PI);
  out.patternRepeatX = clampNumber(out.patternRepeatX, 0.01, 64);
  out.patternRepeatY = clampNumber(out.patternRepeatY, 0.01, 64);
  out.surfaceMode = Math.round(out.surfaceMode);
  out.reactivityMode = Math.round(out.reactivityMode);
  out.patternType = Math.round(out.patternType);
  out.patternMode = Math.round(out.patternMode);
  out.patternAnimate = out.patternAnimate >= 0.5 ? 1 : 0;

  out.primaryColor = clampColor(out.primaryColor);
  out.accentColor = clampColor(out.accentColor);
  out.backgroundColor = clampColor(out.backgroundColor);

  return out;
}

function clampColor(color: [number, number, number]): [number, number, number] {
  return [
    clampNumber(color[0], 0, 1),
    clampNumber(color[1], 0, 1),
    clampNumber(color[2], 0, 1),
  ];
}

function cloneConstants(constants: ShaderConstants): ShaderConstants {
  return {
    ...constants,
    primaryColor: [...constants.primaryColor] as [number, number, number],
    accentColor: [...constants.accentColor] as [number, number, number],
    backgroundColor: [...constants.backgroundColor] as [number, number, number],
  };
}

function mergeConfig(
  base: Partial<SMNTCConfig>,
  override: Partial<SMNTCConfig>,
): Partial<SMNTCConfig> {
  const merged: Partial<SMNTCConfig> = {
    ...base,
    ...override,
  };

  if (base.pattern || override.pattern) {
    merged.pattern = {
      ...(base.pattern ?? {}),
      ...(override.pattern ?? {}),
    };
  }

  return merged;
}

function lerpNumber(a: number, b: number, t: number): number {
  return a + ((b - a) * t);
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
