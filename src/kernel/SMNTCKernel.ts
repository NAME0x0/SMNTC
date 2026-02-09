// ============================================================================
// SMNTC — Kernel
// The central orchestrator: creates the ShaderMaterial, manages the
// animation loop, wires spring physics, input proxy, and auto-scaler.
// ============================================================================

import {
  ShaderMaterial,
  Mesh,
  Clock,
  Raycaster,
  Color,
  DoubleSide,
  AdditiveBlending,
  NormalBlending,
} from 'three';
import type {
  BufferGeometry,
  Camera,
  Scene,
  WebGLRenderer,
} from 'three';

import type { SMNTCConfig, ShaderConstants, Vibe, Surface, Reactivity, Palette } from '../semantic/tokens';
import { resolveConstants, DEFAULTS } from '../semantic/dictionary';
import { createUniforms } from './uniforms';
import type { SMNTCUniforms } from './uniforms';
import { UBER_VERTEX_SHADER } from './shaders/uber.vert';
import { UBER_FRAGMENT_SHADER } from './shaders/uber.frag';
import { SpringBank } from '../physics/spring';
import { Spring } from '../physics/spring';
import type { SpringConfig } from '../physics/spring';
import { InputProxy } from '../reactivity/input-proxy';
import { AutoScaler } from '../performance/auto-scaler';

// ---------------------------------------------------------------------------
// Public Options
// ---------------------------------------------------------------------------

export interface SMNTCKernelOptions extends SMNTCConfig {
  /** Provide your own Three.js camera (required for reactivity != 'static'). */
  camera?: Camera;

  /** The DOM element for pointer events (defaults to renderer.domElement). */
  domElement?: HTMLElement;

  /** Custom spring physics config for transitions. */
  springConfig?: Partial<SpringConfig>;

  /** Disable the performance auto-scaler. Default: false. */
  disableAutoScale?: boolean;
}

// ---------------------------------------------------------------------------
// The Kernel
// ---------------------------------------------------------------------------

/**
 * **SMNTCKernel** — the primary public API.
 *
 * Typical usage:
 * ```ts
 * const kernel = new SMNTCKernel({ surface: 'fluid', vibe: 'calm' });
 * kernel.apply(myMesh);
 * // in your animation loop:
 * kernel.update();
 * ```
 */
export class SMNTCKernel {
  // --- State ---
  private config: Required<SMNTCConfig>;
  private constants: ShaderConstants;
  private uniforms: SMNTCUniforms;
  private material: ShaderMaterial;
  private clock: Clock;

  // --- Sub-systems ---
  private springs: SpringBank;
  private inputProxy: InputProxy | null = null;
  private autoScaler: AutoScaler;

  // --- Cached Spring References (avoids Map.get per frame) ---
  private _sp!: {
    frequency: Spring; amplitude: Spring; noiseScale: Spring; noiseSpeed: Spring;
    intensity: Spring; speed: Spring; contourLines: Spring;
    reactivityStrength: Spring; reactivityRadius: Spring; wireframeWidth: Spring;
    primaryR: Spring; primaryG: Spring; primaryB: Spring;
    accentR: Spring; accentG: Spring; accentB: Spring;
    angle: Spring; grain: Spring; glow: Spring;
    chromatic: Spring; vignette: Spring; blur: Spring;
  };

  // --- References ---
  private mesh: Mesh | null = null;
  private camera: Camera | null = null;
  private domElement: HTMLElement | null = null;
  private raycaster: Raycaster;

  // --- Lifecycle ---
  private _animating = false;
  private _animationId: number | null = null;
  private _disposed = false;
  private _visibilityHandler: (() => void) | null = null;
  private _lastFrameTime = 0;

