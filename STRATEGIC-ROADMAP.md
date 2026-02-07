# SMNTC Strategic Roadmap: From Cool Library to Essential Tool

**Date:** February 7, 2026
**Subject:** Path to becoming the de facto semantic visual engine for the web.

---

## Executive Summary

SMNTC sits at an unprecedented intersection: **design tokens + GPU shaders + semantic intent**. No existing tool occupies this space. The closest analogies — Tailwind for CSS, Motion for animation, D3 for data visualization — each took a different but studyable path from "interesting library" to "industry standard."

This document distills those strategies into a concrete, phased roadmap for SMNTC.

---

## Part 1: Case Studies — How Standards Were Built

### 1.1 Tailwind CSS → De Facto Utility-First Framework

**Key Stats:** 93.4k GitHub stars, 15.3M dependents, 336 contributors, 298 releases.

**What made it win:**

| Strategy | Implementation | SMNTC Parallel |
|---|---|---|
| **Constraint-based vocabulary** | Fixed set of utility classes derived from a configurable theme | Fixed set of semantic tokens (`surface`, `vibe`, `palette`) derived from a configurable dictionary |
| **Zero-runtime philosophy** | Compile-time CSS generation — no JS at runtime | Compile-time constant resolution → GPU-native execution |
| **CSS-first configuration** | v4 moved config from `tailwind.config.js` to `@theme {}` in CSS | SMNTC could define tokens in CSS custom properties or JSON |
| **Plugin ecosystem** | `@utility`, `@custom-variant`, `@theme` extensibility | Custom surfaces, vibes, palettes via plugin API |
| **Theme-as-variables** | All design tokens exposed as CSS custom properties at `:root` | All shader constants could be exposed as inspectable uniforms |
| **Premium tier** | Tailwind Plus (UI blocks, templates, UI kit) — funds open-source core | SMNTC presets marketplace (industry-specific visual themes) |
| **Automated migration** | Upgrade tool for v3→v4 | Version migration tooling as API evolves |
| **Content detection** | Auto-discovers template files, ignores binaries | Could auto-discover SMNTC configs in codebases |

**Critical insight:** Tailwind won because of **vocabulary, not technology**. Classes like `bg-blue-500` became a lingua franca. SMNTC's tokens (`vibe: 'calm'`, `surface: 'fluid'`) have the same potential — they're even more intuitive.

### 1.2 Motion (Framer Motion) → Animation Standard for React

**Key Stats:** 18M monthly npm downloads, React/JS/Vue support, 600+ member Discord.

**What made it win:**

| Strategy | Implementation | SMNTC Parallel |
|---|---|---|
| **Declarative API over imperative** | `<motion.div animate={{ x: 100 }} />` replaces manual rAF loops | `<SMNTCSurface vibe="calm" />` replaces manual GLSL authoring |
| **Spring physics as default** | Spring-based transitions feel natural without manual easing curves | Already implemented — damped harmonic oscillator for all transitions |
| **Progressive disclosure** | Simple API for 80% of cases, escape hatches for power users | `SMNTCSurface` for simple, `SMNTCKernel` for control, raw shaders for experts |
| **Framework expansion** | Started React-only → added vanilla JS → added Vue | Currently Three.js core + React → add vanilla CSS, Canvas2D, SVG |
| **Premium content** | Motion+ (330+ pre-built animations, tutorials, VS Code tools) | SMNTC presets (industry-specific backgrounds, interactive surfaces) |
| **LLM optimization** | Custom AI rules for editors, "Great for LLMs" as a feature | Already implemented — `llms.txt`, `llms-full.txt`, JSON Schema |
| **Visual tooling** | Motion Studio for visual debugging in VS Code | SMNTC Studio / DevTools for visual token tweaking |
| **Figma integration** | Official Figma integration guide | Figma plugin for previewing SMNTC surfaces |

**Critical insight:** Motion won because it made **the common case trivial and the hard case possible**. The `<motion.div>` component is the entire on-ramp. `<SMNTCSurface>` serves the same function.

### 1.3 D3.js → Essential Data Visualization

**Key Stats:** 111.9k GitHub stars, by Mike Bostock.

**What made it win:**

