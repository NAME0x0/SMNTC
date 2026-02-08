<div align="center">

# SMNTC

**Semantic Engine for Motion, Animation, and Numerical Topographic Interactivity & Composition**

Abstracting WebGL complexity into a Tokenized Intent Schema.

[![npm](https://img.shields.io/npm/v/smntc.svg?logo=npm&color=cb0000)](https://www.npmjs.com/package/smntc)
[![npm downloads](https://img.shields.io/npm/dm/smntc.svg)](https://www.npmjs.com/package/smntc)
[![CI](https://github.com/NAME0x0/SMNTC/actions/workflows/ci.yml/badge.svg)](https://github.com/NAME0x0/SMNTC/actions/workflows/ci.yml)
[![Bundle size](https://img.shields.io/bundlephobia/minzip/smntc)](https://bundlephobia.com/package/smntc)
[![License: MIT](https://img.shields.io/badge/License-MIT-white.svg)](LICENSE)
[![Three.js](https://img.shields.io/badge/Three.js-≥0.150-black.svg)](https://threejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4+-3178C6.svg)](https://www.typescriptlang.org/)
[![JSR](https://img.shields.io/badge/JSR-%40smntc%2Fcore-0f172a)](https://jsr.io/@smntc/core)
[![Open in StackBlitz](https://img.shields.io/badge/StackBlitz-Open-blue?logo=stackblitz)](https://stackblitz.com/github/NAME0x0/SMNTC)

<br/>

*A deterministic visual compiler that translates high-level semantic intent into low-level, hardware-optimized GLSL instructions.*

</div>

---

## The Problem

Creating topographic/parametric wave animations for the web currently requires:

- Deep knowledge of GLSL shaders and trigonometry
- Manual Three.js scene setup (renderer, camera, lights, materials)
- Copy-pasting complex vertex shaders from Shadertoy and "hacking" them to fit
- Per-project performance tuning for mobile/desktop

**SMNTC eliminates the math.** You describe the *meaning*, the engine provides the *motion*.

## Quick Start

### Install

```bash
npm install smntc three
```

```bash
# JSR (Deno / Bun)
deno add jsr:@smntc/core
```

### CDN (No Build)

```html
<script type="module">
  import * as THREE from 'https://unpkg.com/three@0.170.0/build/three.module.js';
  import { SMNTCKernel } from 'https://unpkg.com/smntc/dist/index.mjs';

  const geometry = new THREE.PlaneGeometry(4, 4, 128, 128);
  const mesh = new THREE.Mesh(geometry);
  // ...add to scene
  const kernel = new SMNTCKernel({ surface: 'fluid', vibe: 'calm' });
  kernel.apply(mesh, camera, renderer.domElement);
  kernel.start(renderer, scene, camera);
</script>
```

```html
<script src="https://unpkg.com/smntc/dist/web/index.iife.global.js"></script>
<smntc-surface style="width:100%;height:60vh;display:block" surface="topographic"></smntc-surface>
```

### 5 Lines to Topographic Waves

```typescript
import { SMNTCKernel } from 'smntc';
import * as THREE from 'three';

// Your existing Three.js mesh (plane, sphere, torus, imported .glb — anything)
const geometry = new THREE.PlaneGeometry(4, 4, 128, 128);
const mesh = new THREE.Mesh(geometry);
scene.add(mesh);

// Apply SMNTC — done.
const kernel = new SMNTCKernel({ surface: 'fluid', vibe: 'calm', palette: 'monochrome' });
kernel.apply(mesh, camera, renderer.domElement);
kernel.start(renderer, scene, camera);
```

### React (React-Three-Fiber)

```tsx
import { Canvas } from '@react-three/fiber';
import { SMNTCSurface } from 'smntc/react';

function App() {
  return (
    <Canvas>
      <SMNTCSurface
        surface="topographic"
        vibe="calm"
        reactivity="magnetic"
        palette="arctic"
      />
    </Canvas>
  );
}
```

### R3F Material Element

```tsx
import React from 'react';
import { Canvas, extend, useFrame } from '@react-three/fiber';
import { SMNTCMaterial } from 'smntc';

extend({ SMNTCMaterial });

function Scene() {
  const materialRef = React.useRef<SMNTCMaterial>(null);

  useFrame((_state, delta) => {
    materialRef.current?.update(delta);
  });

  return (
    <mesh>
      <planeGeometry args={[1, 1, 128, 128]} />
      <smntcMaterial
        ref={materialRef}
        surface="fluid"
        vibe="calm"
        palette="arctic"
      />
    </mesh>
  );
}
```

### Web Component (No Framework)

```html
<script type="module">
  import 'https://unpkg.com/smntc/dist/web/index.mjs';
</script>

<smntc-surface
  style="width: 100%; height: 60vh; display: block;"
  surface="topographic"
  vibe="calm"
  palette="monochrome"
  reactivity="magnetic"
></smntc-surface>
```

### CLI

```bash
npx smntc init       # Create smntc.config.json
npx smntc add hero   # Create a preset template
npx smntc preview    # Copy demo to smntc-preview/
```

---

## Semantic Tokens

SMNTC replaces shader math with a **Semantic Token Dictionary**. You set *intent*, the engine resolves constants.

### Surface (Visual Structure)

| Token | Effect |
|---|---|
| `topographic` | Parallel contour lines — layered sine displacement |
| `crystalline` | Sharp, faceted clustering — Voronoi noise |
| `fluid` | Organic, continuous flow — Simplex noise |
| `glitch` | Step-function displacement — quantized random |

### Vibe (Motion Character)

| Token | Character |
|---|---|
| `stable` | Near-static; subtle breathing |
| `calm` | Slow, rhythmic oscillation |
| `agitated` | High-frequency, erratic shifts |
| `chaotic` | Stochastic vertex bursts |

### Reactivity (User Interaction)

| Token | Behavior |
|---|---|
| `static` | No response to external inputs |
| `magnetic` | Surface pulls toward cursor |
| `repel` | Surface pushes away from cursor |
| `shockwave` | Click triggers a radial ripple |

### Palette (Color Identity)

| Token | Aesthetic |
|---|---|
| `monochrome` | White on black — classic tech |
| `ember` | Warm orange/amber |
| `arctic` | Cool blue/white |
| `neon` | Cyberpunk green/magenta |
| `phantom` | Muted grey-purple stealth |

### Fidelity (Rendering Quality)

| Token | Segments | Target |
|---|---|---|
| `low` | 64×64 | Mobile / low-power |
| `medium` | 128×128 | Balanced default |
| `high` | 256×256 | Desktop |
| `ultra` | 512×512 | Presentation-grade |

---

## API Reference

### `SMNTCKernel`

The core engine class.

```typescript
const kernel = new SMNTCKernel({
  surface: 'topographic',   // Visual structure
  vibe: 'calm',             // Motion character
  reactivity: 'magnetic',   // Cursor interaction
  fidelity: 'high',         // Vertex density
  palette: 'monochrome',    // Color scheme
  wireframe: true,          // Wireframe rendering
  intensity: 1.0,           // Amplitude multiplier [0-2]
  speed: 1.0,               // Speed multiplier [0-5]
  contourLines: 16,         // Contour line count [4-64]
  thermalGuard: true,       // Pause animation when tab hidden
});
```

#### Methods

| Method | Description |
|---|---|
| `apply(mesh, camera?, domElement?)` | Inject SMNTC material onto a Three.js mesh |
| `start(renderer?, scene?, camera?)` | Start self-managed animation loop (or call `update()` manually) |
| `stop()` | Stop the animation loop |
| `update()` | Advance one frame (call in your own rAF loop) |
| `setVibe(vibe)` | Spring-interpolated vibe transition |
| `setSurface(surface)` | Switch surface mode |
| `setReactivity(reactivity)` | Change interaction model |
| `setPalette(palette)` | Spring-interpolated color transition |
| `setIntensity(n)` | Set amplitude multiplier |
| `setSpeed(n)` | Set speed multiplier |
| `configure(config)` | Bulk-update any config properties |
| `getMaterial()` | Access the underlying ShaderMaterial |
| `getBackgroundColor()` | Get palette background as THREE.Color |
| `dispose()` | Release all GPU and DOM resources |

### React Components

```tsx
// Declarative surface — handles geometry, material, and animation loop
<SMNTCSurface
  geometry="plane"          // 'plane' | 'sphere' | 'torus'
  surface="fluid"
  vibe="calm"
  reactivity="magnetic"
  palette="monochrome"
  scale={[4, 4, 4]}
  position={[0, 0, 0]}
  rotation={[-Math.PI/2, 0, 0]}
/>
```

```typescript
// Hook — for custom mesh control
const kernel = useSMNTC({ surface: 'fluid', vibe: 'calm' });
```

---

## Plugins & Presets

Extend SMNTC at runtime by registering new token definitions or presets.

```typescript
import { defineSurface, definePreset, applyPreset } from 'smntc';

defineSurface('aurora', { mode: 4, noiseScale: 1.8 });

const corporate = definePreset({
  name: 'corporate',
  defaults: { surface: 'topographic', vibe: 'stable', palette: 'monochrome' },
  allowedSurfaces: ['topographic', 'fluid'],
});

const config = applyPreset(corporate, { vibe: 'calm' });
```

---

## Architecture

```
┌─────────────────────────┐
│    Semantic Tokens      │   Developer / LLM Input
│  { vibe: "agitated" }   │   (JSON / React Props)
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│   SMNTC-Translate       │   Deterministic Lookup
│   Token → Constants     │   "agitated" → ω=2.5, A=0.2
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│   Spring Bank           │   Damped Harmonic Oscillator
│   F = -k·x - c·v        │   Smooth state transitions
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│   SMNTC-Kernel          │   GPU Uber-Shader
│   Vertex Displacement   │   + Finite-Difference Normals
│   + Reactivity Proxy    │   + Performance Auto-Scaler
└─────────────────────────┘
```

### Key Engineering Decisions

- **Spring Physics:** All state transitions use a damped harmonic oscillator (F = -kx - cv). No direct value mutation. Every "vibe" or "palette" change feels physically earned.
- **Finite-Difference Normals:** Displacing vertices breaks lighting. The shader recalculates normals using finite differences, ensuring correct specular/diffuse even on moving waves.
- **Uber-Shader:** All 4 surface modes compile into a single shader with branching. One draw call, O(1) overhead regardless of mode.
- **Thermal Guard:** Animation pauses on `visibilitychange` — zero battery drain on background tabs.
- **Auto-Scaler:** Monitors frame delta and automatically downgrades fidelity to maintain 60 FPS.

---

## Performance Tips

- **Fidelity first:** Start with `fidelity="medium"` and only move to `high`/`ultra` when needed.
- **Use auto-scaling:** Keep `thermalGuard: true` and allow the auto-scaler to protect FPS.
- **Wireframe cost:** `wireframe: true` looks great but is more expensive; disable for dense scenes.
- **Manual loop:** For advanced scenes, call `kernel.update()` in your own render loop for tighter control.
- **Static mode:** Set `reactivity="static"` when interactivity is not needed.

---

## Running the Demo

Open `examples/basic/index.html` in any browser. No build step required — loads Three.js from CDN.
Also available: `examples/hero/`, `examples/ambient/`, `examples/product/`, `examples/web-component/`.

```bash
# Or serve locally:
npx serve examples/basic
```

---

## Templates & Playgrounds

- **Vanilla starter:** `templates/vanilla` (Vite + Three.js + SMNTC)
- **StackBlitz:** https://stackblitz.com/github/NAME0x0/SMNTC

---

## Building from Source

```bash
npm install
npm run build        # Production build → dist/
npm run dev          # Watch mode
npm run typecheck    # Type-check without emitting
```

---

## Project Structure

```
smntc/
├── src/
│   ├── index.ts                    # Public barrel export
│   ├── kernel/
│   │   ├── SMNTCKernel.ts          # Core orchestrator class
│   │   ├── uniforms.ts             # Uniform bridge (TS → GLSL)
│   │   └── shaders/
│   │       ├── uber.vert.ts        # Vertex shader (GLSL as TS string)
│   │       └── uber.frag.ts        # Fragment shader
│   ├── semantic/
│   │   ├── tokens.ts               # Type definitions + const arrays
│   │   ├── dictionary.ts           # Token → constant mapping
│   │   ├── registry.ts             # Token registry + presets
│   │   └── transformer.ts          # Semantic middleware
│   ├── physics/
│   │   └── spring.ts               # Damped harmonic oscillator
│   ├── material/
│   │   └── SMNTCMaterial.ts         # ShaderMaterial subclass
│   ├── reactivity/
│   │   └── input-proxy.ts          # Pointer/touch capture
│   ├── performance/
│   │   └── auto-scaler.ts          # Adaptive LOD controller
│   ├── web/
│   │   ├── SMNTCSurfaceElement.ts   # Web Component implementation
│   │   └── index.ts                 # Web Component entry
│   └── react/
│       ├── index.ts                # React barrel export
│       ├── useSMNTC.ts             # Hook
│       ├── useSMNTCMaterial.ts      # Material hook
│       └── SMNTCSurface.ts         # Declarative component
├── examples/
│   ├── basic/
│   │   └── index.html              # Zero-build-step demo
│   ├── hero/
│   │   └── index.html              # Hero background demo
│   ├── ambient/
│   │   └── index.html              # Calm dashboard demo
│   ├── product/
│   │   └── index.html              # Palette-switching demo
│   └── web-component/
│       └── index.html              # <smntc-surface> demo
├── templates/
│   └── vanilla/                    # Vite + Three + SMNTC starter
├── src/cli/                         # CLI entry
├── .github/
│   ├── workflows/ci.yml            # GitHub Actions CI
│   ├── workflows/release.yml       # Publish + GitHub Release
│   └── FUNDING.yml                 # GitHub Sponsors
│   └── ISSUE_TEMPLATE/             # Bug & feature templates
├── SMNTC-SPEC.md                   # Technical specification
├── SECURITY.md                      # Security policy
├── CODE_OF_CONDUCT.md               # Community guidelines
├── llms.txt                        # LLM context (concise)
├── llms-full.txt                   # LLM context (complete)
├── smntc.schema.json               # JSON Schema for SMNTCConfig
├── jsr.json                         # JSR registry config
├── stackblitz.json                  # StackBlitz playground config
├── CHANGELOG.md                    # Release changelog
├── CONTRIBUTING.md                 # Contribution guide
├── LICENSE                         # MIT License
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── README.md
```

---

## For LLMs

SMNTC is designed to be consumed by both humans and language models. The following files are
optimized for LLM context injection:

| File | Purpose |
|------|---------|
| [`llms.txt`](llms.txt) | Concise context — enough to generate correct SMNTC code |
| [`llms-full.txt`](llms-full.txt) | Complete API surface, all valid tokens, patterns, and gotchas |
| [`smntc.schema.json`](smntc.schema.json) | Machine-validatable JSON Schema for `SMNTCConfig` |

Token values are also exported as runtime constants for programmatic discovery:

```typescript
import { SURFACES, VIBES, REACTIVITIES, FIDELITIES, PALETTES } from 'smntc';
// Each is a frozen readonly array of valid string values
```

---

## Specification

See [SMNTC-SPEC.md](SMNTC-SPEC.md) for the full technical specification including:

- Complete semantic token dictionary with mathematical mappings
- Spring physics model and transition rules
- Hardware constraints and performance budgets
- Hardening measures (Z-fighting, float overflow, Moiré, thermal throttling)

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, architecture overview, and the
process for adding new semantic tokens.

---

## License

[MIT](LICENSE)
