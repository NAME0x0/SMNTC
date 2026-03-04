// ============================================================================
// SMNTC — Industry Presets
// Curated configurations optimized for specific professional verticals.
// ============================================================================

import type { SMNTCConfigV2 } from './tokens';

/**
 * Professional industry presets for SMNTC v2.0.
 */
export const INDUSTRY_PRESETS: Record<string, SMNTCConfigV2> = {
  /**
   * SaaS / B2B: Clean, professional, minimal.
   * Focuses on stability and technical precision.
   */
  'saas-professional': {
    surface: 'topographic',
    vibe: 'stable',
    palette: 'monochrome',
    intensity: 0.6,
    speed: 0.8,
    pattern: {
      type: 'grid',
      scale: 5.0,
      opacity: 0.2,
      blend: 'screen'
    },
    glow: 0.2,
    vignette: 0.1
  },

  /**
   * Gaming / Entertainment: High energy, vibrant, immersive.
   * Leverages neon colors and chaotic motion.
   */
  'gaming-immersive': {
    surface: 'plasma',
    vibe: 'chaotic',
    palette: 'neon',
    intensity: 1.2,
    speed: 1.5,
    pattern: {
      type: 'noise',
      scale: 100.0,
      opacity: 0.15,
      blend: 'screen'
    },
    glow: 1.2,
    chromatic: 0.3,
    grain: 0.05
  },

  /**
   * Luxury / Fashion: Elegant, slow, sophisticated.
   * Emphasizes faceted beauty and slow breathing.
   */
  'luxury-elegant': {
    surface: 'crystalline',
    vibe: 'breathing',
    palette: 'gold',
    intensity: 0.8,
    speed: 0.4,
    pattern: {
      type: 'hexagon',
      scale: 2.0,
      opacity: 0.1,
      blend: 'add'
    },
    glow: 0.6,
    vignette: 0.4,
    blur: 0.2
  },

  /**
   * Healthcare / Wellness: Calming, organic, natural.
   * Soft, fluid movements with arctic palettes.
   */
  'wellness-organic': {
    surface: 'fluid',
    vibe: 'calm',
    palette: 'arctic',
    intensity: 0.7,
    speed: 0.6,
    pattern: {
      type: 'voronoi',
      scale: 3.0,
      opacity: 0.1,
      blend: 'screen'
    },
    blur: 0.3,
    vignette: 0.2
  },

  /**
   * Fintech / Banking: Trustworthy, stable, clean.
   * Cinematic sweeps with deep navy palettes.
   */
  'fintech-secure': {
    surface: 'wave',
    vibe: 'cinematic',
    palette: 'midnight',
    intensity: 0.9,
    speed: 0.5,
    pattern: {
      type: 'concentric',
      scale: 10.0,
      opacity: 0.2,
      blend: 'screen'
    },
    glow: 0.4,
    vignette: 0.3
  },

  /**
   * Creative Agency: Bold, dynamic, artistic.
   * High-contrast vaporwave look with agitated motion.
   */
  'creative-dynamic': {
    surface: 'organic',
    vibe: 'agitated',
    palette: 'vapor',
    intensity: 1.1,
    speed: 1.2,
    pattern: {
      type: 'dots',
      scale: 15.0,
      opacity: 0.3,
      blend: 'multiply'
    },
    chromatic: 0.2,
    glow: 0.8,
    grain: 0.08
  }
};

/**
 * Returns an industry preset by name.
 */
export function getIndustryPreset(name: keyof typeof INDUSTRY_PRESETS): SMNTCConfigV2 {
  return INDUSTRY_PRESETS[name] || INDUSTRY_PRESETS['saas-professional'];
}