| Strategy | Implementation | SMNTC Parallel |
|---|---|---|
| **Low-level primitives, not charts** | DOM manipulation + data binding, not pre-built chart types | Shader primitives + semantic mapping, not pre-built backgrounds |
| **Observable integration** | D3 on Observable = hosted notebook environment for exploration | SMNTC Playground = hosted environment for visual experimentation |
| **Gallery-driven adoption** | Hundreds of stunning examples that people copy and adapt | Gallery of landing pages, hero sections, product showcases |
| **Academic credibility** | Born from Stanford research, published papers | Technical spec (`SMNTC-SPEC.md`) establishes engineering rigor |
| **Modular architecture (v4+)** | `d3-scale`, `d3-color`, `d3-shape` — use only what you need | `smntc/core`, `smntc/react`, `smntc/physics` — tree-shakeable |

**Critical insight:** D3 won because it was **the lowest common denominator** — everything else was built on top of it. SMNTC should aim to be the primitive layer that higher-level tools build upon.

### 1.4 Design Tokens (W3C DTCG Spec)

**Key Stats:** W3C Community Group, `Design Tokens Format Module 2025.10` (draft), adopted by Figma, Style Dictionary, Terrazzo.

**How the spec works:**

```json
{
  "color": {
    "$type": "color",
    "primary": {
      "$value": { "colorSpace": "srgb", "components": [0, 0.4, 0.8] },
      "$description": "Primary brand color"
    }
  }
}
```

**Key architectural patterns:**

| Pattern | W3C Design Tokens | SMNTC Today | SMNTC Opportunity |
|---|---|---|---|
| **Typed tokens** | `$type: "color"`, `"dimension"`, `"duration"` | Implicit — surface, vibe, palette are types | Formalize as a typed token schema |
| **Groups** | Hierarchical JSON organization | Flat — one config object | Add grouping / theme composition |
| **Aliases/References** | `{color.primary}` referencing other tokens | None | Allow token composition (`palette: '{brand.palette}'`) |
| **Extensions** | `$extensions` for vendor-specific metadata | None | `$extensions: { "smntc": { surface: "fluid" } }` |
| **Translation tools** | Style Dictionary converts tokens → platform code | `resolveConstants()` converts tokens → shader uniforms | Export to CSS custom properties, Figma variables, etc. |
| **Composite types** | `shadow`, `typography`, `border` | `SMNTCConfig` is a composite of surface + vibe + ... | Formalize as a composite visual token type |

**Critical insight:** SMNTC's semantic tokens ARE design tokens — they just happen to resolve to shader math instead of CSS values. **Positioning SMNTC as "design tokens for the GPU"** connects it to a massive existing movement and toolchain.

---

## Part 2: Architectural Patterns — Engine vs. Library

### 2.1 What Separates an "Engine" from a "Library"

| Trait | Library | Engine | SMNTC Today | SMNTC Target |
|---|---|---|---|---|
| **Plugin system** | None or basic | First-class, documented API | ❌ None | ✅ Register custom surfaces, vibes, palettes |
| **Middleware/pipeline** | Monolithic | Composable transform pipeline | ⚠️ Implicit (tokenizer → transformer → kernel) | ✅ Explicit, hookable pipeline |
| **Preset/theme system** | Config file | Shareable, composable presets | ❌ Hard-coded dictionary | ✅ `@smntc/preset-corporate`, `@smntc/preset-gaming` |
| **Multiple output targets** | One renderer | Pluggable renderers | ❌ WebGL only (Three.js) | ✅ WebGL, CSS, Canvas2D, SVG |
| **DevTools** | `console.log` | Visual inspector, profiler | ❌ None | ✅ VS Code extension, browser DevTools panel |
| **Schema/validation** | TypeScript types | Runtime + static validation | ⚠️ Runtime TypeError on invalid tokens | ✅ JSON Schema + VS Code autocomplete |
| **Ecosystem hooks** | npm package | CLI, CDN, bundler plugins, IDE extensions | ⚠️ npm only | ✅ CLI, CDN, Deno, Bun, VS Code, Figma |

### 2.2 The Plugin Architecture SMNTC Needs