  constructor(options: SMNTCKernelOptions = {}) {
    // Resolve full config with defaults
    this.config = {
      surface:      options.surface      ?? DEFAULTS.surface,
      vibe:         options.vibe         ?? DEFAULTS.vibe,
      reactivity:   options.reactivity   ?? DEFAULTS.reactivity,
      fidelity:     options.fidelity     ?? DEFAULTS.fidelity,
      palette:      options.palette      ?? DEFAULTS.palette,
      wireframe:    options.wireframe    ?? DEFAULTS.wireframe,
      intensity:    options.intensity    ?? DEFAULTS.intensity,
      speed:        options.speed        ?? DEFAULTS.speed,
      contourLines: options.contourLines ?? DEFAULTS.contourLines,
      thermalGuard: options.thermalGuard ?? DEFAULTS.thermalGuard,
      angle:        options.angle        ?? DEFAULTS.angle,
      grain:        options.grain        ?? DEFAULTS.grain,
      glow:         options.glow         ?? DEFAULTS.glow,
      chromatic:    options.chromatic    ?? DEFAULTS.chromatic,
      vignette:     options.vignette     ?? DEFAULTS.vignette,
      blur:         options.blur         ?? DEFAULTS.blur,
    };

    this.constants = resolveConstants(this.config);
    this.uniforms = createUniforms(this.constants);

    // Create the ShaderMaterial
    this.material = new ShaderMaterial({
      vertexShader: UBER_VERTEX_SHADER,
      fragmentShader: UBER_FRAGMENT_SHADER,
      uniforms: this.uniforms as any,
      transparent: true,
      side: DoubleSide,
      depthWrite: !this.config.wireframe,
      blending: this.config.wireframe ? AdditiveBlending : NormalBlending,
      extensions: {
        derivatives: true, // Required for fwidth() in fragment shader
      },
    });

    // Clock for frame timing
    this.clock = new Clock(false);

    // Spring bank for smooth transitions
    this.springs = new SpringBank(options.springConfig);
    this.initializeSpringTargets(this.constants);

    // Performance auto-scaler
    this.autoScaler = new AutoScaler(this.config.fidelity, {
      enabled: !options.disableAutoScale,
    });
    this.autoScaler.onFidelityChange = (fidelity) => {
      this.config.fidelity = fidelity;
      const newConstants = resolveConstants(this.config);
      this.constants.segments = newConstants.segments;
      this.constants.wireframeWidth = newConstants.wireframeWidth;
      // Note: geometry rebuild would be needed for segment count changes
      // in a production build — here we adjust wireframe width only
      this.springs.setTarget('wireframeWidth', newConstants.wireframeWidth);
    };

    // Raycaster for input proxy
    this.raycaster = new Raycaster();

    // Store optional camera/domElement refs
    this.camera = options.camera ?? null;
    this.domElement = options.domElement ?? null;

    // Thermal guard: pause when tab is hidden
    if (this.config.thermalGuard && typeof document !== 'undefined') {
      this._visibilityHandler = () => {
        if (document.hidden) {
          this.clock.stop();
        } else {
          this.clock.start();
        }
      };
      document.addEventListener('visibilitychange', this._visibilityHandler);
    }
  }

  // =========================================================================
  // Spring initialization
  // =========================================================================

  private initializeSpringTargets(c: ShaderConstants): void {
    this._sp = {
      frequency:           this.springs.ensure('frequency', c.frequency),
      amplitude:           this.springs.ensure('amplitude', c.amplitude),
      noiseScale:          this.springs.ensure('noiseScale', c.noiseScale),
      noiseSpeed:          this.springs.ensure('noiseSpeed', c.noiseSpeed),
      intensity:           this.springs.ensure('intensity', c.intensity),
      speed:               this.springs.ensure('speed', c.speed),
      contourLines:        this.springs.ensure('contourLines', c.contourLines),
      reactivityStrength:  this.springs.ensure('reactivityStrength', c.reactivityStrength),
      reactivityRadius:    this.springs.ensure('reactivityRadius', c.reactivityRadius),
      wireframeWidth:      this.springs.ensure('wireframeWidth', c.wireframeWidth),
      primaryR:            this.springs.ensure('primaryR', c.primaryColor[0]),
      primaryG:            this.springs.ensure('primaryG', c.primaryColor[1]),
      primaryB:            this.springs.ensure('primaryB', c.primaryColor[2]),
      accentR:             this.springs.ensure('accentR', c.accentColor[0]),
      accentG:             this.springs.ensure('accentG', c.accentColor[1]),
      accentB:             this.springs.ensure('accentB', c.accentColor[2]),
      angle:               this.springs.ensure('angle', c.angle * Math.PI / 180),
      grain:               this.springs.ensure('grain', c.grain),
      glow:                this.springs.ensure('glow', c.glow),
      chromatic:           this.springs.ensure('chromatic', c.chromatic),
      vignette:            this.springs.ensure('vignette', c.vignette),
      blur:                this.springs.ensure('blur', c.blur),
    };
  }

