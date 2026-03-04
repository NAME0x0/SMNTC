// ============================================================================
// SMNTC — SMNTCMaterial
// ShaderMaterial subclass that encapsulates SMNTC semantic configuration.
// ============================================================================

import {
  ShaderMaterial,
  Clock,
  Raycaster,
  Color,
  DoubleSide,
  AdditiveBlending,
  NormalBlending,
  Mesh,
} from 'three';
import type { BufferGeometry, Camera } from 'three';

import type { Fidelity, LayerConfig, SMNTCConfig, ShaderConstants, Vibe, Surface, Reactivity, Palette } from '../semantic/tokens';
import { resolveConstants, DEFAULTS } from '../semantic/dictionary';
import { composeLayerConstants } from '../layer/compositor';
import { buildLodGeometries, getGeometryVertexCount } from '../mesh';
import { createUniforms } from '../kernel/uniforms';
import type { SMNTCUniforms } from '../kernel/uniforms';
import { UBER_VERTEX_SHADER } from '../kernel/shaders/uber.vert';
import { UBER_FRAGMENT_SHADER } from '../kernel/shaders/uber.frag';
import { SpringBank, Spring } from '../physics/spring';
import type { SpringConfig } from '../physics/spring';
import { InputProxy } from '../reactivity/input-proxy';
import { AutoScaler } from '../performance/auto-scaler';

const FIDELITY_TARGET_RATIOS: Record<Fidelity, number> = {
  ultra: 1.0,
  high: 0.7,
  medium: 0.4,
  low: 0.2,
};

const LOD_LEVEL_COUNT = 4;

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export interface SMNTCMaterialOptions extends SMNTCConfig {
  layers?: LayerConfig[];
  camera?: Camera;
  domElement?: HTMLElement;
  springConfig?: Partial<SpringConfig>;
  disableAutoScale?: boolean;
}

function cloneLayerConfigs(layers: readonly LayerConfig[] | null | undefined): LayerConfig[] {
  if (!layers || layers.length === 0) {
    return [];
  }

  return layers.map((layer) => {
    const animation = layer.animation
      ? {
          ...layer.animation,
          pattern: layer.animation.pattern
            ? { ...layer.animation.pattern }
            : undefined,
        }
      : undefined;

    return {
      ...layer,
      animation,
    };
  });
}

// ---------------------------------------------------------------------------
// SMNTCMaterial
// ---------------------------------------------------------------------------

export class SMNTCMaterial extends ShaderMaterial {
  private config: Required<SMNTCConfig>;
  private constants: ShaderConstants;
  private smntcUniforms: SMNTCUniforms;
  private clock: Clock;

  private springs: SpringBank;
  private inputProxy: InputProxy | null = null;
  private autoScaler: AutoScaler;

  private _sp!: {
    frequency: Spring; amplitude: Spring; noiseScale: Spring; noiseSpeed: Spring;
    intensity: Spring; speed: Spring; contourLines: Spring;
    reactivityStrength: Spring; reactivityRadius: Spring; wireframeWidth: Spring;
    primaryR: Spring; primaryG: Spring; primaryB: Spring;
    accentR: Spring; accentG: Spring; accentB: Spring;
    angle: Spring; grain: Spring; glow: Spring;
    chromatic: Spring; vignette: Spring; blur: Spring;
  };

  private mesh: Mesh | null = null;
  private camera: Camera | null = null;
  private domElement: HTMLElement | null = null;
  private raycaster: Raycaster;
  private layers: LayerConfig[] = [];

  private lodBaseGeometry: BufferGeometry | null = null;
  private lodGeometries: BufferGeometry[] = [];
  private lodVertexCounts: number[] = [];
  private generatedLodGeometries: BufferGeometry[] = [];
  private shaderVariantKey = '';

  private _disposed = false;
  private _lastFrameTime = 0;

