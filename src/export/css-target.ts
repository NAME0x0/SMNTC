import type { SMNTCConfig, PatternConfig, Surface, Vibe } from '../semantic/tokens';
import { resolveConstants, DEFAULTS } from '../semantic/dictionary';

export type ReduceMotionMode = 'freeze' | 'fade' | 'none';

export interface CssTargetOptions {
  className?: string;
  keyframesName?: string;
  idPrefix?: string;
  reduceMotion?: ReduceMotionMode;
}

export interface CssTargetResult {
  className: string;
  keyframesName: string;
  cssText: string;
  svgDefs: string;
}

interface FilterPack {
  svgDefs: string;
  filterStartId: string;
  filterMidId: string;
  filterEndId: string;
}

const DEFAULT_CLASS = 'smntc-css-target';
const DEFAULT_KEYFRAMES = 'smntc-css-anim';
const DEFAULT_ID_PREFIX = 'smntc-css';

export function compileCssTarget(
  config: Partial<SMNTCConfig> = {},
  options: CssTargetOptions = {},
): CssTargetResult {
  const constants = resolveConstants(config);
  const className = options.className ?? DEFAULT_CLASS;
  const keyframesName = options.keyframesName ?? DEFAULT_KEYFRAMES;
  const idPrefix = options.idPrefix ?? DEFAULT_ID_PREFIX;
  const reduceMotion = options.reduceMotion ?? 'freeze';

  const colors = {
    primary: rgbFrom(constants.primaryColor),
    accent: rgbFrom(constants.accentColor),
    background: rgbFrom(constants.backgroundColor),
  };

  const surface = config.surface ?? DEFAULTS.surface;
  const vibe = config.vibe ?? DEFAULTS.vibe;

  const duration = clamp(9000 / Math.max(0.2, constants.speed), 1800, 24000);
  const intensity = clamp(constants.intensity, 0, 2);
  const displacement = round(8 + intensity * 22, 2);

  const resolvedPattern: Required<PatternConfig> = {
    ...DEFAULTS.pattern,
    ...(config.pattern ?? {}),
  };
  const patternCss = buildPatternBackground(resolvedPattern, colors.accent, colors.primary);
  const surfaceCss = buildSurfaceBackground(surface, colors.background, colors.primary, constants.contourLines);

  const usesSvgFilter = usesFilterSurface(surface);
  const filters = usesSvgFilter
    ? buildSvgFilters(idPrefix, constants.noiseScale, displacement)
    : null;

  const filterParts: string[] = [];
  if (filters) {
    filterParts.push(`url(#${filters.filterStartId})`);
  }
  if (constants.blur > 0) {
    filterParts.push(`blur(${round(constants.blur * 6, 2)}px)`);
  }
  if (constants.glow > 0) {
    filterParts.push(`drop-shadow(0 0 ${round(constants.glow * 12, 2)}px ${rgbaFrom(colors.accent, 0.7)})`);
  }

  const extraFilterParts = filterParts.filter((part) => !part.startsWith('url('));
  const extraFilter = extraFilterParts.length > 0 ? extraFilterParts.join(' ') : '';

  const chroma = round(constants.chromatic * 6, 2);
  const textShadow = constants.chromatic > 0
    ? `${chroma}px 0 0 ${rgbaFrom(colors.accent, 0.7)}, -${chroma}px 0 0 ${rgbaFrom(colors.primary, 0.6)}`
    : 'none';

  const vignette = constants.vignette > 0
    ? `inset 0 0 ${round(constants.vignette * 80, 2)}px ${rgbaFrom(colors.background, 0.7)}`
    : 'none';

  const animationTiming = vibeToTiming(vibe);
  const animationFrames = buildKeyframes({
    keyframesName,
    surface,
    filters,
    displacement,
    intensity,
    patternAnimate: resolvedPattern.animate,
    extraFilter,
  });

  const baseBackground = [surfaceCss, patternCss].filter(Boolean).join(', ');
  const blendMode = patternCss ? patternBlendToCss(resolvedPattern.blend) : 'normal';
  const filterChain = filterParts.length > 0 ? filterParts.join(' ') : 'none';

  const cssText = [
    `.${className} {`,
    `  --smntc-primary: ${colors.primary};`,
    `  --smntc-accent: ${colors.accent};`,
    `  --smntc-background: ${colors.background};`,
    `  color: var(--smntc-primary);`,
    `  background-color: var(--smntc-background);`,
    baseBackground ? `  background-image: ${baseBackground};` : '',
    baseBackground ? `  background-blend-mode: ${blendMode};` : '',
    `  filter: ${filterChain};`,
    `  text-shadow: ${textShadow};`,
    `  box-shadow: ${vignette};`,
    `  animation: ${keyframesName} ${round(duration, 0)}ms ${animationTiming} infinite;`,
    `  will-change: filter, background-position, background-size, transform;`,
    `}`,
    animationFrames,
    buildReduceMotionBlock({
      className,
      reduceMotion,
      filters,
      fallbackFilter: filterChain,
    }),
  ].filter(Boolean).join('\n');

  return {
    className,
    keyframesName,
    cssText,
    svgDefs: filters?.svgDefs ?? '',
  };
}

