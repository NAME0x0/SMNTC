# Contributing to SMNTC

Thank you for considering a contribution to SMNTC. This document covers the conventions and
workflow you need to get started.

## Development Setup

```bash
git clone https://github.com/NAME0x0/SMNTC.git
cd SMNTC
npm install
```

Requires Node.js 20+.

### Available Scripts

| Command | Purpose |
|---------|---------|
| `npm run build` | Production build → `dist/` (ESM, CJS, DTS) |
| `npm run dev` | Watch-mode build (rebuilds on file change) |
| `npm run typecheck` | Type-check without emitting (`tsc --noEmit`) |
| `npm test` | Run the test suite (vitest) |
| `npm run lint` | ESLint the `src/` directory |
| `npm run perf:bench` | Run deterministic micro-benchmarks (no gate) |
| `npm run perf:budget` | Enforce CI performance budgets |
| `npm run perf:budget:report` | Enforce budgets and emit `artifacts/perf/benchmark-results.json` |
| `npm run perf:baseline:update` | Refresh `perf.baseline.json` from the latest perf report artifact |
| `npm run perf:baseline:lock` | Refresh baseline and enable regression enforcement |
| `npm run perf:baseline:unlock` | Refresh baseline and disable regression enforcement |

### Verify Before Submitting

```bash
npm run typecheck   # Must exit 0
npm run build       # Must produce dist/ with no warnings
npm test            # Must pass
npm run perf:budget # Must pass on Node 22 baseline
```

### Performance Baseline Workflow

1. Run CI once and download the Node 22 artifact `artifacts/perf/benchmark-results.json`.
2. Place it at `artifacts/perf/benchmark-results.json` locally.
3. Run `npm run perf:baseline:update` to refresh `perf.baseline.json`.
4. When ready to enforce regression checks, run `npm run perf:baseline:lock` and commit the updated baseline.
5. If baseline was locked from a non-CI source, run `npm run perf:baseline:unlock` before re-promoting from CI.

## Architecture Overview

```
src/
├── index.ts                 # Public barrel export
├── kernel/
│   ├── SMNTCKernel.ts       # Core orchestrator
│   ├── uniforms.ts          # TS → GLSL uniform bridge
│   └── shaders/             # GLSL uber vertex + fragment
├── semantic/
│   ├── tokens.ts            # Type definitions + const arrays
│   ├── dictionary.ts        # Token → constant mapping
│   └── transformer.ts       # Public resolveConstants()
├── physics/
│   └── spring.ts            # Damped harmonic oscillator
├── reactivity/
│   └── input-proxy.ts       # Pointer/touch capture
├── performance/
│   └── auto-scaler.ts       # Adaptive LOD controller
└── react/
    ├── index.ts             # React barrel export
    ├── SMNTCSurface.ts      # Declarative component
    └── useSMNTC.ts          # Hook
```

**Key principle:** The semantic layer (`tokens.ts`, `dictionary.ts`) is the *single source of truth*.
All valid values are defined in `tokens.ts` as `as const` arrays. Types are derived from those arrays.
The dictionary maps those tokens to numeric shader constants. Nothing else should hardcode token values.

## Adding a New Semantic Token

Example: adding a new palette called `'solar'`.

1. **`src/semantic/tokens.ts`** — Add `'solar'` to the `PALETTES` array. The `Palette` type
   updates automatically since it's derived via `(typeof PALETTES)[number]`.

2. **`src/semantic/dictionary.ts`** — Add the mapping in the palette lookup:
   ```typescript
   solar: { primaryColor: [1.0, 0.85, 0.0], accentColor: [1.0, 0.5, 0.0], backgroundColor: [0.05, 0.02, 0.0] },
   ```

3. **`smntc.schema.json`** — Add `'solar'` to the palette enum.

4. **`llms.txt` / `llms-full.txt`** — Update the token lists.

5. **`README.md`** — Add a row to the Palette table.

6. **Tests** — Add a test case for the new palette.

## Code Style

- **TypeScript strict mode** — no `any`, no unchecked index access
- **JSDoc on every public export** — including `@example` where applicable
- **Conventional commits** — `feat:`, `fix:`, `docs:`, `perf:`, `refactor:`, `test:`, `chore:`
- **No runtime dependencies** — `three` is a peer dep, everything else is built-in

## Pull Request Process

1. Fork the repo and create a feature branch from `main`
2. Make your changes with conventional commits
3. Ensure `typecheck`, `build`, and `test` all pass
4. Open a PR with a clear description of what and why
5. Maintainers will review — expect feedback within a few days

## Reporting Issues

Use the [issue templates](https://github.com/NAME0x0/SMNTC/issues/new/choose):

- **Bug report** — include reproduction steps and expected vs actual behavior
- **Feature request** — describe the use case and proposed tokens/API

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