```typescript
// === PHASE 1: Register custom tokens ===
import { defineSurface, defineVibe, definePalette } from 'smntc/plugins';

// Third-party can add new surfaces
const aurora = defineSurface('aurora', {
  mode: 4,
  noiseScale: 1.8,
  shader: /* glsl */`
    // Custom vertex displacement for aurora effect
    float displacement = fbm(position.xz * noiseScale + uTime * 0.3);
  `,
});

// === PHASE 2: Composable presets ===
import { definePreset } from 'smntc/plugins';

export const corporatePreset = definePreset({
  name: 'corporate',
  surfaces: ['topographic', 'fluid'],      // Restrict available surfaces
  palettes: {                               // Custom palette definitions
    'brand-blue': { primary: [0.1, 0.3, 0.8], accent: [0.9, 0.9, 1.0], background: [0.02, 0.02, 0.05] },
  },
  defaults: { surface: 'topographic', vibe: 'stable', wireframe: true },
});

// === PHASE 3: Output target plugins ===
import { defineCSSTarget } from 'smntc/targets';

// Compile semantic tokens to CSS custom properties + CSS animation
const cssOutput = defineCSSTarget({
  surface: 'fluid',
  vibe: 'calm',
  palette: 'arctic',
}); // → CSS keyframes + custom properties, no WebGL required
```

### 2.3 Multi-Target Output Architecture

Currently SMNTC only outputs WebGL via Three.js. To become an engine, it needs pluggable renderers:

```
SMNTCConfig (semantic tokens)
  │
  ├──→ WebGL Target (current)     → Three.js ShaderMaterial, GPU-accelerated
  │
  ├──→ CSS Target (Phase 2)       → @keyframes + CSS custom properties
  │                                  No JS runtime, pure CSS animation
  │                                  Covers 60% of landing page use cases
  │
  ├──→ Canvas2D Target (Phase 3)  → requestAnimationFrame + Canvas API
  │                                  Works without WebGL support
  │
  ├──→ SVG Target (Phase 3)       → Animated SVG paths + filters
  │                                  SSR-friendly, accessible
  │
  └──→ Static Target (Phase 2)    → Single-frame PNG/SVG export
                                     For OG images, thumbnails, print
```

**Why this matters:** The CSS target alone would unlock adoption for the vast majority of web developers who want animated backgrounds but don't want to learn Three.js.

---

## Part 3: The Design Tokens Bridge

### 3.1 SMNTC Tokens ↔ W3C Design Tokens

SMNTC should natively import/export W3C Design Tokens format:

```json
{
  "smntc": {
    "$description": "Visual motion design tokens",
    "hero-background": {
      "$type": "smntc/surface-config",
      "$value": {
        "surface": "fluid",
        "vibe": "calm",
        "palette": "{brand.palette.primary}",
        "reactivity": "magnetic",
        "fidelity": "high"
      },
      "$extensions": {
        "dev.smntc": {
          "resolvedConstants": {
            "frequency": 0.5,
            "amplitude": 0.08,
            "damping": 0.80
          }
        }
      }
    }
  }
}
```

### 3.2 Integration with Style Dictionary / Terrazzo

```javascript
// style-dictionary.config.js
import { smntcTransform } from '@smntc/style-dictionary';

export default {
  source: ['tokens/**/*.tokens.json'],
  platforms: {
    web: {
      transforms: [...smntcTransform],  // Resolves SMNTC tokens to CSS vars
      buildPath: 'build/',
    },
  },
};
```

### 3.3 Figma Variables ↔ SMNTC Tokens

A Figma plugin that:
1. **Reads** Figma color variables and maps them to SMNTC palette tokens
2. **Previews** SMNTC surfaces directly in a Figma widget
3. **Exports** a `.tokens.json` file with SMNTC extensions that developers drop into their project

This connects designers → developers through the same token vocabulary.

---

## Part 4: Ecosystem Integration Points

### 4.1 Distribution Channels

| Channel | Priority | Status | Action |
|---|---|---|---|
| **npm** | P0 | ✅ Done | `npm install smntc three` |
| **CDN (esm.sh / unpkg)** | P1 | ❌ | Add UMD/IIFE build, test CDN delivery |
| **Deno** | P2 | ❌ | Ensure ESM imports work, add to deno.land/x |
| **Bun** | P2 | ❌ | Test Bun compatibility, add to bun.sh registry |
| **JSR** | P2 | ❌ | Publish to jsr.io for Deno/Bun-first consumers |
| **GitHub Packages** | P3 | ❌ | Mirror for enterprise consumers |

