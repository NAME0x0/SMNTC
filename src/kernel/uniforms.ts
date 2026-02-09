// ============================================================================
// SMNTC — Shader Uniform Definitions
// Bridges TypeScript ShaderConstants → Three.js IUniform map.
// ============================================================================

import type { IUniform } from 'three';
import { Vector3 } from 'three';
import type { ShaderConstants } from '../semantic/tokens';

/**
 * The full set of uniforms consumed by the SMNTC Uber-Shader.
 */
export interface SMNTCUniforms {
  uTime:                IUniform<number>;
  uSurfaceMode:         IUniform<number>;
  uFrequency:           IUniform<number>;
  uAmplitude:           IUniform<number>;
  uNoiseScale:          IUniform<number>;
  uNoiseSpeed:          IUniform<number>;
  uIntensity:           IUniform<number>;
  uSpeed:               IUniform<number>;
  uContourLines:        IUniform<number>;
  uReactivityMode:      IUniform<number>;
  uReactivityStrength:  IUniform<number>;
  uReactivityRadius:    IUniform<number>;
  uPointer:             IUniform<Vector3>;
  uShockTime:           IUniform<number>;
  uPrimaryColor:        IUniform<Vector3>;
  uAccentColor:         IUniform<Vector3>;
  uBackgroundColor:     IUniform<Vector3>;
  uWireframe:           IUniform<number>;
  uWireframeWidth:      IUniform<number>;
  // Post-Processing / VFX uniforms
  uAngle:               IUniform<number>;
  uGrain:               IUniform<number>;
  uGlow:                IUniform<number>;
  uChromatic:           IUniform<number>;
  uVignette:            IUniform<number>;
  uBlur:                IUniform<number>;
}

/**
 * Create the initial uniform map from resolved shader constants.
 */
export function createUniforms(constants: ShaderConstants): SMNTCUniforms {
  return {
    uTime:                { value: 0.0 },
    uSurfaceMode:         { value: constants.surfaceMode },
    uFrequency:           { value: constants.frequency },
    uAmplitude:           { value: constants.amplitude },
    uNoiseScale:          { value: constants.noiseScale },
    uNoiseSpeed:          { value: constants.noiseSpeed },
    uIntensity:           { value: constants.intensity },
    uSpeed:               { value: constants.speed },
    uContourLines:        { value: constants.contourLines },
    uReactivityMode:      { value: constants.reactivityMode },
    uReactivityStrength:  { value: constants.reactivityStrength },
    uReactivityRadius:    { value: constants.reactivityRadius },
    uPointer:             { value: new Vector3(0, 0, 0) },
    uShockTime:           { value: 100.0 }, // Large = no active shockwave
    uPrimaryColor:        { value: new Vector3(...constants.primaryColor) },
    uAccentColor:         { value: new Vector3(...constants.accentColor) },
    uBackgroundColor:     { value: new Vector3(...constants.backgroundColor) },
    uWireframe:           { value: constants.wireframe ? 1.0 : 0.0 },
    uWireframeWidth:      { value: constants.wireframeWidth },
    // Post-Processing / VFX uniforms
    uAngle:               { value: constants.angle * Math.PI / 180 },
    uGrain:               { value: constants.grain },
    uGlow:                { value: constants.glow },
    uChromatic:           { value: constants.chromatic },
    uVignette:            { value: constants.vignette },
    uBlur:                { value: constants.blur },
  };
}

/**
 * Patch existing uniforms from new shader constants (for advanced users
 * bypassing the spring system). Mutates Vector3 objects in place for zero-GC.
 *
 * NOTE: Not used internally — the Kernel writes spring values directly.
 * Exported for consumers who manage their own animation loops.
 */
export function patchUniforms(
  uniforms: SMNTCUniforms,
  constants: ShaderConstants,
): void {
  uniforms.uSurfaceMode.value         = constants.surfaceMode;
  uniforms.uFrequency.value           = constants.frequency;
  uniforms.uAmplitude.value           = constants.amplitude;
  uniforms.uNoiseScale.value          = constants.noiseScale;
  uniforms.uNoiseSpeed.value          = constants.noiseSpeed;
  uniforms.uIntensity.value           = constants.intensity;
  uniforms.uSpeed.value               = constants.speed;
  uniforms.uContourLines.value        = constants.contourLines;
  uniforms.uReactivityMode.value      = constants.reactivityMode;
  uniforms.uReactivityStrength.value  = constants.reactivityStrength;
  uniforms.uReactivityRadius.value    = constants.reactivityRadius;
  uniforms.uWireframe.value           = constants.wireframe ? 1.0 : 0.0;
  uniforms.uWireframeWidth.value      = constants.wireframeWidth;
  uniforms.uAngle.value               = constants.angle * Math.PI / 180;
  uniforms.uGrain.value               = constants.grain;
  uniforms.uGlow.value                = constants.glow;
  uniforms.uChromatic.value           = constants.chromatic;
  uniforms.uVignette.value            = constants.vignette;
  uniforms.uBlur.value                = constants.blur;

  uniforms.uPrimaryColor.value.set(...constants.primaryColor);
  uniforms.uAccentColor.value.set(...constants.accentColor);
  uniforms.uBackgroundColor.value.set(...constants.backgroundColor);
}