  constructor(options: SMNTCMaterialOptions = {}) {
    const config: Required<SMNTCConfig> = {
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
      pattern: {
        ...DEFAULTS.pattern,
        ...(options.pattern ?? {}),
      },
    };
    const layers = cloneLayerConfigs(options.layers);

    const constants = layers.length === 0
      ? resolveConstants(config)
      : composeLayerConstants(config, layers);
    const uniforms = createUniforms(constants);

    super({
      vertexShader: UBER_VERTEX_SHADER,
      fragmentShader: UBER_FRAGMENT_SHADER,
      uniforms: uniforms as any,
      transparent: true,
      side: DoubleSide,
      depthWrite: !config.wireframe,
      blending: config.wireframe ? AdditiveBlending : NormalBlending,
      extensions: {
        derivatives: true,
      },
    });

    this.config = config;
    this.layers = layers;
    this.constants = constants;
    this.smntcUniforms = uniforms;
    this.clock = new Clock(false);
    this.applyShaderVariant(constants);

    this.springs = new SpringBank(options.springConfig);
    this.initializeSpringTargets(constants);
    this.writePatternUniforms(constants);

    this.autoScaler = new AutoScaler(this.config.fidelity, {
      enabled: !options.disableAutoScale,
    });
    this.autoScaler.onFidelityChange = (fidelity) => {
      this.config.fidelity = fidelity;
      const newConstants = this.resolveActiveConstants(this.config, this.layers);
      this.constants.segments = newConstants.segments;
      this.constants.wireframeWidth = newConstants.wireframeWidth;
      this.springs.setTarget('wireframeWidth', newConstants.wireframeWidth);
      this.applyCurrentFidelityGeometry();
    };

    this.raycaster = new Raycaster();
    this.camera = options.camera ?? null;
    this.domElement = options.domElement ?? null;
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
      angle:               this.springs.ensure('angle', c.angle),
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
    sp.angle.setTarget(c.angle);
    sp.grain.setTarget(c.grain);
    sp.glow.setTarget(c.glow);
    sp.chromatic.setTarget(c.chromatic);
    sp.vignette.setTarget(c.vignette);
    sp.blur.setTarget(c.blur);
    this.applyShaderVariant(c);
  }

  private resolveShaderVariantDefines(c: ShaderConstants): Record<string, number> {
    const patternEnabled = c.patternType > 0 && c.patternAlpha > 0.001 ? 1 : 0;
    const postFxEnabled = (
      c.grain > 0.001
      || c.glow > 0.01
      || c.chromatic > 0.001
      || c.vignette > 0.001
      || c.blur > 0.001
    ) ? 1 : 0;

    return {
      SMNTC_ENABLE_PATTERN: patternEnabled,
      SMNTC_ENABLE_POSTFX: postFxEnabled,
    };
  }

  private applyShaderVariant(c: ShaderConstants): void {
    const defines = this.resolveShaderVariantDefines(c);
    const nextKey = `${defines.SMNTC_ENABLE_PATTERN}|${defines.SMNTC_ENABLE_POSTFX}`;
    if (nextKey === this.shaderVariantKey) {
      return;
    }

    this.shaderVariantKey = nextKey;
    this.defines = {
      ...(this.defines ?? {}),
      ...defines,
    };
    this.needsUpdate = true;
  }

  private writeSpringValuesToUniforms(): void {
    const sp = this._sp;
    this.smntcUniforms.uFrequency.value           = sp.frequency.value;
    this.smntcUniforms.uAmplitude.value           = sp.amplitude.value;
    this.smntcUniforms.uNoiseScale.value          = sp.noiseScale.value;
    this.smntcUniforms.uNoiseSpeed.value          = sp.noiseSpeed.value;
    this.smntcUniforms.uIntensity.value           = sp.intensity.value;
    this.smntcUniforms.uSpeed.value               = sp.speed.value;
    this.smntcUniforms.uContourLines.value        = sp.contourLines.value;
    this.smntcUniforms.uReactivityStrength.value  = sp.reactivityStrength.value;
    this.smntcUniforms.uReactivityRadius.value    = sp.reactivityRadius.value;
    this.smntcUniforms.uWireframeWidth.value      = sp.wireframeWidth.value;

    this.smntcUniforms.uPrimaryColor.value.set(
      sp.primaryR.value,
      sp.primaryG.value,
      sp.primaryB.value,
    );
    this.smntcUniforms.uAccentColor.value.set(
      sp.accentR.value,
      sp.accentG.value,
      sp.accentB.value,
    );

    this.smntcUniforms.uAngle.value     = sp.angle.value * Math.PI / 180;
    this.smntcUniforms.uGrain.value     = sp.grain.value;
    this.smntcUniforms.uGlow.value      = sp.glow.value;
    this.smntcUniforms.uChromatic.value = sp.chromatic.value;
    this.smntcUniforms.uVignette.value  = sp.vignette.value;
    this.smntcUniforms.uBlur.value      = sp.blur.value;
  }