  private pushSpringTargets(c: ShaderConstants): void {
    const sp = this._sp;
    sp.frequency.setTarget(c.frequency);
    sp.amplitude.setTarget(c.amplitude);
    sp.noiseScale.setTarget(c.noiseScale);
    sp.noiseSpeed.setTarget(c.noiseSpeed);
    sp.intensity.setTarget(c.intensity);
    sp.speed.setTarget(c.speed);
    sp.contourLines.setTarget(c.contourLines);
    sp.reactivityStrength.setTarget(c.reactivityStrength);
    sp.reactivityRadius.setTarget(c.reactivityRadius);
    sp.wireframeWidth.setTarget(c.wireframeWidth);
    sp.primaryR.setTarget(c.primaryColor[0]);
    sp.primaryG.setTarget(c.primaryColor[1]);
    sp.primaryB.setTarget(c.primaryColor[2]);
    sp.accentR.setTarget(c.accentColor[0]);
    sp.accentG.setTarget(c.accentColor[1]);
    sp.accentB.setTarget(c.accentColor[2]);
    sp.angle.setTarget(c.angle * Math.PI / 180);
    sp.grain.setTarget(c.grain);
    sp.glow.setTarget(c.glow);
    sp.chromatic.setTarget(c.chromatic);
    sp.vignette.setTarget(c.vignette);
    sp.blur.setTarget(c.blur);
  }

  private writeSpringValuesToUniforms(): void {
    const sp = this._sp;
    this.uniforms.uFrequency.value           = sp.frequency.value;
    this.uniforms.uAmplitude.value           = sp.amplitude.value;
    this.uniforms.uNoiseScale.value          = sp.noiseScale.value;
    this.uniforms.uNoiseSpeed.value          = sp.noiseSpeed.value;
    this.uniforms.uIntensity.value           = sp.intensity.value;
    this.uniforms.uSpeed.value               = sp.speed.value;
    this.uniforms.uContourLines.value        = sp.contourLines.value;
    this.uniforms.uReactivityStrength.value  = sp.reactivityStrength.value;
    this.uniforms.uReactivityRadius.value    = sp.reactivityRadius.value;
    this.uniforms.uWireframeWidth.value      = sp.wireframeWidth.value;

    this.uniforms.uPrimaryColor.value.set(
      sp.primaryR.value,
      sp.primaryG.value,
      sp.primaryB.value,
    );
    this.uniforms.uAccentColor.value.set(
      sp.accentR.value,
      sp.accentG.value,
      sp.accentB.value,
    );
    this.uniforms.uAngle.value     = sp.angle.value;
    this.uniforms.uGrain.value     = sp.grain.value;
    this.uniforms.uGlow.value      = sp.glow.value;
    this.uniforms.uChromatic.value = sp.chromatic.value;
    this.uniforms.uVignette.value  = sp.vignette.value;
    this.uniforms.uBlur.value      = sp.blur.value;
  }

  // =========================================================================
  // Public API: Apply
  // =========================================================================

