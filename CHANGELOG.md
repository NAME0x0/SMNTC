# Changelog

All notable changes to SMNTC will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

#### New Semantic Tokens
- **4 new surfaces:** `organic` (domain-warped simplex), `terrain` (ridged multi-fractal), `plasma` (animated FBM), `wave` (multi-directional Gerstner).
- **5 new vibes:** `breathing` (ultra-slow pulse), `pulse` (heartbeat cadence), `drift` (gentle wind-like), `storm` (intense turbulence), `cinematic` (film-grade sweep).
- **8 new palettes:** `ocean`, `sunset`, `matrix`, `vapor`, `gold`, `infrared`, `aurora`, `midnight`.

#### VFX Properties (Post-Processing Pipeline)
- `angle` — Displacement rotation in degrees [0–360].
- `grain` — Film grain intensity [0–1]. Time-varying dual-noise implementation.
- `glow` — Bloom/glow strength [0–2]. Applied to both wireframe and solid modes.
- `chromatic` — Chromatic aberration [0–1]. UV-displacement RGB channel splitting.
- `vignette` — Edge darkening [0–1]. Smoothstep radial falloff.
- `blur` — Depth blur simulation [0–1]. Distance-based softening.

#### New Setters
- `setAngle()`, `setGrain()`, `setGlow()`, `setChromatic()`, `setVignette()`, `setBlur()` on both `SMNTCKernel` and `SMNTCMaterial`.

#### New Examples
- `examples/cinema4d/` — Cinema 4D / Octane-inspired renderer viewport with camera orbit and cinematic presets.
- `examples/aftereffects/` — After Effects NLE-style compositor with timeline, layers, effect sliders, and playback controls.
- `examples/generative/` — Generative art playground with seeded PRNG, PNG export, and gallery strip.

#### Enhanced Examples
- `examples/basic/` — Complete rewrite with glassmorphism controls, all 8 surfaces, 9 vibes, 13 palettes, 7 VFX sliders, keyboard shortcuts.
- `examples/hero/` — Premium landing page with typewriter headline, CTA buttons, stat badges, scroll parallax.
- `examples/ambient/` — SaaS dashboard with stat cards, sparklines, activity chart, surface/vibe/palette selectors.
- `examples/product/` — Product showcase with palette carousel, feature highlights, glassmorphism card.
- `examples/web-component/` — Design system explorer with live config preview, token inspector, copy-to-clipboard.

#### Infrastructure
- Web component `<smntc-surface>` now supports `angle`, `grain`, `glow`, `chromatic`, `vignette`, `blur` attributes.
- React `<SMNTCSurface>` component accepts all 6 new VFX props with spring-interpolated transitions.
- `SMNTCMaterial` spring bank expanded with 6 new spring channels for smooth VFX transitions.
- `smntc.schema.json` updated with all new enum values and VFX property definitions.
- 68 unit tests (expanded from 42) covering all new tokens and VFX clamping.

### Changed
- Vertex shader expanded from 4→8 surface displacement modes with angle rotation.
- Fragment shader completely rewritten with full post-processing pipeline (grain, glow, chromatic aberration, vignette, blur).
- Security policy (`SECURITY.md`) and community code of conduct (`CODE_OF_CONDUCT.md`).
- GitHub Sponsors configuration (`.github/FUNDING.yml`).
- JSR registry config (`jsr.json`) and StackBlitz config (`stackblitz.json`).
- Bundle size budget checks (size-limit) and build analysis script.
- Additional no-build demos (`examples/hero`, `examples/ambient`, `examples/product`, `examples/web-component`).
- Vanilla starter template (`templates/vanilla`) for quick adoption.

### Changed
- README badges and CDN usage snippets for faster discoverability and zero-build adoption.

## [1.1.0] - 2026-02-07

### Added
- **Plugin registry & preset system** — runtime-extensible token definitions via `defineSurface`, `defineVibe`, `defineReactivity`, `defineFidelity`, `definePalette`; preset bundles with `definePreset` / `applyPreset`; `listTokens()` introspection.
- **SMNTCMaterial** — `ShaderMaterial` subclass encapsulating full SMNTC config, spring physics, input proxy, and auto-scaler; semantic setters (`setVibe`, `setSurface`, `setPalette`, etc.).
- **R3F material element** — `useSMNTCMaterial` hook; auto-register `<smntcMaterial>` JSX element via `extend()`; JSX type declarations.
- **Web component** — `<smntc-surface>` custom element with attribute-driven config, shadow DOM canvas, resize observer, and geometry variants (plane/sphere/torus).
- **CLI** — `smntc init`, `smntc add <preset>`, `smntc preview`.
- **CDN/IIFE builds** — `dist/index.iife.global.js` and `dist/web/index.iife.global.js` (Three.js bundled).
- **Multi-entry tsup build** — core (ESM + CJS), react (ESM + CJS), web (ESM), IIFE, CLI.
- **GitHub Actions Release workflow** — publish to npm with provenance + GitHub Release on version tag.

### Changed
- Build system migrated from inline tsup to `tsup.config.ts` with 6 build entries.
- `package.json` exports expanded: `"./react"` and `"./web"` sub-paths; `bin` entry for CLI.
- Dictionary now reads from mutable registry instead of static maps (backward-compatible).
- CI workflow enhanced with dist output verification step.

## [1.0.0] - 2026-02-07

### Added
- `SMNTCKernel` — core orchestrator with uber vertex/fragment shaders.
- Semantic token dictionary: surface, vibe, reactivity, fidelity, palette.
- Spring physics engine (damped harmonic oscillator) for all state transitions.
- `InputProxy` — pointer/touch capture with raycasting.
- `AutoScaler` — adaptive fidelity controller targeting 60 FPS.
- `<SMNTCSurface />` React-Three-Fiber component and `useSMNTC()` hook.
- `llms.txt` and `llms-full.txt` for LLM context discoverability.
- `smntc.schema.json` — JSON Schema for `SMNTCConfig` validation.
- Runtime token enumerations and validation (throws `TypeError` on invalid tokens).
- Test suite (53 tests) covering semantic dictionary, token validation, and spring physics.
- GitHub Actions CI pipeline (typecheck, build, test across Node 18/20/22).
- Zero-build-step HTML demo (`examples/basic/`).
- Technical specification (`SMNTC-SPEC.md`).

### Fixed
- Dual import path eliminated — `dictionary.ts` is the single source of truth.
- Unsafe blending replaced with `THREE.NormalBlending`.
- `InputProxy` uses proper `THREE.Vector2` for raycaster; bounding rect cached with resize invalidation.
- Spring references cached in Kernel — eliminates `Map.get()` per frame.
- `package.json` exports condition ordering — `types` precedes `import`/`require`.

## [0.1.0] - 2026-02-06

### Added
- Initial project scaffolding and README.

[Unreleased]: https://github.com/NAME0x0/SMNTC/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/NAME0x0/SMNTC/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/NAME0x0/SMNTC/compare/v0.1.0...v1.0.0
[0.1.0]: https://github.com/NAME0x0/SMNTC/releases/tag/v0.1.0