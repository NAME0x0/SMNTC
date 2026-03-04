# SMNTC vNext - OPUS-4.6 Task Assignments

Agent lane: `OPUS-4.6`  
Coordination file: `AGENT-COMMS.md`  
Master contract: `SMNTC-EXECUTION-CONTRACT.md`

## Role Focus (Opus Strengths)

Opus lane is delegated tasks that require:
- System architecture and sequencing
- Contract/spec coherence decisions
- Risk analysis and acceptance-gate design
- Migration and release strategy
- Product framing and adoption strategy

## Active Delegation Queue

## OPUS-P0-01 | Canonical Config Contract RFC
- Priority: P0
- Owner: OPUS-4.6
- Scope:
  - Define one canonical config shape across runtime/types/schema/docs.
  - Decide compatibility strategy for current drift (`flat` vs `nested animation/effects`).
  - Propose migration policy with deprecation timeline.
- Required output:
  - RFC summary
  - Mapping table (old -> canonical)
  - CI guardrail list
- Acceptance:
  - No unresolved contradiction between `src/semantic/tokens.ts`, schemas, and README examples.

## OPUS-P0-02 | Runtime Correctness Validation Matrix
- Priority: P0
- Owner: OPUS-4.6
- Scope:
  - Validate and prioritize correctness fixes:
    - world/local reactivity space
    - shockwave timing model
    - export fallback/offscreen behavior
  - Define verification scenarios and pass criteria.
- Required output:
  - Defect matrix (issue, severity, reproducer, expected fix behavior)
  - Validation checklist for Codex implementation
- Acceptance:
  - Each P0 defect has unambiguous testable pass condition.

## OPUS-P1-01 | Real Auto-Scaling Strategy
- Priority: P1
- Owner: OPUS-4.6
- Scope:
  - Propose geometry/LOD scaling approach with minimal API breakage.
  - Define fail-safe behavior and hysteresis to avoid oscillation.
- Required output:
  - Design proposal with tradeoffs and rollout plan.
- Acceptance:
  - Strategy can be implemented incrementally without breaking current API.

## OPUS-P1-02 | Test and Reliability Expansion Plan
- Priority: P1
- Owner: OPUS-4.6
- Scope:
  - Browser integration testing architecture (jsdom/happy-dom + browser smoke).
  - Visual regression and export confidence strategy.
- Required output:
  - Test matrix + CI stage plan + required fixtures.
- Acceptance:
  - Plan covers critical runtime surfaces currently untested.

## OPUS-P2-01 | Release Hygiene + Positioning Brief
- Priority: P2
- Owner: OPUS-4.6
- Scope:
  - Version messaging cleanup and schema artifact policy.
  - Public positioning: replacement scope for effects workflows (not full NLE).
- Required output:
  - Release checklist
  - Messaging brief
- Acceptance:
  - No public claims that exceed implemented capability.

## Reporting Rules

1. OPUS-4.6 posts all status updates in `AGENT-COMMS.md` using the message template.
2. Every task update includes: current status, decisions, blockers, and next step.
3. CODEX responds with implementation handoff messages and closure confirmation.
