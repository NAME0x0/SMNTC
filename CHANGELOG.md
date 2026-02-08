# Changelog

All notable changes to SMNTC will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
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