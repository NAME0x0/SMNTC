// ============================================================================
// SMNTC — Pattern Presets
// A curated library of ready-to-use pattern configurations for SMNTC v2.
// ============================================================================

export interface PatternConfig {
  type: 'grid' | 'hexagon' | 'dots' | 'voronoi' | 'waves' | 'concentric' | 'noise' | 'custom';
  scale?: number;
  lineWidth?: number;
  radius?: number;
  animate?: boolean;
  opacity?: number;
  blend?: 'normal' | 'add' | 'multiply' | 'screen' | 'overlay';
}

/**
 * Curated pattern presets for the SMNTC engine.
 */
export const PATTERN_PRESETS: Record<string, PatternConfig> = {
  /** Technical blueprint-style grid */
  'blueprint-grid': {
    type: 'grid',
    scale: 10.0,
    lineWidth: 0.5,
    opacity: 0.3,
    blend: 'screen'
  },

  /** High-tech hexagonal honeycomb */
  'honeycomb': {
    type: 'hexagon',
    scale: 5.0,
    lineWidth: 0.8,
    opacity: 0.4,
    blend: 'add'
  },

  /** Retro dot-matrix display */
  'dot-matrix': {
    type: 'dots',
    scale: 20.0,
    radius: 0.3,
    opacity: 0.6,
    blend: 'multiply'
  },

  /** Biological cell-like structure */
  'organic-cells': {
    type: 'voronoi',
    scale: 3.0,
    lineWidth: 1.0,
    opacity: 0.25,
    blend: 'overlay'
  },

  /** Scanning CRT-style horizontal waves */
  'scan-lines': {
    type: 'waves',
    scale: 50.0,
    animate: true,
    opacity: 0.15,
    blend: 'normal'
  },

  /** Radar or sonar style concentric circles */
  'sonar': {
    type: 'concentric',
    scale: 15.0,
    opacity: 0.4,
    blend: 'screen'
  },

  /** Fine digital grain / static */
  'digital-noise': {
    type: 'noise',
    scale: 100.0,
    opacity: 0.1,
    blend: 'overlay'
  },

  /** Heavy industrial wireframe */
  'tech-wireframe': {
    type: 'grid',
    scale: 2.0,
    lineWidth: 2.0,
    opacity: 0.8,
    blend: 'add'
  }
};

/**
 * Returns a pattern configuration by its preset name.
 */
export function getPatternPreset(name: keyof typeof PATTERN_PRESETS): PatternConfig {
  return PATTERN_PRESETS[name] || PATTERN_PRESETS['blueprint-grid'];
}