  private writePatternUniforms(c: ShaderConstants): void {
    this.smntcUniforms.uPatternType.value = c.patternType;
    this.smntcUniforms.uPatternScale.value = c.patternScale;
    this.smntcUniforms.uPatternWeight.value = c.patternWeight;
    this.smntcUniforms.uPatternAlpha.value = c.patternAlpha;
    this.smntcUniforms.uPatternMode.value = c.patternMode;
    this.smntcUniforms.uPatternAnimate.value = c.patternAnimate;
    this.smntcUniforms.uPatternRotation.value = c.patternRotation;
    this.smntcUniforms.uPatternRepeat.value.set(c.patternRepeatX, c.patternRepeatY);
    this.smntcUniforms.uPatternMap.value = this.config.pattern.map ?? null;
    this.smntcUniforms.uPatternMapEnabled.value = this.smntcUniforms.uPatternMap.value ? 1.0 : 0.0;
  }

  private resolveActiveConstants(
    config: Partial<SMNTCConfig>,
    layers: readonly LayerConfig[],
  ): ShaderConstants {
    if (layers.length === 0) {
      return resolveConstants(config);
    }
    return composeLayerConstants(config, layers);
  }

  private resolveBaseGeometryForMesh(mesh: Mesh): BufferGeometry {
    if (
      this.mesh === mesh
      && this.lodBaseGeometry
      && this.lodGeometries.includes(mesh.geometry)
    ) {
      return this.lodBaseGeometry;
    }

    return mesh.geometry;
  }

  private disposeGeneratedLodGeometries(): void {
    for (const geometry of this.generatedLodGeometries) {
      geometry.dispose();
    }

    this.generatedLodGeometries = [];
    this.lodBaseGeometry = null;
    this.lodGeometries = [];
    this.lodVertexCounts = [];
  }

  private rebuildLodCache(baseGeometry: BufferGeometry | null): void {
    if (!baseGeometry) {
      this.disposeGeneratedLodGeometries();
      return;
    }

    if (this.lodBaseGeometry === baseGeometry && this.lodGeometries.length > 0) {
      return;
    }

    this.disposeGeneratedLodGeometries();

    const builtLods = buildLodGeometries(baseGeometry, {
      levels: LOD_LEVEL_COUNT,
    });

    const lodGeometries: BufferGeometry[] = [baseGeometry];
    if (builtLods.length > 0) {
      // Keep caller-owned base geometry as LOD0 to avoid ownership surprises.
      builtLods[0].dispose();
    }

    for (let i = 1; i < builtLods.length; i++) {
      const geometry = builtLods[i];
      lodGeometries.push(geometry);
      this.generatedLodGeometries.push(geometry);
    }

    this.lodBaseGeometry = baseGeometry;
    this.lodGeometries = lodGeometries;
    this.lodVertexCounts = lodGeometries.map((geometry) => getGeometryVertexCount(geometry));
  }

  private resolveGeometryForFidelity(fidelity: Fidelity): BufferGeometry | null {
    if (this.lodGeometries.length === 0) {
      return null;
    }

    const baseCount = this.lodVertexCounts[0] ?? 0;
    if (baseCount <= 0 || this.lodGeometries.length === 1) {
      return this.lodGeometries[0];
    }

    const targetVertexCount = Math.max(
      4,
      Math.round(baseCount * FIDELITY_TARGET_RATIOS[fidelity]),
    );

    let bestIndex = 0;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (let i = 0; i < this.lodVertexCounts.length; i++) {
      const distance = Math.abs(this.lodVertexCounts[i] - targetVertexCount);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = i;
      }
    }