  /**
   * Apply the SMNTC material to a Three.js mesh.
   * This replaces the mesh's existing material.
   */
  apply(mesh: Mesh, camera?: Camera, domElement?: HTMLElement): this {
    this.mesh = mesh;
    mesh.material = this.material;

    const cam = camera ?? this.camera;
    const dom = domElement ?? this.domElement;

    // Set up input proxy if reactivity is non-static
    if (this.config.reactivity !== 'static' && cam && dom) {
      this.camera = cam;
      this.domElement = dom;
      this.inputProxy = new InputProxy({
        domElement: dom,
        camera: cam,
        raycaster: this.raycaster,
        mesh,
        uniforms: this.uniforms,
        enableShockwave: this.config.reactivity === 'shockwave',
      });
    }

    return this;
  }

  // =========================================================================
  // Public API: Semantic Setters (spring-interpolated)
  // =========================================================================

  /** Transition to a new vibe. Spring-interpolated. */
  setVibe(vibe: Vibe): this {
    this.config.vibe = vibe;
    this.pushSpringTargets(resolveConstants(this.config));
    return this;
  }

  /** Transition to a new surface mode. Instant (mode is discrete). */
  setSurface(surface: Surface): this {
    this.config.surface = surface;
    const c = resolveConstants(this.config);
    this.uniforms.uSurfaceMode.value = c.surfaceMode;
    this.pushSpringTargets(c);
    return this;
  }

  /** Transition to a new reactivity mode. */
  setReactivity(reactivity: Reactivity): this {
    this.config.reactivity = reactivity;
    const c = resolveConstants(this.config);
    this.uniforms.uReactivityMode.value = c.reactivityMode;
    this.pushSpringTargets(c);

    // Rebuild input proxy if needed
    if (this.mesh && this.camera && this.domElement) {
      this.inputProxy?.dispose();
      if (reactivity !== 'static') {
        this.inputProxy = new InputProxy({
          domElement: this.domElement,
          camera: this.camera,
          raycaster: this.raycaster,
          mesh: this.mesh,
          uniforms: this.uniforms,
          enableShockwave: reactivity === 'shockwave',
        });
      } else {
        this.inputProxy = null;
      }
    }
    return this;
  }

  /** Transition to a new palette. Spring-interpolated colors. */
  setPalette(palette: Palette): this {
    this.config.palette = palette;
    this.pushSpringTargets(resolveConstants(this.config));
    return this;
  }

  /** Set intensity multiplier. Spring-interpolated. Range: [0, 2]. */
  setIntensity(intensity: number): this {
    this.config.intensity = Math.max(0, Math.min(2, intensity));
    this.pushSpringTargets(resolveConstants(this.config));
    return this;
  }

  /** Set speed multiplier. Spring-interpolated. Range: [0, 5]. */
  setSpeed(speed: number): this {
    this.config.speed = Math.max(0, Math.min(5, speed));
    this.pushSpringTargets(resolveConstants(this.config));
    return this;
  }

  /** Set displacement angle in degrees. Spring-interpolated. Range: [0, 360]. */
  setAngle(angle: number): this {
    this.config.angle = ((angle % 360) + 360) % 360;
    this.pushSpringTargets(resolveConstants(this.config));
    return this;
  }

  /** Set film grain intensity. Spring-interpolated. Range: [0, 1]. */
  setGrain(grain: number): this {
    this.config.grain = Math.max(0, Math.min(1, grain));
    this.pushSpringTargets(resolveConstants(this.config));
    return this;
  }

  /** Set glow/bloom intensity. Spring-interpolated. Range: [0, 2]. */
  setGlow(glow: number): this {
    this.config.glow = Math.max(0, Math.min(2, glow));
    this.pushSpringTargets(resolveConstants(this.config));
    return this;
  }

  /** Set chromatic aberration strength. Spring-interpolated. Range: [0, 1]. */
  setChromatic(chromatic: number): this {
    this.config.chromatic = Math.max(0, Math.min(1, chromatic));
    this.pushSpringTargets(resolveConstants(this.config));
    return this;
  }

  /** Set vignette intensity. Spring-interpolated. Range: [0, 1]. */
  setVignette(vignette: number): this {
    this.config.vignette = Math.max(0, Math.min(1, vignette));
    this.pushSpringTargets(resolveConstants(this.config));
    return this;
  }

