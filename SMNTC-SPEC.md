# SMNTC Technical Specification (v1.0.0)

**Subject:** Semantic Engine for Motion, Animation, and Numerical Topographic Interactivity & Composition.

**Objective:** Abstracting WebGL complexity into a Tokenized Intent Schema.

---

## 1. System Architecture: The Triad Pipeline

SMNTC operates as a three-stage compiler that converts linguistic "Vibes" into hardware "Instructions."

1. **The Tokenizer (Input):** Accepts high-level semantic tokens (JSON/Props).
2. **The Transformer (Logic):** Maps tokens to mathematical constants using a deterministic lookup table.
3. **The Kernel (Output):** Injects a procedurally generated Uber-Shader into the GPU pipeline.

```
┌─────────────────────┐
│   Semantic Tokens    │   Developer / LLM Input
│  { vibe: "agitated"  │   (JSON / React Props)
│    surface: "fluid" }│
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  SMNTC-Translate     │   Deterministic Lookup
│  Token → Constants   │   "agitated" → ω=2.5, A=0.2
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  SMNTC-Kernel        │   GPU Uber-Shader
│  Vertex Displacement │   + Spring Physics
│  + Normal Recalc     │   + Auto-Scaler
└─────────────────────┘
```

---

## 2. Semantic Token Dictionary

Parameters are categorized by **Intent**, not by math.

### A. Surface Identity (`surface`)

Defines the visual structure of the mesh.

| Token          | Description                                                         | Noise Function     |
| -------------- | ------------------------------------------------------------------- | ------------------ |
| `topographic`  | Parallel contour lines (Y-axis displacement).                       | Layered Sine       |
| `crystalline`  | Sharp, faceted vertex clustering.                                   | Voronoi            |
| `fluid`        | Organic, continuous surface displacement.                           | Simplex / Perlin   |
| `glitch`       | Step-function displacement with randomized UV-shifting.             | Quantized Random   |

### B. Kinetic Vibe (`vibe`)

Defines the motion physics and frequency.

| Token      | Angular Frequency (ω) | Amplitude Range    | Damping   | Character                       |
| ---------- | ---------------------- | ------------------ | --------- | ------------------------------- |
| `stable`   | ≈ 0.1                 | [0.01, 0.03]       | 0.95      | Near-static; subtle breathing   |
| `calm`     | ≈ 0.5                 | [0.05, 0.10]       | 0.80      | Slow, rhythmic oscillation      |
| `agitated` | ≈ 2.5                 | [0.10, 0.30]       | 0.40      | High-frequency, erratic shifts  |
| `chaotic`  | ≈ 5.0+                | [0.20, 0.50]       | 0.05      | Stochastic vertex bursts        |

### C. Interaction Model (`reactivity`)

Defines how the surface responds to external stimuli.

| Token        | Behavior                                                          |
| ------------ | ----------------------------------------------------------------- |
| `static`     | No response to external inputs.                                   |
| `magnetic`   | Surface pulls toward the cursor (Inward Displacement).            |
| `repel`      | Surface pushes away from the cursor (Outward Displacement).       |
| `shockwave`  | Click events trigger a radial ripple spanning the entire mesh.    |

### D. Visual Fidelity (`fidelity`)

Defines the rendering quality and line density.

| Token      | Vertex Density | Wireframe Weight | Anti-Aliasing |
| ---------- | -------------- | ---------------- | ------------- |
| `low`      | 64×64          | 1.5px            | None          |
| `medium`   | 128×128        | 1.0px            | FXAA          |
| `high`     | 256×256        | 0.75px           | MSAA 4x       |
| `ultra`    | 512×512        | 0.5px            | TAA           |

### E. Palette (`palette`)

Defines the color scheme of the rendered surface.

| Token          | Primary      | Accent       | Background   |
| -------------- | ------------ | ------------ | ------------ |
| `monochrome`   | `#e0e0e0`    | `#ffffff`    | `#000000`    |
| `ember`        | `#ff6b35`    | `#ffaa00`    | `#0a0a0a`    |
| `arctic`       | `#88ccff`    | `#ffffff`    | `#050510`    |
| `neon`         | `#00ff88`    | `#ff00ff`    | `#0a0a0a`    |
| `phantom`      | `#a0a0b0`    | `#6060a0`    | `#08080c`    |

---

## 3. Physics Model: Spring-Based Transitions

Every state change is governed by a damped harmonic oscillator:

```
F = -k · x - c · v
```

Where:
- **k** = Stiffness (tension of the visual wave transition)
- **c** = Damping coefficient (viscosity of movement)
- **x** = Displacement from the target semantic constant
- **v** = Current velocity of the transition

### Transition Rules

- Direct value mutation is **prohibited**. All uniform changes pass through the spring solver.
- Maximum transition duration: **800ms** for functional interactions.
- Minimum spring stiffness: **80** (prevents "floating" transitions).

---

## 4. Hardware Constraints & Performance Budget

| Constraint               | Value                | Rationale                              |
| ------------------------ | -------------------- | -------------------------------------- |
| Vertex Cap (default)     | 100,000              | Mobile GPU thermal limit               |
| Draw Calls               | 1 (Uber-Shader)      | O(1) overhead regardless of complexity |
| Input-to-Visual Latency  | < 16.6ms             | 60 FPS minimum guarantee               |
| Float Precision (desktop)| `highp`              | Sub-pixel accuracy                     |
| Float Precision (mobile) | `mediump` fallback   | Battery conservation                   |
| uTime Reset Interval     | Every 3600s          | Prevents float overflow                |

---

## 5. Hardening Measures

| Risk                   | Mitigation                                                         |
| ---------------------- | ------------------------------------------------------------------ |
| Z-Fighting             | Automated depth-offset in vertex shader                            |
| Memory Leaks           | RAII pattern; explicit `.dispose()` on all GPU resources            |
| Infinite Loops         | No unbounded loops in GLSL; all iterations clamped                 |
| Float Overflow         | Periodic `uTime` modulo reset                                     |
| Moiré Interference     | Distance-based alpha fade on wireframe lines                       |
| Normal Corruption      | Finite Difference normal recalculation in vertex shader            |
| Photosensitivity       | Frequency clamping: no animation exceeds 15Hz in critical areas    |
| Thermal Throttling     | Animation pause on `visibilitychange` (tab hidden)                 |

---

## 6. API Surface

### Vanilla Three.js

```typescript
import { SMNTCKernel } from 'smntc';

const kernel = new SMNTCKernel({
  surface: 'topographic',
  vibe: 'calm',
  reactivity: 'magnetic',
  fidelity: 'high',
  palette: 'monochrome',
});

kernel.apply(myThreeJsMesh);
kernel.start();

// Semantic state transition (spring-interpolated)
kernel.setVibe('agitated');

// Cleanup
kernel.dispose();
```

### React (React-Three-Fiber)

```tsx
import { SMNTCSurface } from 'smntc/react';

function Hero() {
  return (
    <SMNTCSurface
      model="/models/bust.glb"
      surface="fluid"
      vibe="calm"
      reactivity="magnetic"
      palette="monochrome"
    />
  );
}
```

---

## 7. Verification Criteria

The project is successful only if:

1. **Metric A:** A developer can implement a 3D topographic wave on a custom mesh in **< 5 lines of code**.
2. **Metric B:** An LLM can generate a working visual configuration from a 1-sentence prompt using only the type definitions.
3. **Metric C:** The system maintains **60 FPS** on a 3-year-old smartphone at `fidelity: "medium"`.
