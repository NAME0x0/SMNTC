# Changelog

All notable changes to SMNTC will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- `llms.txt` and `llms-full.txt` for LLM context discoverability
- `smntc.schema.json` — JSON Schema for `SMNTCConfig` validation
- Runtime token enumerations: `SURFACES`, `VIBES`, `REACTIVITIES`, `FIDELITIES`, `PALETTES`
- `CONTRIBUTING.md` with development guidelines
- `LICENSE` file (MIT)
- GitHub Actions CI pipeline (typecheck, build, test)
- Issue templates for bugs and feature requests
- Test suite (vitest) with semantic layer coverage
- Runtime validation for all semantic token lookups (throws `TypeError` on invalid tokens)

### Fixed
- Dual import path eliminated — `dictionary.ts` is the single source of truth
- Unsafe `undefined as any` blending replaced with `THREE.NormalBlending`
- `InputProxy` now uses proper `THREE.Vector2` for `raycaster.setFromCamera()`
- `getBoundingClientRect()` cached in `InputProxy` (invalidated on resize)
- Spring references cached in Kernel — eliminates `Map.get()` per frame
- `require()` calls moved to module scope in React entry points
- `package.json` exports condition ordering — `types` now precedes `import`/`require`

### Changed
- `AutoScaler` frametime buffer replaced with `Float64Array` ring buffer + running sum (O(1) insert and average)
- `transform()` deprecated in favor of `resolveConstants()`
- Token union types now derived from `as const` arrays (single source of truth)

### Deprecated
- `transform()` — use `resolveConstants()` instead

## [1.0.0] - 2026-02-07

### Added
- Initial release
- `SMNTCKernel` — core orchestrator with uber vertex/fragment shaders
- Semantic token dictionary: surface, vibe, reactivity, fidelity, palette
- Spring physics engine (damped harmonic oscillator) for all state transitions
- `InputProxy` — pointer/touch capture with raycasting
- `AutoScaler` — adaptive fidelity controller targeting 60 FPS
- `<SMNTCSurface />` React-Three-Fiber component
- `useSMNTC()` React hook
- Zero-build-step HTML demo (`examples/basic/`)
- Technical specification (`SMNTC-SPEC.md`)
