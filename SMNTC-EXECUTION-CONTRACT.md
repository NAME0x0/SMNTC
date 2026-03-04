# SMNTC Execution Plan and Delivery Contract

## 1) Purpose

This contract defines the execution plan to evolve SMNTC from a strong technical prototype into a trusted production library and AI-native motion platform.

It merges:
- Existing engineering issues (P0/P1/P2)
- Strategic product requirements (determinism, timeline/compositing, export, AI contract, primitives, ecosystem, reliability, UX, positioning)

## 2) Product Outcome

SMNTC will be positioned as:
- The fastest way to generate high-quality semantic motion effects for web and video
- A deterministic, API-first motion engine that AI and humans can rely on
- A production subsystem that can replace a meaningful slice of motion-tool subscriptions

Non-goal (for now):
- Full replacement of Premiere/C4D editing workflows (audio editing, full NLE, full DCC modeling pipeline)

## 3) Scope Priorities

## P0 (Must ship first)
1. Unify one canonical config contract and generate schema/docs from code (or vice versa).
2. Fix runtime correctness bugs (world/local reactivity, shockwave timing, export fallback/offscreen guards).

## P1 (Ship immediately after P0)
3. Make auto-scaling real (actual geometry/LOD changes, not only wireframe width).
4. Reduce hot-path cost (raycast-on-change, shader strategy for expensive modes).
5. Add browser integration tests (jsdom/happy-dom + browser smoke tests for export paths).

## P2 (Adoption and trust hardening)
6. Clean release hygiene (version messaging, template dependency, ship v2 schema, remove unimplemented claims).

## Strategic Workstreams (parallel after P0)
- Deterministic rendering engine
- Timeline + compositing model
- Headless production export
- AI-first contract
- High-level motion primitives
- Preset/template ecosystem
- Reliability engineering
- Creator UX layer
- Clear positioning

## 4) Delivery Phases

## Phase A: Contract and Correctness (P0) - 3 to 5 weeks

Deliverables:
- Canonical config spec with one source of truth
- Generated schema + docs + examples from canonical spec
- Compatibility adapter for legacy config shapes
- Runtime fixes:
  - Shockwave timebase consistency
  - Reactivity coordinate-space correctness
  - Export environment guards and fallback rules

Acceptance gate:
- 100% schema/runtime parity checks pass
- No known critical runtime correctness defects in tracked list
- All README and example configs validate and run

## Phase B: Performance and Real Scaling (P1) - 4 to 6 weeks

Deliverables:
- Real fidelity scaling via geometry/LOD rebuild path
- Input proxy optimization (raycast only when needed, reusable targets)
- Shader cost controls:
  - Heavy mode budget caps
  - Optional quality modes / shader variant strategy
- Performance benchmark suite and baseline reports

Acceptance gate:
- Auto-scaler reduces real GPU cost (measured vertex count / frame time reduction)
- Hot-path frame budget targets achieved on reference devices
- No regression in visual correctness tests

## Phase C: Reliability and Release Integrity (P2) - 2 to 4 weeks

Deliverables:
- Release/version policy and semver mapping
- Published schema artifacts for active contract versions
- Template/version sync automation
- Removal or implementation of unsupported claims (e.g., `model`)
- CI guardrails for docs/schema/runtime drift

Acceptance gate:
- Release checklist fully automated
- Docs/examples/schema cannot drift without CI failure
- Installation templates track current supported version

## Phase D: Platform Expansion - 8 to 16 weeks

Deliverables by workstream:
1. Deterministic engine:
  - Deterministic mode flags and seeded behaviors
  - Cross-GPU snapshot tolerance policy
2. Timeline/compositing:
  - Keyframes, easing, layer stack, blend/mask support
3. Headless export:
  - Frame-accurate MP4/WebM/PNG-sequence export pipeline
  - Abort/resume + progress + diagnostics
4. AI-first contract:
  - Capability-discovery endpoint/schema
  - Strict validation + actionable error taxonomy
5. Motion primitives:
  - Typography, logo reveals, camera moves, transitions
6. Preset ecosystem:
  - Curated production templates and preset packs
7. Reliability:
  - Browser matrix CI + visual regression + perf budgets
8. Creator UX:
  - Minimal editor with timeline scrub, preview, export wizard
9. Positioning:
  - Messaging and use-case pages focused on “replace effect workflows,” not full NLE replacement

Acceptance gate:
- Public beta launch criteria met (Section 6 KPIs)

## 5) Technical Contract Terms

1. Single source of truth:
- Config contract must be defined once and generated outward (schema/docs/types), or generated inward from schema with strict compile-time checks.

2. Backward compatibility:
- Breaking contract changes require version bump + migration layer + migration notes.

3. CI hard gates:
- Contract parity tests
- Example validity tests
- Browser integration tests
- Visual regression smoke tests
- Performance budget checks for core scenarios

4. Claim discipline:
- No README/schema claim is allowed without implemented code path and passing test coverage.

5. Determinism:
- Any nondeterministic behavior must be explicit and controllable via seed/config.

## 6) Success Metrics (Go/No-Go)

## Engineering
- Contract drift incidents: 0 in release candidates
- Critical runtime defects open > 7 days: 0
- Browser smoke coverage: latest stable Chrome/Edge/Firefox/Safari
- Export success rate (reference scenarios): >= 99%

## Performance
- Maintain 60 FPS target on reference mid-tier device for default scenes
- Auto-scaling must show measurable frame-time recovery under stress

## Adoption
- Time-to-first-good-effect: <= 10 minutes for new user
- AI-generated config success (valid + renderable): >= 95% on benchmark prompt suite

## Product fit
- Demonstrable replacement of target workflows:
  - Web hero/background effects
  - Logo stings
  - Social promo loops
  - Branded procedural motion kits

## 7) Governance and Ownership

Required owners:
- Contract Owner (schema/types/docs parity)
- Runtime Owner (kernel/material/shader correctness)
- Performance Owner (profiling + budgets)
- Export Owner (headless + browser export)
- DX Owner (examples/templates/docs)

Decision rule:
- P0 defects block all new feature work unless security/production incident requires exception.

## 8) Immediate Backlog (first sprint)

1. Canonical contract RFC and source-of-truth implementation.
2. Patch critical runtime correctness bugs (reactivity space + shockwave timebase + export guards/fallback).
3. Add parity tests proving config/schema/docs alignment.
4. Add browser integration test project and first export smoke tests.
5. Publish release hygiene checklist and remove unsupported public claims.

## 9) Final Commitment

This plan is accepted only if:
- P0 is completed before net-new platform features.
- Every milestone has measurable pass/fail gates.
- Public claims remain strictly evidence-backed by code and tests.

If those terms are followed, SMNTC can become a widely trusted motion library for both humans and AI systems.
