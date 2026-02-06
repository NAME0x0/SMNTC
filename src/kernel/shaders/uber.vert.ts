// ============================================================================
// SMNTC — Uber Vertex Shader (GLSL)
// Handles all 4 surface modes, reactivity, and finite-difference normals.
// Embedded as a TypeScript string for bundling.
// ============================================================================

export const UBER_VERTEX_SHADER = /* glsl */ `
precision highp float;

// ---- Three.js Built-ins ----
// position, normal, uv, modelViewMatrix, projectionMatrix, normalMatrix

// ---- SMNTC Uniforms ----
uniform float uTime;
uniform float uSurfaceMode;    // 0=topographic, 1=crystalline, 2=fluid, 3=glitch
uniform float uFrequency;
uniform float uAmplitude;
uniform float uNoiseScale;
uniform float uNoiseSpeed;
uniform float uIntensity;
uniform float uSpeed;
uniform float uContourLines;

// Reactivity
uniform float uReactivityMode;    // 0=static, 1=magnetic, 2=repel, 3=shockwave
uniform float uReactivityStrength;
uniform float uReactivityRadius;
uniform vec3  uPointer;           // Normalized pointer position in world space
uniform float uShockTime;         // Time since last shockwave trigger

// ---- Varyings ----
varying vec3  vNormal;
varying vec3  vPosition;
varying float vDisplacement;
varying vec2  vUv;

// ============================================================================
// Noise Functions (Simplex 3D — optimized for GPU)
// ============================================================================

vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 10.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  vec3 g  = step(x0.yzx, x0.xyz);
  vec3 l  = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);

  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;

  i = mod289(i);
  vec4 p = permute(permute(permute(
    i.z + vec4(0.0, i1.z, i2.z, 1.0))
  + i.y + vec4(0.0, i1.y, i2.y, 1.0))
  + i.x + vec4(0.0, i1.x, i2.x, 1.0));

  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;

  vec4 j  = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);

  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);

  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);

  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  vec4 m = max(0.5 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 105.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

// ============================================================================
// Voronoi Distance (for crystalline mode)
// ============================================================================

float voronoi(vec3 p) {
  vec3 i_st = floor(p);
  vec3 f_st = fract(p);
  float minDist = 1.0;
  for (int z = -1; z <= 1; z++) {
    for (int y = -1; y <= 1; y++) {
      for (int x = -1; x <= 1; x++) {
        vec3 neighbor = vec3(float(x), float(y), float(z));
        vec3 point = vec3(
          fract(sin(dot(i_st + neighbor, vec3(12.9898, 78.233, 45.164))) * 43758.5453),
          fract(sin(dot(i_st + neighbor, vec3(93.989, 67.345, 12.456))) * 28461.2534),
          fract(sin(dot(i_st + neighbor, vec3(43.332, 93.532, 65.123))) * 63728.1927)
        );
        vec3 diff = neighbor + point - f_st;
        float dist = length(diff);
        minDist = min(minDist, dist);
      }
    }
  }
  return minDist;
}

// ============================================================================
// Surface Displacement Functions
// ============================================================================

float topographicDisplacement(vec3 pos, float t) {
  float wave1 = sin(pos.x * uFrequency * 1.0 + t * 0.8) * 0.5;
  float wave2 = sin(pos.y * uFrequency * 1.3 + t * 0.6) * 0.3;
  float wave3 = cos(pos.x * uFrequency * 0.7 + pos.y * uFrequency * 0.9 + t * 1.1) * 0.2;
  return (wave1 + wave2 + wave3) * uAmplitude * uIntensity;
}

float crystallineDisplacement(vec3 pos, float t) {
  float v = voronoi(pos * uNoiseScale + vec3(0.0, 0.0, t * uNoiseSpeed));
  // Quantize for faceted look
  return floor(v * 8.0) / 8.0 * uAmplitude * uIntensity;
}

float fluidDisplacement(vec3 pos, float t) {
  float n1 = snoise(pos * uNoiseScale + vec3(0.0, 0.0, t * uNoiseSpeed));
  float n2 = snoise(pos * uNoiseScale * 2.0 + vec3(t * uNoiseSpeed * 0.5));
  return (n1 * 0.6 + n2 * 0.4) * uAmplitude * uIntensity;
}

float glitchDisplacement(vec3 pos, float t) {
  float base = snoise(pos * uNoiseScale + vec3(0.0, 0.0, t * uNoiseSpeed));
  // Step-quantize for glitch aesthetic
  float quantized = floor(base * 4.0 + 0.5) / 4.0;
  // Random UV-shift bursts
  float burst = step(0.92, fract(sin(dot(pos.xy + t, vec2(12.9898, 78.233))) * 43758.5453));
  return (quantized + burst * 0.3) * uAmplitude * uIntensity;
}

float getDisplacement(vec3 pos, float t) {
  // Branch by surface mode
  if (uSurfaceMode < 0.5) return topographicDisplacement(pos, t);
  if (uSurfaceMode < 1.5) return crystallineDisplacement(pos, t);
  if (uSurfaceMode < 2.5) return fluidDisplacement(pos, t);
  return glitchDisplacement(pos, t);
}

// ============================================================================
// Reactivity (Cursor-driven displacement offsets)
// ============================================================================

float reactivityOffset(vec3 worldPos) {
  if (uReactivityMode < 0.5) return 0.0; // static

  float dist = distance(worldPos, uPointer);
  float influence = 1.0 - smoothstep(0.0, uReactivityRadius, dist);

  if (uReactivityMode < 1.5) {
    // Magnetic: pull inward
    return influence * uReactivityStrength * 0.3;
  }
  if (uReactivityMode < 2.5) {
    // Repel: push outward
    return -influence * uReactivityStrength * 0.3;
  }
  // Shockwave: radial ripple from click point
  float shockRadius = uShockTime * 3.0;
  float shockWave = sin((dist - shockRadius) * 10.0) * exp(-uShockTime * 2.0);
  float shockInfluence = smoothstep(shockRadius + 1.0, shockRadius, dist)
                       * smoothstep(shockRadius - 1.0, shockRadius, dist);
  return shockWave * shockInfluence * uReactivityStrength * 0.5;
}

// ============================================================================
// Finite Difference Normal Recalculation
// ============================================================================

vec3 computeDisplacedNormal(vec3 pos, vec3 norm, float t) {
  float eps = 0.01;
  vec3 tangentX = vec3(1.0, 0.0, 0.0);
  vec3 tangentZ = vec3(0.0, 0.0, 1.0);

  float dX = getDisplacement(pos + tangentX * eps, t) - getDisplacement(pos - tangentX * eps, t);
  float dZ = getDisplacement(pos + tangentZ * eps, t) - getDisplacement(pos - tangentZ * eps, t);

  vec3 modifiedNormal = normalize(norm + vec3(-dX / (2.0 * eps), 1.0, -dZ / (2.0 * eps)));
  return modifiedNormal;
}

// ============================================================================
// Main
// ============================================================================

void main() {
  float t = uTime * uSpeed;

  // Time modulo to prevent float overflow (reset every ~6283 seconds ≈ 2π * 1000)
  t = mod(t, 6283.1853);

  vec3 pos = position;

  // Compute displacement along normal
  float disp = getDisplacement(pos, t);
  disp += reactivityOffset(pos);

  // Displace vertex along its normal
  vec3 displaced = pos + normal * disp;

  // Recalculate normal for correct lighting
  vNormal = computeDisplacedNormal(pos, normal, t);
  vNormal = normalize(normalMatrix * vNormal);

  vPosition = (modelViewMatrix * vec4(displaced, 1.0)).xyz;
  vDisplacement = disp;
  vUv = uv;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
}
`;
