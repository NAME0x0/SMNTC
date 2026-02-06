// ============================================================================
// SMNTC — Semantic Token Type Definitions
// Semantic Engine for Motion, Animation, and Numerical Topographic
// Interactivity & Composition
// ============================================================================

/**
 * Surface identity — defines the visual structure of the mesh displacement.
 *
 * - `topographic`: Parallel contour lines (layered sine displacement).
 * - `crystalline`: Sharp, faceted vertex clustering (Voronoi noise).
 * - `fluid`: Organic, continuous surface displacement (Simplex noise).
 * - `glitch`: Step-function displacement with randomized UV-shifting.
 */
export type Surface = 'topographic' | 'crystalline' | 'fluid' | 'glitch';

/**
 * Kinetic vibe — defines the motion physics and frequency character.
 *
 * - `stable`: Near-static; subtle breathing (ω ≈ 0.1).
 * - `calm`: Slow, rhythmic oscillation (ω ≈ 0.5).
 * - `agitated`: High-frequency, erratic shifts (ω ≈ 2.5).
 * - `chaotic`: Stochastic vertex bursts; zero damping (ω ≈ 5.0+).
 */
export type Vibe = 'stable' | 'calm' | 'agitated' | 'chaotic';

/**
 * Interaction model — defines how the surface responds to external stimuli.
 *
 * - `static`: No response to external inputs.
 * - `magnetic`: Surface pulls toward the cursor.
 * - `repel`: Surface pushes away from the cursor.
 * - `shockwave`: Click events trigger a radial ripple.
 */
export type Reactivity = 'static' | 'magnetic' | 'repel' | 'shockwave';

/**
 * Visual fidelity — controls vertex density and rendering quality.
 *
 * - `low`: 64×64 segments; suitable for mobile/low-power.
 * - `medium`: 128×128 segments; balanced default.
 * - `high`: 256×256 segments; desktop-quality.
 * - `ultra`: 512×512 segments; presentation-grade.
 */
export type Fidelity = 'low' | 'medium' | 'high' | 'ultra';

/**
 * Color palette preset — defines the chromatic identity.
 *
 * - `monochrome`: Classic white-on-black tech aesthetic.
 * - `ember`: Warm orange/amber tones.
 * - `arctic`: Cool blue/white tones.
 * - `neon`: High-contrast cyberpunk greens and magentas.
 * - `phantom`: Muted grey-purple stealth aesthetic.
 */
export type Palette = 'monochrome' | 'ember' | 'arctic' | 'neon' | 'phantom';

/**
 * The complete SMNTC configuration token set.
 * This is the primary input interface for both human developers and LLMs.
 */
export interface SMNTCConfig {
  /** Visual structure of the mesh displacement. Default: `'topographic'` */
  surface?: Surface;

  /** Motion physics and frequency character. Default: `'calm'` */
  vibe?: Vibe;

  /** How the surface responds to external stimuli. Default: `'static'` */
  reactivity?: Reactivity;

  /** Rendering quality / vertex density. Default: `'medium'` */
  fidelity?: Fidelity;

  /** Color palette preset. Default: `'monochrome'` */
  palette?: Palette;

  /** Whether to render as wireframe. Default: `true` */
  wireframe?: boolean;

  /** Global amplitude multiplier. Range: [0, 2]. Default: `1.0` */
  intensity?: number;

  /** Global speed multiplier. Range: [0, 5]. Default: `1.0` */
  speed?: number;

  /** Contour line count (topographic mode only). Range: [4, 64]. Default: `16` */
  contourLines?: number;

  /** Whether to auto-pause when the tab is hidden. Default: `true` */
  thermalGuard?: boolean;
}

/**
 * Resolved internal constants that the shader consumes.
 * Produced by the Semantic Transformer from a `SMNTCConfig`.
 */
export interface ShaderConstants {
  // -- Surface --
  surfaceMode: number; // 0=topographic, 1=crystalline, 2=fluid, 3=glitch

  // -- Vibe --
  frequency: number;
  amplitude: number;
  damping: number;
  noiseScale: number;
  noiseSpeed: number;

  // -- Reactivity --
  reactivityMode: number; // 0=static, 1=magnetic, 2=repel, 3=shockwave
  reactivityStrength: number;
  reactivityRadius: number;

  // -- Fidelity --
  segments: number;
  wireframeWidth: number;

  // -- Palette --
  primaryColor: [number, number, number];
  accentColor: [number, number, number];
  backgroundColor: [number, number, number];

  // -- General --
  wireframe: boolean;
  intensity: number;
  speed: number;
  contourLines: number;
}

/**
 * Internal uniform value that the spring solver interpolates.
 */
export interface SpringState {
  value: number;
  velocity: number;
  target: number;
}
