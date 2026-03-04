# SMNTC v2.0 — Gemini Task Assignments

> **Agent:** Gemini 3 Pro  
> **Role:** Research Lead  
> **Assigned by:** Claude Opus 4.5 (Orchestrator)  
> **Updated:** 2026-02-11

---

## Your Strengths & Focus

You are **Gemini 3 Pro** — exceptional at:
- Research and exploration of external libraries
- Evaluating trade-offs between approaches
- Machine learning and AI integration
- Writing clear documentation and guides
- Understanding architectural patterns
- Exploring new technologies and their applicability

Focus on **research, documentation, and exploration**: investigate libraries, evaluate options, document findings, create examples and guides.

---

## Context: What We're Building

SMNTC is evolving from a semantic shader library to a **visual motion compiler**. Your research will guide implementation decisions.

**Key evolution goals:**
1. Accept text/logos/images as inputs (not just Three.js meshes)
2. Use ML to intelligently generate meshes from images
3. Export to multiple formats (WebGL, CSS, Video)
4. Create industry-specific presets

---

## Phase A Tasks (Week 1) — Foundation Research

### Task A2: Research Text Rendering Libraries
**Priority:** P0  
**Status:** 🔴 Not Started  
**Dependencies:** None  
**Blocks:** Codex Task A3

**Objective:** Evaluate text-to-mesh libraries for Three.js and recommend the best approach.

**Libraries to evaluate:**

1. **troika-three-text**
   - URL: https://github.com/protectwise/troika/tree/main/packages/troika-three-text
   - Approach: SDF (Signed Distance Field) text rendering
   - Questions to answer:
     - Can it generate BufferGeometry with controllable vertex density?
     - Does it support 3D extrusion or is it 2D only?
     - Bundle size impact?
     - Font loading approach (URL, system fonts)?

2. **three-mesh-bvh + opentype.js**
   - URL: https://github.com/gkjohnson/three-mesh-bvh
   - Approach: Parse font → extract path → extrude
   - Questions:
     - How complex is the integration?
     - Quality of path extraction from fonts?
     - Performance characteristics?

3. **three/examples/jsm/geometries/TextGeometry**
   - Built into Three.js
   - Requires pre-converted font JSON
   - Questions:
     - Is font format limiting?
     - Vertex quality for animation?

4. **Custom SDF shader approach**
   - Write our own SDF text renderer
   - Questions:
     - Effort vs. benefit?
     - Would it give us more control?

**Deliverables:**

Create a research report in `AGENT-COMMS.md`:
```markdown
### MSG-010 | GEMINI → ORCHESTRATOR, CODEX
**Subject:** Text Rendering Library Research Complete
**Priority:** P0
**Status:** 🟢 Complete

## Recommendation: [Library Name]

### Why this library:
- [Key advantages]

### Trade-offs:
- [Disadvantages and mitigations]

### Integration approach:
- [How Codex should integrate it]

### Comparison Matrix:

| Library | 3D Extrusion | Bundle Size | Vertex Control | Font Support | Difficulty |
|---------|--------------|-------------|----------------|--------------|------------|
| troika  | ?            | ?           | ?              | ?            | ?          |
| three-bvh | ?         | ?           | ?              | ?            | ?          |
| TextGeometry | ?      | ?           | ?              | ?            | ?          |
| Custom SDF | ?        | ?           | ?              | ?            | ?          |

### Code example:
[Show Codex how to use the recommended library]
```

**Completion Criteria:**
- All 4 options evaluated
- Clear recommendation made
- Integration guidance provided for Codex

---

### Task A5: Design JSON Config Schema v2
**Priority:** P1  
**Status:** 🔴 Not Started  
**Dependencies:** A1 (Codex source types)

**Objective:** Design the expanded JSON configuration schema for SMNTC v2.

**Current schema location:** `smntc.schema.json`

**New schema requirements:**

```json
{
  "$schema": "https://smntc.dev/schema/v2.json",
  "version": "2.0",
  
  "source": {
    "type": "text | svg | image | geometry",
    "content": "...",
    "options": {}
  },
  
  "animation": {
    "surface": "fluid",
    "vibe": "calm",
    "palette": "arctic",
    "reactivity": "magnetic",
    "intensity": 1.0,
    "speed": 1.0
  },
  
  "pattern": {
    "type": "grid | hex | voronoi | dots | custom",
    "scale": 1.0,
    "animate": true
  },
  
  "layers": [
    {
      "animation": { "surface": "fluid", "vibe": "calm" },
      "opacity": 0.5,
      "blend": "add | multiply | screen | normal"
    }
  ],
  
  "effects": {
    "glow": 0.3,
    "grain": 0.1,
    "chromatic": 0.05,
    "vignette": 0.2,
    "blur": 0
  },
  
  "export": {
    "format": "webgl | css | video | static",
    "quality": "low | medium | high | ultra",
    "fallback": "css | static | none"
  }
}
```

**Deliverables:**
- [ ] Design complete schema with all properties
- [ ] Add descriptions for each field
- [ ] Define enum values for all options
- [ ] Create 3-5 example configurations
- [ ] Post schema design in `AGENT-COMMS.md`