### 4.2 IDE / Editor Integration

| Integration | Priority | Value |
|---|---|---|
| **VS Code Extension** | P1 | Autocomplete for token values, inline color previews for palettes, hover documentation, live preview panel |
| **VS Code Snippets** | P1 | `smntc-kernel`, `smntc-react`, `smntc-hook` snippets |
| **JSON Schema** | P0 | ✅ Already have `smntc.schema.json` — register with SchemaStore.org for auto-detection |
| **TypeScript LSP** | P0 | ✅ Types already provide autocomplete — ensure `@intellisense` JSDoc comments |
| **Cursor/AI rules** | P1 | `.cursorrules` / `.github/copilot-instructions.md` for AI-assisted SMNTC coding |

### 4.3 Framework Integrations

| Framework | Priority | Scope |
|---|---|---|
| **React (R3F)** | P0 | ✅ Done — `<SMNTCSurface>`, `useSMNTC()` |
| **Next.js** | P1 | SSR-safe wrapper, dynamic imports, App Router support |
| **Astro** | P1 | `<SMNTCSurface client:only="react" />` recipe, Astro integration |
| **Vue** | P2 | `<SmntcSurface>` component via `@smntc/vue` + TresJS |
| **Svelte** | P2 | `<SmntcSurface>` component via `@smntc/svelte` + Threlte |
| **Vanilla (no framework)** | P1 | `<script>` tag + CDN, Web Component `<smntc-surface>` |
| **Storybook** | P1 | Addon for visual token browsing + live preview |

### 4.4 Design Tool Integrations

| Tool | Priority | Scope |
|---|---|---|
| **Figma Plugin** | P1 | Preview SMNTC surfaces, export as tokens, sync palettes from Figma variables |
| **Storybook Addon** | P1 | Token explorer sidebar, live-swap vibes/palettes/surfaces |
| **Chromatic** | P3 | Visual regression testing for SMNTC surfaces |

---

## Part 5: Preset / Theme Marketplace

### 5.1 Architecture

```
@smntc/preset-corporate     → Stable, monochrome, topographic — SaaS landing pages
@smntc/preset-gaming         → Chaotic, neon, glitch — gaming sites
@smntc/preset-luxury         → Calm, phantom, crystalline — fashion/luxury
@smntc/preset-health         → Stable, arctic, fluid — healthcare/wellness
@smntc/preset-fintech        → Calm, monochrome, topographic — banking/finance
@smntc/preset-creative       → Agitated, neon, fluid — portfolio/creative agency
```

### 5.2 Preset Format

```typescript
// @smntc/preset-corporate/index.ts
import { definePreset } from 'smntc/plugins';

export default definePreset({
  name: 'corporate',
  author: 'SMNTC Core',
  description: 'Clean, professional surfaces for enterprise and SaaS.',

  // Restrict token vocabulary to brand-safe values
  allowedSurfaces: ['topographic', 'fluid'],
  allowedVibes: ['stable', 'calm'],

  // Add industry-specific palettes
  palettes: {
    'corporate-blue': { primary: [0.15, 0.35, 0.85], accent: [0.9, 0.95, 1.0], background: [0.02, 0.02, 0.04] },
    'corporate-green': { primary: [0.1, 0.7, 0.5], accent: [0.85, 1.0, 0.92], background: [0.02, 0.04, 0.03] },
  },

  // Recommended defaults
  defaults: {
    surface: 'topographic',
    vibe: 'stable',
    palette: 'corporate-blue',
    wireframe: true,
    fidelity: 'high',
    intensity: 0.5,
  },
});
```

### 5.3 Marketplace Model (Study: Tailwind Plus / Shadcn)

| Model | Example | Revenue | Community |
|---|---|---|---|
| **Open core** | Free engine + paid presets | Sustainable | Risk: fragmentation |
| **Shadcn model** | Copy-paste presets, no npm dependency | None (goodwill) | High adoption, low friction |
| **Gallery submissions** | Community submits configs, curated showcase | None | Strong community driver |
| **Premium visual editor** | Web-based SMNTC Studio for designing surfaces | Subscription | High stickiness |