function buildReduceMotionBlock(options: {
  className: string;
  reduceMotion: ReduceMotionMode;
  filters: FilterPack | null;
  fallbackFilter: string;
}): string {
  if (options.reduceMotion === 'none') {
    return '';
  }

  if (options.reduceMotion === 'fade') {
    return [
      '@media (prefers-reduced-motion: reduce) {',
      `  .${options.className} {`,
      `    animation: smntc-css-fade 6000ms ease-in-out infinite;`,
      `  }`,
      '}',
      '@keyframes smntc-css-fade {',
      `  0% { opacity: 0.85; }`,
      `  50% { opacity: 1; }`,
      `  100% { opacity: 0.85; }`,
      '}',
    ].join('\n');
  }

  const filterChain = options.filters
    ? `url(#${options.filters.filterMidId}) ${options.fallbackFilter.replace(/url\([^)]*\)/g, '').trim()}`.trim()
    : options.fallbackFilter;

  return [
    '@media (prefers-reduced-motion: reduce) {',
    `  .${options.className} {`,
    `    animation: none;`,
    filterChain ? `    filter: ${filterChain};` : '',
    `  }`,
    '}',
  ].filter(Boolean).join('\n');
}

function buildKeyframes(options: {
  keyframesName: string;
  surface: Surface;
  filters: FilterPack | null;
  displacement: number;
  intensity: number;
  patternAnimate: boolean;
  extraFilter: string;
}): string {
  const jitter = round(2 + options.intensity * 4, 2);
  const patternShift = options.patternAnimate ? round(18 + options.intensity * 20, 2) : 0;

  if (options.filters) {
    const extra = options.extraFilter ? ` ${options.extraFilter}` : '';
    return [
      `@keyframes ${options.keyframesName} {`,
      `  0% { filter: url(#${options.filters.filterStartId})${extra}; transform: translate3d(0, 0, 0); background-position: 0 0; }`,
      `  50% { filter: url(#${options.filters.filterMidId})${extra}; transform: translate3d(${jitter}px, -${jitter}px, 0); background-position: ${patternShift}px ${patternShift}px; }`,
      `  100% { filter: url(#${options.filters.filterEndId})${extra}; transform: translate3d(0, 0, 0); background-position: 0 0; }`,
      `}`,
    ].join('\n');
  }

  if (options.surface === 'topographic') {
    const sizeA = round(24 + options.displacement, 2);
    const sizeB = round(36 + options.displacement * 1.5, 2);
    return [
      `@keyframes ${options.keyframesName} {`,
      `  0% { background-size: ${sizeA}px ${sizeA}px; background-position: 0 0; }`,
      `  50% { background-size: ${sizeB}px ${sizeB}px; background-position: ${patternShift}px ${patternShift}px; }`,
      `  100% { background-size: ${sizeA}px ${sizeA}px; background-position: 0 0; }`,
      `}`,
    ].join('\n');
  }

  const shift = round(6 + options.intensity * 10, 2);
  return [
    `@keyframes ${options.keyframesName} {`,
    `  0% { transform: translate3d(0, 0, 0); background-position: 0 0; }`,
    `  50% { transform: translate3d(${shift}px, -${shift}px, 0); background-position: ${patternShift}px ${patternShift}px; }`,
    `  100% { transform: translate3d(0, 0, 0); background-position: 0 0; }`,
    `}`,
  ].join('\n');
}

function buildSurfaceBackground(
  surface: Surface,
  background: string,
  primary: string,
  contourLines: number,
): string {
  switch (surface) {
    case 'topographic':
      return `repeating-radial-gradient(circle at 50% 50%, ${primary} 0, ${primary} 1px, ${background} 2px, ${background} ${round(100 / contourLines, 2)}px)`;
    case 'crystalline':
      return `linear-gradient(135deg, ${primary} 0%, ${background} 55%, ${primary} 100%)`;
    case 'glitch':
      return `linear-gradient(90deg, ${background} 0%, ${primary} 45%, ${background} 55%, ${primary} 100%)`;
    default:
      return `radial-gradient(circle at 30% 30%, ${primary}, ${background} 70%)`;
  }
}

