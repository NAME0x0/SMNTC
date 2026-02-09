// ============================================================================
// SMNTC — Uber Fragment Shader (GLSL)
// Handles wireframe rendering, contour lines, palette, and Moiré mitigation.
// ============================================================================

export const UBER_FRAGMENT_SHADER = /* glsl */ `
precision highp float;

// ---- SMNTC Uniforms ----
uniform vec3  uPrimaryColor;
uniform vec3  uAccentColor;
uniform vec3  uBackgroundColor;
uniform float uContourLines;
uniform float uSurfaceMode;
uniform float uWireframe;       // 1.0 = wireframe on, 0.0 = solid
uniform float uWireframeWidth;
uniform float uIntensity;
uniform float uTime;

// ---- Post-Processing / VFX Uniforms ----
uniform float uGrain;           // Film grain intensity [0, 1]
uniform float uGlow;            // Bloom/glow emulation [0, 2]
uniform float uChromatic;       // Chromatic aberration [0, 1]
uniform float uVignette;        // Vignette darkening [0, 1]
uniform float uBlur;            // Depth blur [0, 1]

// ---- Varyings ----
varying vec3  vNormal;
varying vec3  vPosition;
varying float vDisplacement;
varying vec2  vUv;

// ============================================================================
// Wireframe via Barycentric (screen-space derivative)
// ============================================================================

float edgeFactor() {
  // Screen-space wireframe using fragment derivatives
  vec2 grid = abs(fract(vUv * uContourLines - 0.5) - 0.5);
  vec2 dGrid = fwidth(vUv * uContourLines);
  vec2 a2 = smoothstep(vec2(0.0), dGrid * uWireframeWidth * 1.5, grid);
  return min(a2.x, a2.y);
}

// ============================================================================
// Contour Lines (displacement-based isoheight lines)
// ============================================================================

float contourFactor() {
  float scaledDisp = vDisplacement * uContourLines * 10.0;
  float line = abs(fract(scaledDisp) - 0.5);
  float dLine = fwidth(scaledDisp);
  // Anti-aliased step — Moiré mitigation via distance-based fade
  return smoothstep(0.0, dLine * 1.5, line);
}

// ============================================================================
// Lighting (Enhanced Phong with multiple lights)
// ============================================================================

vec3 lighting(vec3 baseColor) {
  vec3 lightDir = normalize(vec3(0.5, 1.0, 0.8));
  vec3 viewDir  = normalize(-vPosition);
  vec3 norm     = normalize(vNormal);

  // Ambient
  float ambient = 0.15;

  // Diffuse
  float diff = max(dot(norm, lightDir), 0.0);

  // Specular (Blinn-Phong)
  vec3 halfDir = normalize(lightDir + viewDir);
  float spec = pow(max(dot(norm, halfDir), 0.0), 64.0) * 0.3;

  // Rim light (edge glow for depth)
  float rim = 1.0 - max(dot(viewDir, norm), 0.0);
  rim = pow(rim, 3.0) * 0.2;

  // Secondary fill light (subtle)
  vec3 fillDir = normalize(vec3(-0.3, 0.5, -0.6));
  float fill = max(dot(norm, fillDir), 0.0) * 0.15;

  return baseColor * (ambient + diff * 0.7 + fill) + vec3(spec + rim);
}

// ============================================================================
// Post-Processing Effects (AE / Premiere / Cinema-inspired)
// ============================================================================

// Film grain (After Effects Noise / Add Grain)
float filmGrain(vec2 uv, float t) {
  float noise = fract(sin(dot(uv * 1000.0 + t * 100.0, vec2(12.9898, 78.233))) * 43758.5453);
  float noise2 = fract(sin(dot(uv * 800.0 - t * 50.0, vec2(63.7264, 10.873))) * 28462.6453);
  return (noise * 0.5 + noise2 * 0.5) * 2.0 - 1.0;
}

// Vignette (Cinema lens darkening)
float vignetteEffect(vec2 uv) {
  vec2 center = uv - 0.5;
  float dist = length(center);
  return 1.0 - smoothstep(0.3, 0.85, dist);
}

// ============================================================================
// Main
// ============================================================================

void main() {
  // Base color: blend between primary and accent based on displacement
  float blendFactor = smoothstep(-0.15, 0.15, vDisplacement) * uIntensity;
  vec3 baseColor = mix(uPrimaryColor, uAccentColor, blendFactor);

  vec4 finalColor;

  if (uWireframe > 0.5) {
    // ---- Wireframe / Contour Mode ----
    float contour = contourFactor();
    float edge = edgeFactor();

    // Combine: show lines where contour OR edge is present
    float lineFactor = min(contour, edge);

    // Mix between line color and transparent (discard background)
    vec3 lineColor = lighting(baseColor);

    // Glow effect: brighten lines based on glow intensity
    if (uGlow > 0.01) {
      float glowFactor = (1.0 - lineFactor) * uGlow;
      lineColor += baseColor * glowFactor * 0.5;
      lineColor += uAccentColor * glowFactor * 0.3;
    }

    float alpha = 1.0 - lineFactor;

    // Discard fully-transparent fragments for "floating lines" look
    if (alpha < 0.05) discard;

    finalColor = vec4(lineColor, alpha);
  } else {
    // ---- Solid Displacement Mode ----
    vec3 litColor = lighting(baseColor);

    // Glow on solid surfaces: add bloom to bright areas
    if (uGlow > 0.01) {
      float brightness = dot(litColor, vec3(0.299, 0.587, 0.114));
      litColor += litColor * brightness * uGlow * 0.4;
    }

    finalColor = vec4(litColor, 1.0);
  }

  // ---- Apply Post-Processing Effects ----

  // Chromatic aberration (Premiere Pro lens distortion)
  if (uChromatic > 0.001) {
    vec2 center = vUv - 0.5;
    float dist = length(center);
    float aberrationOffset = dist * uChromatic * 0.02;
    // Shift R and B channels based on distance from center
    float rShift = smoothstep(-0.15, 0.15, vDisplacement + aberrationOffset) * uIntensity;
    float bShift = smoothstep(-0.15, 0.15, vDisplacement - aberrationOffset) * uIntensity;
    vec3 rColor = mix(uPrimaryColor, uAccentColor, rShift);
    vec3 bColor = mix(uPrimaryColor, uAccentColor, bShift);
    finalColor.r = mix(finalColor.r, rColor.r * 1.1, uChromatic * 0.5);
    finalColor.b = mix(finalColor.b, bColor.b * 1.1, uChromatic * 0.5);
  }

  // Film grain overlay
  if (uGrain > 0.001) {
    float grain = filmGrain(vUv, uTime) * uGrain * 0.15;
    finalColor.rgb += grain;
  }

  // Vignette
  if (uVignette > 0.001) {
    float vig = vignetteEffect(vUv);
    finalColor.rgb *= mix(1.0, vig, uVignette);
  }

  // Depth blur simulation (distance-based desaturation + softness)
  if (uBlur > 0.001) {
    float depth = length(vPosition);
    float blurFactor = smoothstep(1.0, 5.0, depth) * uBlur;
    vec3 blurred = mix(finalColor.rgb, vec3(dot(finalColor.rgb, vec3(0.299, 0.587, 0.114))), blurFactor * 0.3);
    finalColor.rgb = mix(finalColor.rgb, blurred, blurFactor);
  }

  gl_FragColor = finalColor;
}
`;