**Recommended approach:** **Shadcn model first, premium Studio later.**
- Phase 1: All presets are open-source, copy-paste from docs/CLI
- Phase 2: SMNTC Studio (web app) for visual surface design — freemium
- Phase 3: Premium presets with advanced shader effects (custom noise functions, multi-pass)

---

## Part 6: Community Building for Visual Tools

### 6.1 Study: What Works for Visual Libraries

| Tactic | Tailwind | Motion | D3 | SMNTC Plan |
|---|---|---|---|---|
| **Showcase gallery** | tailwindcss.com/showcase | Made with Motion | Observable gallery | smntc.dev/gallery — user-submitted sites |
| **Playground** | play.tailwindcss.com | CodeSandbox examples | Observable notebooks | play.smntc.dev — instant browser preview |
| **Discord** | Tailwind Insiders (paid) | Motion+ Discord (600+) | N/A (forums) | SMNTC Discord — free tier |
| **Video content** | Not primary | Tutorials by creator | Talks/courses | YouTube: "SMNTC in 60 seconds" series |
| **Twitter/social** | @tailwindcss (massive) | @motiondotdev | @d3js_org | Visual demos as short-form video (very shareable) |
| **LLM discoverability** | Not prioritized | AI rules as feature | N/A | ✅ Already best-in-class (llms.txt, schema) |
| **Conference talks** | Many by Adam Wathan | React conferences | IEEE VIS, academic | Web dev conferences + creative coding meetups |

### 6.2 Visual Tools Have a Unique Advantage: Shareability

SMNTC surfaces are **inherently visual**. This creates a viral loop:

```
Developer uses SMNTC → Ships beautiful landing page → Someone asks "how'd you make that?" →
They find SMNTC → Developer uses SMNTC → ...
```

**High-priority content strategy:**
1. **30-second demo videos** showing token changes → visual results (Twitter/TikTok/YouTube Shorts)
2. **"Copy this config" gallery** — each entry is a working `SMNTCConfig` JSON blob
3. **Before/After comparisons** — "50 lines of GLSL" vs "1 line of SMNTC"
4. **AI generation demos** — "I told GPT to make a landing page background and it used SMNTC"

---

## Part 7: Strategic Roadmap — Phased Plan

### Phase 0: Foundation (Current State) ✅

- [x] Core engine (Tokenizer → Transformer → Kernel)
- [x] React integration (SMNTCSurface, useSMNTC)
- [x] Spring physics for all transitions
- [x] 52 tests, CI pipeline, TypeScript
- [x] LLM context files (llms.txt, llms-full.txt, smntc.schema.json)
- [x] MIT license, CHANGELOG, CONTRIBUTING

### Phase 1: Adoption Infrastructure (Months 1-3)

**Goal:** Make SMNTC trivially easy to discover, try, and adopt.

| Priority | Task | Impact |
|---|---|---|
| P0 | **Online playground** — `play.smntc.dev` (Astro/Vite app with live token editor → WebGL preview) | Discovery, experimentation |
| P0 | **Gallery of 10+ configs** — Hero backgrounds, product showcases, interactive demos with copy-paste JSON | Social proof, adoption |
| P0 | **npm publish** — Publish v1.0.0 to npm registry | Availability |
| P0 | **Register JSON Schema** — Submit `smntc.schema.json` to SchemaStore.org | IDE autocomplete everywhere |
| P1 | **CDN build** — UMD/IIFE bundles for `<script>` tag usage | Zero-build-step adoption |
| P1 | **Next.js recipe** — SSR-safe integration guide + example repo | Framework adoption |
| P1 | **Storybook addon** — Browse tokens, swap vibes/surfaces/palettes in sidebar | Design system integration |
| P1 | **AI editor rules** — `.cursorrules`, `.github/copilot-instructions.md` | AI-assisted development |
| P2 | **Web Component** — `<smntc-surface>` custom element, no framework needed | Universal adoption |
| P2 | **"Awesome SMNTC"** — Curated list of examples, presets, integrations | Community hub |

### Phase 2: Engine Architecture (Months 3-6)

**Goal:** Transform SMNTC from a library into an extensible engine.