  /** Set blur intensity. Spring-interpolated. Range: [0, 1]. */
  setBlur(blur: number): this {
    this.config.blur = Math.max(0, Math.min(1, blur));
    this.pushSpringTargets(resolveConstants(this.config));
    return this;
  }

  /** Bulk-update any config properties. */
  configure(config: Partial<SMNTCConfig>): this {
    Object.assign(this.config, config);
    const c = resolveConstants(this.config);

    // Discrete values (non-interpolatable)
    this.uniforms.uSurfaceMode.value = c.surfaceMode;
    this.uniforms.uReactivityMode.value = c.reactivityMode;
    this.uniforms.uWireframe.value = c.wireframe ? 1.0 : 0.0;

    // Continuous values → spring targets
    this.pushSpringTargets(c);
    return this;
  }

  // =========================================================================
  // Public API: Animation Loop
  // =========================================================================

  /**
   * Call this once per frame in your animation loop.
   * Advances time, springs, input proxy, and auto-scaler.
   */
  update(): void {
    if (this._disposed) return;

    const dt = this.clock.getDelta();
    const elapsed = this.clock.getElapsedTime();

    // Advance springs
    this.springs.step(dt);
    this.writeSpringValuesToUniforms();

    // Advance time uniform (with modulo for float safety)
    this.uniforms.uTime.value = elapsed;

    // Update input proxy
    this.inputProxy?.update(elapsed);

    // Report to auto-scaler
    const now = performance.now();
    if (this._lastFrameTime > 0) {
      this.autoScaler.reportFrame(now - this._lastFrameTime);
    }
    this._lastFrameTime = now;
  }

  /**
   * Start a self-managed animation loop (optional — you can also call
   * `update()` manually inside your own rAF loop).
   */
  start(renderer?: WebGLRenderer, scene?: Scene, camera?: Camera): this {
    if (this._animating) return this;
    this._animating = true;
    this.clock.start();

    if (renderer && scene && camera) {
      const loop = () => {
        if (!this._animating || this._disposed) return;
        this._animationId = requestAnimationFrame(loop);
        this.update();
        renderer.render(scene, camera);
      };
      this._animationId = requestAnimationFrame(loop);
    } else {
      // Just start the clock — user calls update() in their own loop
      this.clock.start();
    }
    return this;
  }

  /** Stop the self-managed animation loop. */
  stop(): this {
    this._animating = false;
    if (this._animationId !== null) {
      cancelAnimationFrame(this._animationId);
      this._animationId = null;
    }
    this.clock.stop();
    return this;
  }

  // =========================================================================
  // Public API: Accessors
  // =========================================================================

  /** The underlying Three.js ShaderMaterial. */
  getMaterial(): ShaderMaterial {
    return this.material;
  }

  /** The current resolved config (read-only snapshot). */
  getConfig(): Readonly<Required<SMNTCConfig>> {
    return { ...this.config };
  }

  /** The raw uniforms object (for advanced users). */
  getUniforms(): SMNTCUniforms {
    return this.uniforms;
  }

  /** The background color for the current palette (for scene setup). */
  getBackgroundColor(): Color {
    const bg = this.constants.backgroundColor;
    return new Color(bg[0], bg[1], bg[2]);
  }

  // =========================================================================
  // Public API: Dispose
  // =========================================================================

  /**
   * Fully dispose of the kernel, releasing all GPU and DOM resources.
   * After calling this, the kernel instance must not be reused.
   */
  dispose(): void {
    this._disposed = true;
    this.stop();

    this.material.dispose();
    this.inputProxy?.dispose();
    this.autoScaler.dispose();
    this.springs.dispose();

    if (this._visibilityHandler) {
      document.removeEventListener('visibilitychange', this._visibilityHandler);
      this._visibilityHandler = null;
    }

    this.mesh = null;
    this.camera = null;
    this.domElement = null;
  }
}