    return this.lodGeometries[bestIndex] ?? this.lodGeometries[this.lodGeometries.length - 1] ?? null;
  }

  private applyCurrentFidelityGeometry(mesh: Mesh | null = this.mesh): void {
    if (!mesh) {
      return;
    }

    if (this.lodGeometries.length === 0) {
      this.rebuildLodCache(this.resolveBaseGeometryForMesh(mesh));
    }

    const nextGeometry = this.resolveGeometryForFidelity(this.config.fidelity);
    if (!nextGeometry) {
      return;
    }

    if (mesh.geometry !== nextGeometry) {
      mesh.geometry = nextGeometry;
    }
  }

  private rebuildLodsFromGeometry(baseGeometry: BufferGeometry | null, mesh: Mesh | null = this.mesh): void {
    this.rebuildLodCache(baseGeometry);
    this.applyCurrentFidelityGeometry(mesh);
  }

  // =========================================================================
  // Reactivity
  // =========================================================================

  attachMesh(mesh: Mesh, camera?: Camera, domElement?: HTMLElement): this {
    const baseGeometry = this.resolveBaseGeometryForMesh(mesh);
    this.mesh = mesh;
    this.rebuildLodsFromGeometry(baseGeometry, mesh);

    const cam = camera ?? this.camera;
    const dom = domElement ?? this.domElement;
    if (cam) this.camera = cam;
    if (dom) this.domElement = dom;

    // Re-attaching should always tear down the previous proxy/listeners first.
    this.inputProxy?.dispose();
    this.inputProxy = null;

    if (this.config.reactivity !== 'static' && cam && dom) {
      this.inputProxy = new InputProxy({
        domElement: dom,
        camera: cam,
        raycaster: this.raycaster,
        mesh,
        uniforms: this.smntcUniforms,
        enableShockwave: this.config.reactivity === 'shockwave',
      });
    }

    return this;
  }

  // =========================================================================
  // Semantic setters
  // =========================================================================

  setVibe(vibe: Vibe): this {
    this.config.vibe = vibe;
    this.pushSpringTargets(this.resolveActiveConstants(this.config, this.layers));
    return this;
  }

  setSurface(surface: Surface): this {
    this.config.surface = surface;
    const c = this.resolveActiveConstants(this.config, this.layers);
    this.smntcUniforms.uSurfaceMode.value = c.surfaceMode;
    this.writePatternUniforms(c);
    this.pushSpringTargets(c);
    return this;
  }

  setReactivity(reactivity: Reactivity): this {
    this.config.reactivity = reactivity;
    const c = this.resolveActiveConstants(this.config, this.layers);
    this.smntcUniforms.uReactivityMode.value = c.reactivityMode;
    this.writePatternUniforms(c);
    this.pushSpringTargets(c);

    if (this.mesh && this.camera && this.domElement) {
      this.inputProxy?.dispose();
      if (reactivity !== 'static') {
        this.inputProxy = new InputProxy({
          domElement: this.domElement,
          camera: this.camera,
          raycaster: this.raycaster,
          mesh: this.mesh,
          uniforms: this.smntcUniforms,
          enableShockwave: reactivity === 'shockwave',
        });
      } else {
        this.inputProxy = null;
      }
    }
    return this;
  }

  setPalette(palette: Palette): this {
    this.config.palette = palette;
    this.pushSpringTargets(this.resolveActiveConstants(this.config, this.layers));
    return this;
  }

  setIntensity(intensity: number): this {
    this.config.intensity = Math.max(0, Math.min(2, intensity));
    this.pushSpringTargets(this.resolveActiveConstants(this.config, this.layers));
    return this;
  }

  setSpeed(speed: number): this {
    this.config.speed = Math.max(0, Math.min(5, speed));
    this.pushSpringTargets(this.resolveActiveConstants(this.config, this.layers));
    return this;
  }

  setAngle(angle: number): this {
    this.config.angle = Math.max(0, Math.min(360, angle));
    this.pushSpringTargets(this.resolveActiveConstants(this.config, this.layers));
    return this;
  }

  setGrain(grain: number): this {
    this.config.grain = Math.max(0, Math.min(1, grain));
    this.pushSpringTargets(this.resolveActiveConstants(this.config, this.layers));
    return this;
  }

  setGlow(glow: number): this {
    this.config.glow = Math.max(0, Math.min(2, glow));
    this.pushSpringTargets(this.resolveActiveConstants(this.config, this.layers));
    return this;
  }

  setChromatic(chromatic: number): this {
    this.config.chromatic = Math.max(0, Math.min(1, chromatic));
    this.pushSpringTargets(this.resolveActiveConstants(this.config, this.layers));
    return this;
  }

  setVignette(vignette: number): this {
    this.config.vignette = Math.max(0, Math.min(1, vignette));
    this.pushSpringTargets(this.resolveActiveConstants(this.config, this.layers));
    return this;
  }

  setBlur(blur: number): this {
    this.config.blur = Math.max(0, Math.min(1, blur));
    this.pushSpringTargets(this.resolveActiveConstants(this.config, this.layers));
    return this;
  }

  setLayers(layers: LayerConfig[] | null): this {
    this.layers = cloneLayerConfigs(layers ?? []);
    const c = this.resolveActiveConstants(this.config, this.layers);
    this.smntcUniforms.uSurfaceMode.value = c.surfaceMode;
    this.smntcUniforms.uReactivityMode.value = c.reactivityMode;
    this.smntcUniforms.uWireframe.value = c.wireframe ? 1.0 : 0.0;
    this.writePatternUniforms(c);
    this.pushSpringTargets(c);
    return this;
  }

  configure(config: Partial<SMNTCConfig> & { layers?: LayerConfig[] }): this {
    const { pattern, layers, ...semanticConfig } = config;
    if (layers !== undefined) {
      this.layers = cloneLayerConfigs(layers);
    }

    if (pattern !== undefined) {
      this.config.pattern = {
        ...this.config.pattern,
        ...pattern,
      };
    }

    Object.assign(this.config, semanticConfig);
    const c = this.resolveActiveConstants(this.config, this.layers);

    this.smntcUniforms.uSurfaceMode.value = c.surfaceMode;
    this.smntcUniforms.uReactivityMode.value = c.reactivityMode;
    this.smntcUniforms.uWireframe.value = c.wireframe ? 1.0 : 0.0;
    this.writePatternUniforms(c);

    this.pushSpringTargets(c);
    this.applyCurrentFidelityGeometry();
    return this;
  }

  // =========================================================================
  // Animation
  // =========================================================================

  update(dt?: number): void {
    if (this._disposed) return;

    if (!this.clock.running) {
      this.clock.start();
    }

    const delta = dt ?? this.clock.getDelta();
    const elapsed = this.clock.getElapsedTime();

    this.springs.step(delta);
    this.writeSpringValuesToUniforms();
    this.smntcUniforms.uTime.value = elapsed;
    this.inputProxy?.update(elapsed);

    const now = performance.now();
    if (this._lastFrameTime > 0) {
      this.autoScaler.reportFrame(now - this._lastFrameTime);
    }
    this._lastFrameTime = now;
  }

  stop(): void {
    this.clock.stop();
  }

  // =========================================================================
  // Accessors
  // =========================================================================

  getConfig(): Readonly<Required<SMNTCConfig>> {
    return { ...this.config };
  }

  getLayers(): ReadonlyArray<LayerConfig> {
    return cloneLayerConfigs(this.layers);
  }

  getUniforms(): SMNTCUniforms {
    return this.smntcUniforms;
  }

  getBackgroundColor(): Color {
    const bg = this.constants.backgroundColor;
    return new Color(bg[0], bg[1], bg[2]);
  }

  // =========================================================================
  // Dispose
  // =========================================================================

  dispose(): void {
    this._disposed = true;

    this.inputProxy?.dispose();
    this.autoScaler.dispose();
    this.springs.dispose();
    this.disposeGeneratedLodGeometries();

    super.dispose();

    this.layers = [];
    this.mesh = null;
    this.camera = null;
    this.domElement = null;
  }
}