| Priority | Task | Impact |
|---|---|---|
| P0 | **Plugin API** — `defineSurface()`, `defineVibe()`, `definePalette()`, `definePreset()` | Ecosystem unlocked |
| P0 | **Preset system** — Shareable presets as npm packages or JSON blobs | Composability |
| P0 | **CSS output target** — Compile semantic tokens → CSS custom properties + @keyframes | 10x addressable market |
| P1 | **Static export** — Single-frame PNG/SVG for OG images, thumbnails | SEO, social sharing |
| P1 | **Hookable pipeline** — `onBeforeTransform`, `onAfterTransform`, `onBeforeRender` hooks | Advanced customization |
| P1 | **Design Tokens export** — Generate W3C `.tokens.json` from SMNTC config | Design tool integration |
| P2 | **Canvas2D target** — Fallback renderer for non-WebGL environments | Universal compatibility |
| P2 | **SVG target** — Animated SVG for SSR-friendly, accessible contexts | SSR, accessibility |
| P2 | **CLI tool** — `npx smntc init`, `npx smntc preview`, `npx smntc export` | DX polish |

### Phase 3: Ecosystem & Integrations (Months 6-12)

**Goal:** Make SMNTC the default choice by connecting to every tool designers and developers use.

| Priority | Task | Impact |
|---|---|---|
| P0 | **VS Code extension** — Token autocomplete, palette color previews, inline docs, live preview panel | Developer experience |
| P0 | **Figma plugin** — Preview surfaces, sync palettes from Figma variables, export tokens | Designer adoption |
| P1 | **Vue + Svelte bindings** — First-class components for TresJS and Threlte | Framework coverage |
| P1 | **Style Dictionary integration** — `@smntc/style-dictionary` transform plugin | Design system toolchains |
| P1 | **SMNTC Studio** — Web-based visual surface designer with real-time preview | No-code adoption |
| P2 | **Preset marketplace** — Community-submitted presets, curated and searchable | Ecosystem growth |
| P2 | **Deno / Bun / JSR** — Test and publish for all modern runtimes | Runtime coverage |
| P2 | **Framer integration** — SMNTC as a Framer component | No-code adoption |

### Phase 4: Industry Standard (Months 12-24)

**Goal:** Establish SMNTC as essential infrastructure for visual web development.

| Priority | Task | Impact |
|---|---|---|
| P0 | **Specification formalization** — Submit "Visual Motion Tokens" as W3C Community Group report | Standards credibility |
| P1 | **Framework adapters** — Official Next.js, Nuxt, SvelteKit, Remix adapters | Zero-config in meta-frameworks |
| P1 | **Performance benchmarks** — Published, reproducible GPU performance data vs. alternatives | Technical credibility |
| P1 | **Enterprise presets** — Accessibility-certified presets (photosensitivity-safe, reduced-motion) | Enterprise adoption |
| P2 | **Education** — University curriculum materials, creative coding workshop kits | Long-term adoption |
| P2 | **Conference circuit** — Talks at React Conf, ViteConf, CSS Day, Creative Coding meetups | Awareness |

---

## Part 8: Competitive Positioning

### 8.1 SMNTC's Unique Moat

No existing tool combines all three:

```
┌─────────────────────────────────────────────────┐
│                                                 │
│   Design Tokens          GPU Shaders            │
│   (W3C DTCG)       +    (GLSL/WebGL)           │
│                                                 │
│              ┌─────────────┐                    │
│              │   SMNTC     │                    │
│              │   Semantic  │                    │
│              │   Visual    │                    │
│              │   Compiler  │                    │
│              └─────────────┘                    │
│                                                 │
│   Semantic Intent        LLM-Native             │
│   (Human-readable)  +   (AI-generable)          │
│                                                 │
└─────────────────────────────────────────────────┘
```

- **Tailwind** = semantic vocabulary for CSS → SMNTC = semantic vocabulary for GPU visuals
- **Motion** = declarative animation for React → SMNTC = declarative surfaces for any mesh
- **D3** = data → visualization mapping → SMNTC = intent → shader mapping
- **Design Tokens** = cross-platform style values → SMNTC = cross-platform visual motion values

### 8.2 The "Tailwind for Shaders" Narrative

The positioning should be: **"SMNTC is to WebGL what Tailwind is to CSS."**

