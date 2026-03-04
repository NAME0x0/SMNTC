# SMNTC Evolution: Master Implementation Plan

> **Project:** SMNTC v2.0 — Text/Logo Mesh Engine  
> **Orchestrator:** Claude Opus 4.5  
> **Agents:** Codex 5.2 High, Gemini 3 Pro  
> **Started:** 2026-02-11  
> **Status:** 🟡 In Progress

---

## Vision Statement

Transform SMNTC from a semantic shader library into a **complete visual motion compiler** that:
1. Accepts text, logos, and images as first-class inputs
2. Auto-generates optimized meshes using ML-assisted techniques
3. Applies semantic animations with minimal configuration
4. Exports to multiple targets (WebGL, CSS, Video, Static)

---

## Agent Roster & Strengths

| Agent | Model | Primary Strengths | Assignment Focus |
|-------|-------|-------------------|------------------|
| **ORCHESTRATOR** | Claude Opus 4.5 | Complex reasoning, integration, code review, architecture | Coordination, final review, complex integrations |
| **CODEX** | Codex 5.2 High | Deep code implementation, algorithms, TypeScript, testing | Core engine code, shaders, mesh generation algorithms |
| **GEMINI** | Gemini 3 Pro | Research, external libraries, documentation, ML exploration | Library research, ML integration, documentation, examples |

---

## Implementation Phases

### Phase A: Foundation Infrastructure (Week 1)
**Goal:** Establish the multi-source input system and text-to-mesh pipeline

| Task ID | Description | Assigned To | Dependencies | Priority |
|---------|-------------|-------------|--------------|----------|
| A1 | Create `SMNTCSource` abstraction layer | CODEX | None | P0 |
| A2 | Research text rendering libraries (troika-three-text, three-bmfont-text) | GEMINI | None | P0 |
| A3 | Implement text source type with SDF rendering | CODEX | A1, A2 | P0 |
| A4 | Create SVG path parser and mesh generator | CODEX | A1 | P0 |
| A5 | Design JSON config schema v2 for multi-source | GEMINI | A1 | P1 |
| A6 | Update TypeScript types for new source system | CODEX | A1-A5 | P1 |

### Phase B: Mesh Intelligence (Week 2)
**Goal:** Implement adaptive mesh generation and mask-based displacement

| Task ID | Description | Assigned To | Dependencies | Priority |
|---------|-------------|-------------|--------------|----------|
| B1 | Research ML edge detection (TensorFlow.js, ml5.js) | GEMINI | None | P0 |
| B2 | Implement image-to-contour extraction pipeline | CODEX | B1 | P0 |
| B3 | Create adaptive vertex density algorithm | CODEX | B2 | P1 |
| B4 | Implement displacement mask system in shaders | CODEX | A3, A4 | P0 |
| B5 | Create mesh optimization utilities (vertex reduction) | CODEX | B2, B3 | P1 |
| B6 | Document mesh generation pipeline | GEMINI | B1-B5 | P2 |

### Phase C: Animation Patterns (Week 3)
**Goal:** Add pattern system and layered composition

| Task ID | Description | Assigned To | Dependencies | Priority |
|---------|-------------|-------------|--------------|----------|
| C1 | Design pattern token system (grid, hex, voronoi, custom) | GEMINI | None | P0 |
| C2 | Implement pattern rendering in fragment shader | CODEX | C1 | P0 |
| C3 | Create layer composition system (blend modes, opacity) | CODEX | None | P1 |
| C4 | Add texture input support for custom patterns | CODEX | C2 | P1 |
| C5 | Create pattern preset library | GEMINI | C2 | P2 |
| C6 | Write pattern usage documentation | GEMINI | C1-C5 | P2 |

### Phase D: Export Targets (Week 4)
**Goal:** Enable multi-target output (CSS, Video, Static)

| Task ID | Description | Assigned To | Dependencies | Priority |
|---------|-------------|-------------|--------------|----------|
| D1 | Research CSS animation generation approaches | GEMINI | None | P0 |
| D2 | Implement CSS fallback target | CODEX | D1 | P0 |
| D3 | Research video encoding in browser (FFmpeg.wasm) | GEMINI | None | P1 |
| D4 | Implement frame capture and video export | CODEX | D3 | P1 |
| D5 | Implement static PNG/SVG export | CODEX | None | P1 |
| D6 | Create export utilities and CLI commands | CODEX | D2, D4, D5 | P2 |

### Phase E: Polish & Examples (Week 5)
**Goal:** Production-ready examples and preset ecosystem

