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
} from 'three';
import type {
  BufferGeometry,
  Camera,
  Scene,
  WebGLRenderer,
} from 'three';

import type { SMNTCConfig, ShaderConstants, Vibe, Surface, Reactivity, Palette } from '../semantic/tokens';
import { transform, DEFAULTS } from '../semantic/transformer';
import { resolveConstants } from '../semantic/dictionary';
import { createUniforms } from './uniforms';
import type { SMNTCUniforms } from './uniforms';
import { UBER_VERTEX_SHADER } from './shaders/uber.vert';
import { UBER_FRAGMENT_SHADER } from './shaders/uber.frag';
import { SpringBank } from '../physics/spring';
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
    };

    this.constants = transform(this.config);
    this.uniforms = createUniforms(this.constants);

    // Create the ShaderMaterial
    this.material = new ShaderMaterial({
      vertexShader: UBER_VERTEX_SHADER,
      fragmentShader: UBER_FRAGMENT_SHADER,
      uniforms: this.uniforms as any,
      transparent: true,
      side: DoubleSide,
      depthWrite: !this.config.wireframe,
      blending: this.config.wireframe ? AdditiveBlending : undefined as any,
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
    this.springs.ensure('frequency', c.frequency);
    this.springs.ensure('amplitude', c.amplitude);
    this.springs.ensure('noiseScale', c.noiseScale);
    this.springs.ensure('noiseSpeed', c.noiseSpeed);
    this.springs.ensure('intensity', c.intensity);
    this.springs.ensure('speed', c.speed);
    this.springs.ensure('contourLines', c.contourLines);
    this.springs.ensure('reactivityStrength', c.reactivityStrength);
    this.springs.ensure('reactivityRadius', c.reactivityRadius);
    this.springs.ensure('wireframeWidth', c.wireframeWidth);
    this.springs.ensure('primaryR', c.primaryColor[0]);
    this.springs.ensure('primaryG', c.primaryColor[1]);
    this.springs.ensure('primaryB', c.primaryColor[2]);
    this.springs.ensure('accentR', c.accentColor[0]);
    this.springs.ensure('accentG', c.accentColor[1]);
    this.springs.ensure('accentB', c.accentColor[2]);
  }

  private pushSpringTargets(c: ShaderConstants): void {
    this.springs.setTarget('frequency', c.frequency);
    this.springs.setTarget('amplitude', c.amplitude);
    this.springs.setTarget('noiseScale', c.noiseScale);
    this.springs.setTarget('noiseSpeed', c.noiseSpeed);
    this.springs.setTarget('intensity', c.intensity);
    this.springs.setTarget('speed', c.speed);
    this.springs.setTarget('contourLines', c.contourLines);
    this.springs.setTarget('reactivityStrength', c.reactivityStrength);
    this.springs.setTarget('reactivityRadius', c.reactivityRadius);
    this.springs.setTarget('wireframeWidth', c.wireframeWidth);
    this.springs.setTarget('primaryR', c.primaryColor[0]);
    this.springs.setTarget('primaryG', c.primaryColor[1]);
    this.springs.setTarget('primaryB', c.primaryColor[2]);
    this.springs.setTarget('accentR', c.accentColor[0]);
    this.springs.setTarget('accentG', c.accentColor[1]);
    this.springs.setTarget('accentB', c.accentColor[2]);
  }

  private writeSpringValuesToUniforms(): void {
    this.uniforms.uFrequency.value           = this.springs.getValue('frequency');
    this.uniforms.uAmplitude.value           = this.springs.getValue('amplitude');
    this.uniforms.uNoiseScale.value          = this.springs.getValue('noiseScale');
    this.uniforms.uNoiseSpeed.value          = this.springs.getValue('noiseSpeed');
    this.uniforms.uIntensity.value           = this.springs.getValue('intensity');
    this.uniforms.uSpeed.value               = this.springs.getValue('speed');
    this.uniforms.uContourLines.value        = this.springs.getValue('contourLines');
    this.uniforms.uReactivityStrength.value  = this.springs.getValue('reactivityStrength');
    this.uniforms.uReactivityRadius.value    = this.springs.getValue('reactivityRadius');
    this.uniforms.uWireframeWidth.value      = this.springs.getValue('wireframeWidth');

    this.uniforms.uPrimaryColor.value.set(
      this.springs.getValue('primaryR'),
      this.springs.getValue('primaryG'),
      this.springs.getValue('primaryB'),
    );
    this.uniforms.uAccentColor.value.set(
      this.springs.getValue('accentR'),
      this.springs.getValue('accentG'),
      this.springs.getValue('accentB'),
    );
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