| Tailwind | SMNTC |
|---|---|
| You don't write CSS — you compose utility classes | You don't write GLSL — you compose semantic tokens |
| `className="bg-blue-500 text-white rounded-lg"` | `{ surface: 'fluid', vibe: 'calm', palette: 'arctic' }` |
| Generates only the CSS you use | Generates only the shader branches you use |
| Theme customization via `@theme {}` | Preset customization via `definePreset()` |
| Plugin ecosystem for custom utilities | Plugin ecosystem for custom surfaces/vibes |
| Works with any framework | Works with any Three.js-based setup |

### 8.3 Why LLM-Native Matters

SMNTC is the **first visual engine designed for AI consumption**. This is a strategic advantage that compounds over time:

1. **LLMs can generate valid SMNTC configs** from natural language ("make a calm blue background")
2. **The token vocabulary is small enough** to fit entirely in an LLM context window
3. **Validation is instant** — invalid tokens throw at runtime, LLMs get immediate feedback
4. **The llms.txt standard** is emerging as a discovery mechanism — SMNTC is early
5. **AI-generated web pages** are growing exponentially — SMNTC should be the default visual layer

---

## Part 9: Metrics for Success

### Leading Indicators (Track Monthly)

| Metric | Phase 1 Target | Phase 2 Target | Phase 4 Target |
|---|---|---|---|
| npm weekly downloads | 500 | 5,000 | 100,000 |
| GitHub stars | 500 | 3,000 | 15,000 |
| Playground monthly visits | 1,000 | 10,000 | 100,000 |
| Community presets published | 5 | 30 | 200 |
| Sites using SMNTC (est.) | 50 | 500 | 10,000 |
| LLM mentions (ChatGPT, Claude) | Occasional | Frequent | Default recommendation |

### Lagging Indicators (Track Quarterly)

| Metric | Signal |
|---|---|
| Framework integration PRs from community | Ecosystem taking root |
| "SMNTC" in job descriptions / tech stacks | Industry adoption |
| Conference talk invitations | Thought leadership |
| Enterprise inquiries for custom presets | Commercial viability |
| W3C Community Group participation | Standards influence |

---

## Part 10: Immediate Next Actions (This Week)

1. **Publish to npm** — `npm publish` v1.0.0
2. **Submit JSON Schema to SchemaStore.org** — PR to [schemastore/schemastore](https://github.com/SchemaStore/schemastore)
3. **Create `play.smntc.dev`** — Minimal Vite app: token editor sidebar + WebGL preview
4. **Write 5 gallery configs** — Landing page hero, product showcase, interactive demo, dark theme, light theme
5. **Create `.cursorrules`** — AI coding rules for Cursor/Copilot users
6. **Write "SMNTC in 60 seconds" blog post** — Problem → Solution → 5-line code example → live demo
7. **Open GitHub Discussions** — Enable Discussions tab for community Q&A

---

## Appendix A: Revenue Model Options

| Model | When | Revenue Potential | Risk |
|---|---|---|---|
| **Open-source core (current)** | Phase 0-2 | $0 | Sustainability |
| **Premium presets** | Phase 2+ | Low-medium | Market size |
| **SMNTC Studio (SaaS)** | Phase 3+ | Medium-high | Development cost |
| **Enterprise licenses** | Phase 4+ | High | Sales complexity |
| **Sponsorships** | Phase 1+ | Low-medium | Dependent on popularity |
| **Consulting/integration** | Phase 2+ | Medium | Doesn't scale |

**Recommended path:** Sponsorships (Phase 1) → Premium Studio (Phase 3) → Enterprise (Phase 4)

## Appendix B: Key Reference Links

- [W3C Design Tokens Format Module 2025.10](https://www.designtokens.org/TR/drafts/format/)
- [Tailwind CSS v4 Architecture](https://tailwindcss.com/blog/tailwindcss-v4)
- [Motion (formerly Framer Motion)](https://motion.dev/)
- [D3.js](https://d3js.org/)
- [Style Dictionary](https://github.com/style-dictionary/style-dictionary)
- [Terrazzo (Design Tokens CLI)](https://github.com/terrazzoapp/terrazzo)
- [SchemaStore.org](https://www.schemastore.org/json/)
- [Shadcn/ui Component Model](https://ui.shadcn.com/)
