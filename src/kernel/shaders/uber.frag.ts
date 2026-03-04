// ============================================================================
// SMNTC — Uber Fragment Shader (GLSL)
// Handles wireframe rendering, contour lines, palette, and Moiré mitigation.
// ============================================================================

export const UBER_FRAGMENT_SHADER = /* glsl */ `
precision highp float;

#ifndef SMNTC_ENABLE_PATTERN
#define SMNTC_ENABLE_PATTERN 1
#endif

#ifndef SMNTC_ENABLE_POSTFX
#define SMNTC_ENABLE_POSTFX 1
#endif

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
uniform float uPatternType;     // 0=none, 1=grid, 2=hexagon, 3=dots, 4=voronoi, 5=waves, 6=concentric, 7=noise, 8=custom
uniform float uPatternScale;    // spatial frequency
uniform float uPatternWeight;   // line width / radius
uniform float uPatternAlpha;    // global opacity
uniform float uPatternMode;     // 0=normal, 1=add, 2=multiply, 3=screen
uniform float uPatternAnimate;  // 0=off, 1=on
uniform float uPatternRotation; // radians
uniform sampler2D uPatternMap;  // custom pattern texture
uniform float uPatternMapEnabled; // 0=off, 1=on
uniform vec2  uPatternRepeat;   // custom pattern repeat

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

#if SMNTC_ENABLE_PATTERN
float hash11(float p) {
  p = fract(p * 0.1031);
  p *= p + 33.33;
  p *= p + p;
  return fract(p);
}

vec2 hash22(vec2 p) {
  float n = p.x * 127.1 + p.y * 311.7;
  return fract(sin(vec2(n, n + 1.0)) * 43758.5453123);
}

float valueNoise(vec2 x) {
  vec2 i = floor(x);
  vec2 f = fract(x);
  vec2 u = f * f * (3.0 - 2.0 * f);

  float a = hash11(i.x + i.y * 57.0);
  float b = hash11(i.x + 1.0 + i.y * 57.0);
  float c = hash11(i.x + (i.y + 1.0) * 57.0);
  float d = hash11(i.x + 1.0 + (i.y + 1.0) * 57.0);

  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float sdHex(vec2 p, float r) {
  const vec3 k = vec3(-0.866025404, 0.5, 0.577350269);
  p = abs(p);
  p -= 2.0 * min(dot(k.xy, p), 0.0) * k.xy;
  p -= vec2(clamp(p.x, -k.z * r, k.z * r), r);
  return length(p) * sign(p.y);
}

float voronoiEdge(vec2 x) {
  vec2 n = floor(x);
  vec2 f = fract(x);

  float minDist = 8.0;
  float secondMinDist = 8.0;

  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 g = vec2(float(i), float(j));
      vec2 o = hash22(n + g);
      vec2 r = g + o - f;
      float d = dot(r, r);
      if (d < minDist) {
        secondMinDist = minDist;
        minDist = d;
      } else if (d < secondMinDist) {
        secondMinDist = d;
      }
    }
  }

  return sqrt(secondMinDist) - sqrt(minDist);
}

float patternMask(vec2 uv) {
  if (uPatternType < 0.5 || uPatternAlpha <= 0.001) {
    return 0.0;
  }

  vec2 p = uv * max(uPatternScale, 0.0001);
  if (uPatternAnimate > 0.5) {
    p += vec2(uTime * 0.14, -uTime * 0.11);
  }

  float ca = cos(uPatternRotation);
  float sa = sin(uPatternRotation);
  p = mat2(ca, -sa, sa, ca) * p;

  float weight = clamp(uPatternWeight, 0.01, 1.0);
  float aaScale = max(0.001, fwidth(p.x) + fwidth(p.y));

  // grid
  if (uPatternType < 1.5) {
    vec2 grid = abs(fract(p) - 0.5);
    float d = min(grid.x, grid.y);
    float thickness = mix(0.02, 0.30, weight);
    return 1.0 - smoothstep(thickness, thickness + aaScale, d);
  }

  // hexagon
  if (uPatternType < 2.5) {
    vec2 r = vec2(1.0, 1.7320508076);
    vec2 a = mod(p, r) - 0.5 * r;
    vec2 b = mod(p - 0.5 * r, r) - 0.5 * r;
    vec2 cell = dot(a, a) < dot(b, b) ? a : b;
    float edgeDist = abs(sdHex(cell, 0.48));
    float thickness = mix(0.01, 0.12, weight);
    return 1.0 - smoothstep(thickness, thickness + aaScale, edgeDist);
  }

  // dots
  if (uPatternType < 3.5) {
    vec2 cell = fract(p) - 0.5;
    float radius = mix(0.08, 0.48, weight);
    float d = length(cell);
    return 1.0 - smoothstep(radius, radius + aaScale, d);
  }

  // voronoi
  if (uPatternType < 4.5) {
    float edge = voronoiEdge(p);
    float thickness = mix(0.005, 0.08, weight);
    return 1.0 - smoothstep(thickness, thickness + aaScale, edge);
  }

  // waves
  if (uPatternType < 5.5) {
    float wave = sin((p.x * 6.28318530718) + (uPatternAnimate > 0.5 ? uTime * 2.0 : 0.0));
    float d = abs(fract(p.y + wave * 0.35) - 0.5);
    float thickness = mix(0.01, 0.25, weight);
    return 1.0 - smoothstep(thickness, thickness + aaScale, d);
  }

  // concentric
  if (uPatternType < 6.5) {
    float d = abs(fract(length(p)) - 0.5);
    float thickness = mix(0.01, 0.25, weight);
    return 1.0 - smoothstep(thickness, thickness + aaScale, d);
  }

  // noise
  if (uPatternType < 7.5) {
    float n = valueNoise(p * 0.9);
    float threshold = mix(0.25, 0.90, weight);
    return smoothstep(threshold, threshold + 0.1, n);
  }

  // custom (texture-backed)
  if (uPatternType < 8.5) {
    if (uPatternMapEnabled < 0.5) {
      return 0.0;
    }

    vec2 repeat = max(uPatternRepeat, vec2(0.0001));
    vec2 textureUv = fract(p * repeat);
    vec4 texel = texture2D(uPatternMap, textureUv);
    float luma = dot(texel.rgb, vec3(0.299, 0.587, 0.114));
    float threshold = mix(0.9, 0.1, weight);
    float edge = max(0.001, fwidth(luma) + aaScale * 0.25);
    return smoothstep(threshold - edge, threshold + edge, luma) * texel.a;
  }

  return 0.0;
}

vec3 blendPattern(vec3 baseColor, vec3 patternColor, float alpha) {
  alpha = clamp(alpha, 0.0, 1.0);
  if (uPatternMode < 0.5) {
    return mix(baseColor, patternColor, alpha);
  }
  if (uPatternMode < 1.5) {
    return min(baseColor + patternColor * alpha, vec3(1.0));
  }
  if (uPatternMode < 2.5) {
    return mix(baseColor, baseColor * patternColor, alpha);
  }
  vec3 screenColor = 1.0 - (1.0 - baseColor) * (1.0 - patternColor);
  return mix(baseColor, screenColor, alpha);
}
#endif

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

#if SMNTC_ENABLE_PATTERN
  // ---- Pattern Overlay ----
  if (uPatternType > 0.5 && uPatternAlpha > 0.001) {
    float mask = patternMask(vUv);
    if (mask > 0.001) {
      vec3 patternColor = mix(uPrimaryColor, uAccentColor, 0.7 + mask * 0.3);
      float alpha = clamp(mask * uPatternAlpha, 0.0, 1.0);
      finalColor.rgb = blendPattern(finalColor.rgb, patternColor, alpha);
    }
  }
#endif

#if SMNTC_ENABLE_POSTFX
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
#endif

  gl_FragColor = finalColor;
}
`;