function buildPatternBackground(
  pattern: Required<PatternConfig>,
  accent: string,
  primary: string,
): string {
  if (!pattern || pattern.type === 'none' || pattern.type === 'custom') {
    return '';
  }

  const size = round(clamp(80 / pattern.scale, 6, 120), 2);
  const weight = round(clamp(pattern.weight * 12, 1, 12), 2);
  const alpha = clamp(pattern.opacity, 0, 1);
  const accentColor = rgbaFrom(accent, alpha);
  const primaryColor = rgbaFrom(primary, alpha * 0.6);

  switch (pattern.type) {
    case 'grid':
      return `repeating-linear-gradient(0deg, ${accentColor} 0, ${accentColor} ${weight}px, transparent ${weight}px, transparent ${size}px),` +
        ` repeating-linear-gradient(90deg, ${primaryColor} 0, ${primaryColor} ${weight}px, transparent ${weight}px, transparent ${size}px)`;
    case 'hexagon':
      return `linear-gradient(30deg, ${accentColor} 12%, transparent 12.5%, transparent 87%, ${accentColor} 87.5%, ${accentColor}),` +
        ` linear-gradient(150deg, ${accentColor} 12%, transparent 12.5%, transparent 87%, ${accentColor} 87.5%, ${accentColor}),` +
        ` linear-gradient(90deg, ${accentColor} 2%, transparent 2.5%, transparent 97%, ${accentColor} 97.5%, ${accentColor})`;
    case 'dots':
      return `radial-gradient(${accentColor} ${weight}px, transparent ${weight + 1}px)`;
    case 'voronoi':
      return `radial-gradient(circle at 20% 20%, ${accentColor}, transparent 60%),` +
        ` radial-gradient(circle at 80% 30%, ${primaryColor}, transparent 55%),` +
        ` radial-gradient(circle at 40% 80%, ${accentColor}, transparent 60%)`;
    case 'waves':
      return `repeating-linear-gradient(90deg, ${accentColor} 0, ${accentColor} ${weight}px, transparent ${weight}px, transparent ${size}px)`;
    case 'concentric':
      return `repeating-radial-gradient(circle at 50% 50%, ${accentColor} 0, ${accentColor} ${weight}px, transparent ${weight}px, transparent ${size}px)`;
    case 'noise':
      return `linear-gradient(45deg, ${accentColor} 0%, transparent 45%),` +
        ` linear-gradient(-45deg, ${primaryColor} 0%, transparent 45%)`;
    default:
      return '';
  }
}

function buildSvgFilters(idPrefix: string, noiseScale: number, displacement: number): FilterPack {
  const base = clamp(0.02 + noiseScale * 0.04, 0.01, 0.25);
  const delta = clamp(base * 0.6, 0.005, 0.12);

  const start = `${idPrefix}-wave-0`;
  const mid = `${idPrefix}-wave-50`;
  const end = `${idPrefix}-wave-100`;

  const svgDefs = [
    `<svg xmlns="http://www.w3.org/2000/svg" style="position:absolute;width:0;height:0;overflow:hidden">`,
    `  <defs>`,
    buildFilter(start, base - delta, displacement),
    buildFilter(mid, base, displacement * 0.85),
    buildFilter(end, base + delta, displacement),
    `  </defs>`,
    `</svg>`,
  ].join('\n');

  return {
    svgDefs,
    filterStartId: start,
    filterMidId: mid,
    filterEndId: end,
  };
}

function buildFilter(id: string, baseFrequency: number, displacement: number): string {
  const freq = round(baseFrequency, 4);
  return [
    `    <filter id="${id}" x="-20%" y="-20%" width="140%" height="140%" color-interpolation-filters="sRGB">`,
    `      <feTurbulence type="fractalNoise" baseFrequency="${freq}" numOctaves="2" seed="2" result="noise"/>`,
    `      <feDisplacementMap in="SourceGraphic" in2="noise" scale="${round(displacement, 2)}" xChannelSelector="R" yChannelSelector="G"/>`,
    `    </filter>`,
  ].join('\n');
}

function usesFilterSurface(surface: Surface): boolean {
  return surface === 'fluid' || surface === 'organic' || surface === 'wave' || surface === 'plasma' || surface === 'terrain';
}

function vibeToTiming(vibe: Vibe): string {
  switch (vibe) {
    case 'stable':
      return 'linear';
    case 'calm':
      return 'ease-in-out';
    case 'agitated':
      return 'ease-in-out';
    case 'chaotic':
      return 'steps(4)';
    case 'breathing':
      return 'ease-in-out';
    case 'pulse':
      return 'cubic-bezier(0.4, 0, 0.6, 1)';
    case 'drift':
      return 'ease-in-out';
    case 'storm':
      return 'steps(3)';
    case 'cinematic':
      return 'cubic-bezier(0.33, 1, 0.68, 1)';
    default:
      return 'ease-in-out';
  }
}

function patternBlendToCss(blend: PatternConfig['blend']): string {
  switch (blend) {
    case 'add':
      return 'screen';
    case 'multiply':
      return 'multiply';
    case 'screen':
      return 'screen';
    default:
      return 'normal';
  }
}

function rgbFrom(color: [number, number, number]): string {
  const r = Math.round(color[0] * 255);
  const g = Math.round(color[1] * 255);
  const b = Math.round(color[2] * 255);
  return `rgb(${r} ${g} ${b})`;
}

function rgbaFrom(rgb: string, alpha: number): string {
  const matches = rgb.match(/rgb\((\d+) (\d+) (\d+)\)/);
  if (!matches) {
    return `rgba(255, 255, 255, ${alpha})`;
  }
  const [, r, g, b] = matches;
  return `rgba(${r}, ${g}, ${b}, ${round(alpha, 2)})`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function round(value: number, digits: number): number {
  const factor = Math.pow(10, digits);
  return Math.round(value * factor) / factor;
}