| Task ID | Description | Assigned To | Dependencies | Priority |
|---------|-------------|-------------|--------------|----------|
| E1 | Create "Business Name" animated logo example | CODEX | A-D | P0 |
| E2 | Create "Logo Animation" example with image input | CODEX | B1-B5 | P0 |
| E3 | Design industry presets (SaaS, Gaming, Luxury) | GEMINI | C5 | P1 |
| E4 | Write comprehensive migration guide v1→v2 | GEMINI | All | P1 |
| E5 | Create video tutorials content plan | GEMINI | E1, E2 | P2 |
| E6 | Final integration testing and validation | ORCHESTRATOR | All | P0 |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            SMNTC v2.0 COMPILER                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      FRONTEND (Input Parsing)                    │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │  SMNTCSource Abstraction                                        │   │
│  │  ├── TextSource      → Font Parser → SDF/Extruded Mesh          │   │
│  │  ├── SVGSource       → Path Parser → Path-Extruded Mesh         │   │
│  │  ├── ImageSource     → ML Edge Detection → Contour Mesh         │   │
│  │  ├── GeometrySource  → Pass-through (current behavior)          │   │
│  │  └── ModelSource     → GLTF Loader → Imported Mesh              │   │
│  │                                                                  │   │
│  │  SMNTCConfig v2                                                  │   │
│  │  ├── source: { type, content, options }                         │   │
│  │  ├── animation: { surface, vibe, palette, reactivity }          │   │
│  │  ├── pattern: { type, scale, animate }                          │   │
│  │  ├── layers: [ { ...animation, opacity, blend } ]               │   │
│  │  └── export: { format, quality, fallback }                      │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                    │                                    │
│                                    ▼                                    │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    MIDDLE-END (Optimization)                     │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │  ├── Semantic Token Resolution (existing)                       │   │
│  │  ├── Mesh Optimization (LOD, vertex reduction)          [NEW]   │   │
│  │  ├── Mask Generation (where to animate)                 [NEW]   │   │
│  │  ├── Pattern Compilation                                [NEW]   │   │
│  │  └── Layer Flattening / Composition                     [NEW]   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                    │                                    │
│                                    ▼                                    │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      BACKEND (Code Generation)                   │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │  ├── WebGL Target     → GLSL + Three.js (existing, enhanced)    │   │
│  │  ├── CSS Target       → @keyframes + Custom Properties  [NEW]   │   │
│  │  ├── Video Target     → Frame Capture + FFmpeg.wasm     [NEW]   │   │
│  │  ├── Static Target    → PNG/SVG Export                  [NEW]   │   │
│  │  └── WebGPU Target    → WGSL (future)                           │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## File Structure Changes

```
src/
├── index.ts                    # Main exports (updated)
├── kernel/
│   ├── SMNTCKernel.ts          # Enhanced for multi-source
│   └── shaders/
│       ├── uber.vert.ts        # Add mask, pattern support
│       └── uber.frag.ts        # Add pattern rendering
├── source/                     # [NEW] Input source handlers
│   ├── index.ts
│   ├── types.ts                # SMNTCSource interface
│   ├── TextSource.ts           # Text → Mesh
│   ├── SVGSource.ts            # SVG → Mesh
│   ├── ImageSource.ts          # Image → Mesh (ML-assisted)
│   ├── GeometrySource.ts       # Pass-through
│   └── ModelSource.ts          # GLTF → Mesh
├── mesh/                       # [NEW] Mesh generation utilities
│   ├── index.ts
│   ├── text-mesh.ts            # SDF text rendering
│   ├── path-mesh.ts            # SVG path extrusion
│   ├── contour-mesh.ts         # Edge detection → mesh
│   └── optimizer.ts            # Vertex reduction, LOD
├── pattern/                    # [NEW] Pattern system
│   ├── index.ts
│   ├── types.ts
│   ├── patterns.ts             # Built-in pattern definitions
│   └── compiler.ts             # Pattern → GLSL
├── layer/                      # [NEW] Composition system
│   ├── index.ts
│   └── compositor.ts           # Multi-layer blending
├── export/                     # [NEW] Output targets
│   ├── index.ts
│   ├── css-target.ts           # CSS @keyframes generator
│   ├── video-target.ts         # Video encoder
│   └── static-target.ts        # PNG/SVG export
├── ml/                         # [NEW] ML-assisted features
│   ├── index.ts
│   ├── edge-detector.ts        # TensorFlow.js edge detection
│   └── saliency.ts             # Focus point detection
└── ...existing folders...
```

---

## Communication Protocol

### Message Format
```markdown
### MSG-XXX | SENDER → RECEIVER
**Subject:** Brief description
**Timestamp:** ISO 8601
**Priority:** P0/P1/P2
**Status:** 🔴 Blocked | 🟡 In Progress | 🟢 Complete

[Message content]

**Blockers:** (if any)
**Next:** (suggested next action)
```

### File-Based Communication
- **AGENT-COMMS.md** — Inter-agent messages
- **AGENT-TASKS-CODEX.md** — Codex assignments and context
- **AGENT-TASKS-GEMINI.md** — Gemini assignments and context
- **AGENT-STATUS.md** — Real-time progress tracker
- **AGENT-LOG.md** — Activity log (append-only)

### Handoff Protocol
1. Agent completes task → Updates status in AGENT-STATUS.md
2. Agent writes completion message in AGENT-COMMS.md
3. Orchestrator reviews and triggers dependent tasks
4. Next agent reads their task file and proceeds

---

## Success Criteria

### MVP (End of Week 2)
- [ ] Text input produces animated 3D mesh
- [ ] SVG path input produces animated mesh
- [ ] Existing examples still work unchanged
- [ ] TypeScript types updated and exported

### Full Release (End of Week 5)
- [ ] Image → Mesh with ML-assisted edge detection
- [ ] Pattern system with 5+ built-in patterns
- [ ] Layer composition with blend modes
- [ ] CSS fallback export working
- [ ] Video export working
- [ ] 3+ new showcase examples
- [ ] Full documentation updated
- [ ] All tests passing

---

## Risk Mitigation

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| ML library too large | Medium | High | Use lightweight models, lazy loading |
| Text mesh quality issues | Low | Medium | Fallback to simpler SDF approach |
| Video encoding slow | Medium | Low | Use Web Workers, progress UI |
| Breaking changes to v1 API | Low | High | Maintain full backward compat |
| Browser compatibility | Low | Medium | Feature detection, graceful fallback |

---

## Next Actions

1. ✅ Create this master plan
2. ⏳ Create AGENT-TASKS-CODEX.md with Phase A assignments
3. ⏳ Create AGENT-TASKS-GEMINI.md with Phase A research tasks
4. ⏳ Update AGENT-COMMS.md with new agent roster
5. ⏳ Create AGENT-STATUS.md progress tracker
6. 🔜 Begin Phase A execution

---

*Orchestrated by Claude Opus 4.5 — Last Updated: 2026-02-11*