**Wait for:** Check Codex's `src/source/types.ts` to align with source type definitions.

---

## Phase B Tasks (Week 2) — ML Research

### Task B1: Research ML Edge Detection Libraries
**Priority:** P0  
**Status:** 🔴 Not Started  
**Dependencies:** None  
**Blocks:** Codex Task B2

**Objective:** Find the best approach for client-side ML edge detection from images.

**Libraries to evaluate:**

1. **TensorFlow.js**
   - Pre-trained edge detection models
   - Canny edge detection implementation
   - Questions:
     - Bundle size impact?
     - Performance on mobile?
     - Model loading time?

2. **ml5.js**
   - URL: https://ml5js.org/
   - Higher-level API over TensorFlow.js
   - Questions:
     - Edge detection capabilities?
     - Ease of use?

3. **OpenCV.js**
   - Full computer vision library in WASM
   - Questions:
     - Too heavy for our needs?
     - Canny edge detection quality?

4. **Custom canvas-based approach**
   - Sobel/Canny edge detection in pure JS
   - Questions:
     - Performance without ML acceleration?
     - Quality comparison?

5. **Potrace (JS port)**
   - Bitmap to vector tracing
   - Questions:
     - Can output SVG paths directly?
     - Quality on logos with gradients?

**Research focus:**
- We need to convert a logo image → vector contours → mesh
- ML should identify where the "important" parts of the image are
- Should work client-side without server calls
- Bundle size is a concern (currently SMNTC is <60KB)

**Deliverables:**

Create research report in `AGENT-COMMS.md`:
```markdown
### MSG-020 | GEMINI → ORCHESTRATOR, CODEX
**Subject:** ML Edge Detection Research Complete
**Priority:** P0

## Recommended Approach: [Approach Name]

### Pipeline:
1. Load image → Canvas
2. [Step 2]
3. [Step 3]
4. Output: SVG path data or point array

### Library recommendation:
- Primary: [Library]
- Fallback: [Simpler approach]

### Bundle size impact:
- [Analysis]

### Code example:
[Show how to use]
```

---

### Task B6: Document Mesh Generation Pipeline
**Priority:** P2  
**Status:** 🔴 Not Started  
**Dependencies:** B1-B5

**Objective:** Write developer documentation for the mesh generation system.

**Documentation to create:**

Add to `SMNTC-SPEC.md` or create `docs/MESH-GENERATION.md`:

1. **Overview** — What mesh generation does
2. **Source Types** — How each source type works
3. **ML Pipeline** — How image → mesh works
4. **Configuration** — All options and their effects
5. **Performance** — Tips for optimal mesh generation
6. **Examples** — Code samples for each source type

---

## Phase C Tasks (Week 3) — Pattern Design

### Task C1: Design Pattern Token System
**Priority:** P0  
**Status:** 🔴 Not Started  
**Dependencies:** None  
**Blocks:** Codex Task C2

**Objective:** Design the semantic token system for patterns.

**Patterns to define:**

| Token | Visual | Parameters |
|-------|--------|------------|
| `grid` | Square grid lines | `spacing`, `lineWidth`, `rotation` |
| `hexagon` | Hexagonal grid | `size`, `lineWidth` |
| `dots` | Dot matrix | `spacing`, `radius`, `randomize` |
| `voronoi` | Voronoi cells | `cellCount`, `lineWidth` |
| `waves` | Parallel wave lines | `count`, `amplitude`, `phase` |
| `concentric` | Concentric circles | `count`, `spacing`, `center` |
| `noise` | Perlin/Simplex noise texture | `scale`, `octaves`, `contrast` |
| `custom` | User-provided texture | `texture`, `tileX`, `tileY` |

**Deliverables:**
- [ ] Define all pattern tokens with parameters
- [ ] Specify how patterns interact with surfaces
- [ ] Design pattern layering/blending
- [ ] Create visual reference for each pattern
- [ ] Post design in `AGENT-COMMS.md`

---

### Task C5: Create Pattern Preset Library
**Priority:** P2  
**Status:** 🔴 Not Started  
**Dependencies:** C2

**Objective:** Create ready-to-use pattern configurations.

**Presets to create:**

```typescript
export const patternPresets = {
  'wireframe-grid': {
    type: 'grid',
    spacing: 0.1,
    lineWidth: 1,
    color: 'accent',
  },
  'honeycomb': {
    type: 'hexagon',
    size: 0.05,
    lineWidth: 0.5,
    color: 'primary',
  },
  'stipple': {
    type: 'dots',
    spacing: 0.02,
    radius: 0.005,
    randomize: 0.3,
  },
  // ... more presets
};
```

---

## Phase D Tasks (Week 4) — Export Research

### Task D1: Research CSS Animation Generation
**Priority:** P0  
**Status:** 🔴 Not Started  
**Dependencies:** None  
**Blocks:** Codex Task D2

**Objective:** Research how to compile SMNTC tokens to pure CSS animations.

