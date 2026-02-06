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
// Lighting (Simple Phong with single directional light)
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

  return baseColor * (ambient + diff * 0.7) + vec3(spec + rim);
}

// ============================================================================
// Main
// ============================================================================

void main() {
  // Base color: blend between primary and accent based on displacement
  float blendFactor = smoothstep(-0.15, 0.15, vDisplacement) * uIntensity;
  vec3 baseColor = mix(uPrimaryColor, uAccentColor, blendFactor);

  if (uWireframe > 0.5) {
    // ---- Wireframe / Contour Mode ----
    float contour = contourFactor();
    float edge = edgeFactor();

    // Combine: show lines where contour OR edge is present
    float lineFactor = min(contour, edge);

    // Mix between line color and transparent (discard background)
    vec3 lineColor = lighting(baseColor);
    float alpha = 1.0 - lineFactor;

    // Discard fully-transparent fragments for "floating lines" look
    if (alpha < 0.05) discard;

    gl_FragColor = vec4(lineColor, alpha);
  } else {
    // ---- Solid Displacement Mode ----
    vec3 litColor = lighting(baseColor);
    gl_FragColor = vec4(litColor, 1.0);
  }
}
`;