**Questions to answer:**
1. What subset of SMNTC effects can be replicated in CSS?
2. How to generate `@keyframes` from semantic tokens?
3. What's the mapping from SMNTC surfaces → CSS patterns?
4. How to handle `prefers-reduced-motion`?

**Example mapping:**
```
SMNTC: { surface: 'topographic', vibe: 'calm', palette: 'arctic' }
          ↓
CSS: @keyframes smntc-topographic-calm {
       0% { background-position: 0% 50%; transform: translateY(0); }
       50% { background-position: 100% 50%; transform: translateY(2px); }
       100% { background-position: 0% 50%; transform: translateY(0); }
     }
     
     .smntc-surface {
       background: linear-gradient(135deg, #88ccff 0%, #ffffff 50%, #050510 100%);
       animation: smntc-topographic-calm 8s ease-in-out infinite;
     }
```

**Deliverables:**
- [ ] Mapping table: SMNTC tokens → CSS properties
- [ ] Feasibility analysis for each surface type
- [ ] Recommended CSS patterns for common cases
- [ ] Bundle size reduction analysis (CSS vs WebGL)

---

### Task D3: Research Video Export (FFmpeg.wasm)
**Priority:** P1  
**Status:** 🔴 Not Started  
**Dependencies:** None

**Objective:** Research browser-based video encoding for animation export.

**Libraries to evaluate:**

1. **FFmpeg.wasm**
   - URL: https://github.com/ffmpegwasm/ffmpeg.wasm
   - Questions:
     - Bundle size?
     - Encoding speed for 10s animation?
     - Output formats (MP4, WebM, GIF)?
     - Memory usage?

2. **WebCodecs API**
   - Native browser video encoding
   - Questions:
     - Browser support?
     - Integration complexity?

3. **MediaRecorder API**
   - Capture canvas stream
   - Questions:
     - Quality control?
     - Format options?

**Deliverables:**
- [ ] Comparison of approaches
- [ ] Recommended solution
- [ ] Performance expectations
- [ ] Code example for frame capture → video

---

## Phase E Tasks (Week 5) — Presets & Docs

### Task E3: Design Industry Presets
**Priority:** P1  
**Status:** 🔴 Not Started  
**Dependencies:** C5

**Objective:** Create production-ready presets for specific industries.

**Presets to design:**

1. **SaaS / B2B**
   - Clean, professional, minimal animation
   - Tokens: `surface: 'topographic'`, `vibe: 'stable'`, `palette: 'monochrome'`

2. **Gaming / Entertainment**
   - High energy, vibrant colors
   - Tokens: `surface: 'plasma'`, `vibe: 'chaotic'`, `palette: 'neon'`

3. **Luxury / Fashion**
   - Elegant, slow, sophisticated
   - Tokens: `surface: 'crystalline'`, `vibe: 'breathing'`, `palette: 'gold'`

4. **Healthcare / Wellness**
   - Calming, organic, natural
   - Tokens: `surface: 'fluid'`, `vibe: 'calm'`, `palette: 'arctic'`

5. **Fintech / Banking**
   - Trustworthy, stable, clean
   - Tokens: `surface: 'wave'`, `vibe: 'cinematic'`, `palette: 'midnight'`

6. **Creative Agency**
   - Bold, dynamic, artistic
   - Tokens: `surface: 'organic'`, `vibe: 'agitated'`, `palette: 'vapor'`

**Deliverables:**
- [ ] Complete preset configuration for each industry
- [ ] Visual description/mood board for each
- [ ] Recommended use cases
- [ ] Post in `AGENT-COMMS.md`

---

### Task E4: Write Migration Guide v1 → v2
**Priority:** P1  
**Status:** 🔴 Not Started  
**Dependencies:** All other tasks

**Objective:** Document how existing v1 users upgrade to v2.

**Guide structure:**

1. **What's New in v2**
   - Source system (text, svg, image inputs)
   - Pattern system
   - Layer composition
   - Export targets

2. **Breaking Changes**
   - (Should be minimal — backward compat is goal)

3. **Migration Steps**
   - Before/after code examples
   - Config migration examples

4. **New Capabilities**
   - Examples of what's now possible

---

## How to Report Progress

After completing research:

1. Update `AGENT-STATUS.md`:
   ```markdown
   | A2 | Text library research | GEMINI | 🟢 Complete | 2026-02-XX |
   ```

2. Post detailed findings in `AGENT-COMMS.md`:
   ```markdown
   ### MSG-0XX | GEMINI → ORCHESTRATOR, CODEX
   **Subject:** [Research Topic] Complete
   **Timestamp:** 2026-02-XXTXX:XX:XXZ
   **Priority:** P0
   **Status:** 🟢 Complete
   
   [Detailed research findings]
   
   **Recommendation:** [Your recommendation]
   **Next:** [What should happen next]
   ```

---

## Questions? Need Clarification?

Post in `AGENT-COMMS.md`:
```markdown
### MSG-0XX | GEMINI → ORCHESTRATOR
**Subject:** Question about [topic]
**Priority:** P1
**Status:** 🟡 Needs Input

[Your question]
```

---

*Assigned by Claude Opus 4.5 — Your research is critical to guiding implementation! 🔬*
