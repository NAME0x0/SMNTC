# SMNTC v2.0 — Codex Task Assignments

> **Agent:** Codex 5.2 High  
> **Role:** Implementation Lead  
> **Assigned by:** Claude Opus 4.5 (Orchestrator)  
> **Updated:** 2026-02-11

---

## Your Strengths & Focus

You are **Codex 5.2 High** — exceptional at:
- Deep TypeScript/JavaScript implementation
- Algorithm design and optimization
- GLSL shader programming
- Complex code refactoring
- Writing comprehensive tests
- Understanding and extending existing codebases

Focus on **implementation work**: writing the actual code, algorithms, shaders, and tests.

---

## Context: Current SMNTC Architecture

Before starting, familiarize yourself with these key files:

```
src/kernel/SMNTCKernel.ts    — Main orchestrator (548 lines)
src/kernel/shaders/uber.vert.ts — Vertex shader (309 lines)
src/kernel/shaders/uber.frag.ts — Fragment shader
src/semantic/tokens.ts        — Type definitions
src/semantic/dictionary.ts    — Token → constant mapping
src/semantic/registry.ts      — Extensible token registry
src/physics/spring.ts         — Spring physics engine
```

The current system:
1. Takes semantic tokens (`surface: 'fluid'`, `vibe: 'calm'`)
2. Resolves them to shader constants via `resolveConstants()`
3. Creates a `ShaderMaterial` with an uber-shader
4. Applies to any Three.js mesh and animates

---

## Phase A Tasks (Week 1) — Foundation

### Task A1: Create SMNTCSource Abstraction Layer
**Priority:** P0  
**Status:** 🔴 Not Started  
**Dependencies:** None

**Objective:** Create a source abstraction that allows SMNTC to accept different input types.

**Implementation:**

Create `src/source/types.ts`:
```typescript
import type { BufferGeometry } from 'three';

export type SourceType = 'geometry' | 'text' | 'svg' | 'image' | 'model';

export interface SMNTCSourceConfig {
  type: SourceType;
}

export interface TextSourceConfig extends SMNTCSourceConfig {
  type: 'text';
  content: string;
  font?: string;
  size?: number;
  extrude?: number;
  bevel?: boolean;
  segments?: number;
}

export interface SVGSourceConfig extends SMNTCSourceConfig {
  type: 'svg';
  path: string;        // SVG path data (d attribute) or URL
  extrude?: number;
  segments?: number;
}

export interface ImageSourceConfig extends SMNTCSourceConfig {
  type: 'image';
  src: string;         // Image URL or data URL
  threshold?: number;  // Edge detection threshold
  simplify?: number;   // Path simplification factor
}

export interface GeometrySourceConfig extends SMNTCSourceConfig {
  type: 'geometry';
  geometry: BufferGeometry;
}

export type AnySourceConfig = 
  | TextSourceConfig 
  | SVGSourceConfig 
  | ImageSourceConfig 
  | GeometrySourceConfig;

export interface SMNTCSource {
  readonly type: SourceType;
  readonly config: AnySourceConfig;
  
  /** Generate or return the mesh geometry */
  getGeometry(): Promise<BufferGeometry>;
  
  /** Get UV mask texture (optional, for masked displacement) */
  getMask?(): Promise<Texture | null>;
  
  /** Dispose of any resources */
  dispose(): void;
}
```

Create `src/source/index.ts`:
```typescript
export * from './types';
export { createSource } from './factory';
export { TextSource } from './TextSource';
export { SVGSource } from './SVGSource';
export { ImageSource } from './ImageSource';
export { GeometrySource } from './GeometrySource';
```

Create `src/source/factory.ts`:
```typescript
import type { AnySourceConfig, SMNTCSource } from './types';
import { TextSource } from './TextSource';
import { SVGSource } from './SVGSource';
import { ImageSource } from './ImageSource';
import { GeometrySource } from './GeometrySource';

export function createSource(config: AnySourceConfig): SMNTCSource {
  switch (config.type) {
    case 'text':
      return new TextSource(config);
    case 'svg':
      return new SVGSource(config);
    case 'image':
      return new ImageSource(config);
    case 'geometry':
      return new GeometrySource(config);
    default:
      throw new TypeError(`[SMNTC] Unknown source type: ${(config as any).type}`);
  }
}
```

**Deliverables:**
- [ ] `src/source/types.ts` — Type definitions
- [ ] `src/source/index.ts` — Exports
- [ ] `src/source/factory.ts` — Source factory function
- [ ] `src/source/GeometrySource.ts` — Pass-through for existing behavior

**Completion Criteria:**
- Types compile without errors
- Factory function instantiates correct source class
- GeometrySource wraps existing BufferGeometry

**Report completion to:** `AGENT-COMMS.md` → `MSG-100 | CODEX → ORCHESTRATOR`

---

### Task A3: Implement Text Source with SDF Rendering
**Priority:** P0  
**Status:** 🔴 Not Started  
**Dependencies:** A1 (types), A2 (Gemini research on libraries)

**Objective:** Create `TextSource` that converts text strings into 3D meshes.

**Wait for:** Gemini's research report (Task A2) on recommended text rendering library.

**Expected approach (pending Gemini research):**
```typescript
// src/source/TextSource.ts
import { TextSourceConfig, SMNTCSource } from './types';
import { BufferGeometry } from 'three';
// Import will depend on Gemini's recommendation

export class TextSource implements SMNTCSource {
  readonly type = 'text' as const;
  
  constructor(readonly config: TextSourceConfig) {}
  
  async getGeometry(): Promise<BufferGeometry> {
    // Implementation depends on chosen library
    // Options: troika-three-text, three-mesh-bvh + opentype.js, custom SDF
  }
  
  dispose(): void {
    // Clean up resources
  }
}
```

**Key requirements:**
1. Support common web fonts (system fonts, Google Fonts)
2. Configurable extrusion depth for 3D effect
3. Controllable vertex density (more vertices = smoother animation)
4. Return geometry compatible with SMNTC's displacement shaders

**Report completion to:** `AGENT-COMMS.md`

---

### Task A4: Create SVG Path Parser and Mesh Generator
**Priority:** P0  
**Status:** 🔴 Not Started  
**Dependencies:** A1

**Objective:** Parse SVG path data and generate extruded 3D mesh.

**Implementation approach:**

```typescript
// src/source/SVGSource.ts
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader';
import { ExtrudeGeometry, Shape, BufferGeometry } from 'three';
import type { SVGSourceConfig, SMNTCSource } from './types';

export class SVGSource implements SMNTCSource {
  readonly type = 'svg' as const;
  private geometry: BufferGeometry | null = null;
  
  constructor(readonly config: SVGSourceConfig) {}
  
  async getGeometry(): Promise<BufferGeometry> {
    if (this.geometry) return this.geometry;
    
    const shapes = await this.parsePathToShapes(this.config.path);
    
    const extrudeSettings = {
      depth: this.config.extrude ?? 0.1,
      bevelEnabled: false,
      curveSegments: this.config.segments ?? 12,
    };
    
    this.geometry = new ExtrudeGeometry(shapes, extrudeSettings);
    this.centerGeometry();
    this.subdivideForAnimation();
    
    return this.geometry;
  }
  
  private async parsePathToShapes(pathData: string): Promise<Shape[]> {
    // If it's a URL, fetch it
    if (pathData.startsWith('http') || pathData.startsWith('/')) {
      const response = await fetch(pathData);
      const svgText = await response.text();
      return this.parseSVGText(svgText);
    }
    
    // If it's raw path data (d attribute), wrap it
    if (pathData.startsWith('M') || pathData.startsWith('m')) {
      const svgText = `<svg><path d="${pathData}"/></svg>`;
      return this.parseSVGText(svgText);
    }
    
    // Assume it's complete SVG content
    return this.parseSVGText(pathData);
  }
  
  private parseSVGText(svgText: string): Shape[] {
    const loader = new SVGLoader();
    const svgData = loader.parse(svgText);
    
    const shapes: Shape[] = [];
    for (const path of svgData.paths) {
      const pathShapes = SVGLoader.createShapes(path);
      shapes.push(...pathShapes);
    }
    
    return shapes;
  }
  
  private centerGeometry(): void {
    if (!this.geometry) return;
    this.geometry.computeBoundingBox();
    this.geometry.center();
  }
  
  private subdivideForAnimation(): void {
    // Increase vertex count for smoother displacement
    // Implementation: tessellate or subdivide the geometry
  }
  
  dispose(): void {
    this.geometry?.dispose();
    this.geometry = null;
  }
}
```

**Deliverables:**
- [ ] `src/source/SVGSource.ts`
- [ ] Support for SVG path data (d attribute)
- [ ] Support for SVG file URLs
- [ ] Support for complete SVG markup
- [ ] Configurable extrusion depth
- [ ] Geometry centering and normalization

**Test cases:**
```typescript
// Simple path
const source1 = new SVGSource({ type: 'svg', path: 'M0 0 L100 0 L100 100 Z' });

// URL 
const source2 = new SVGSource({ type: 'svg', path: '/logos/company.svg' });

// Full SVG
const source3 = new SVGSource({ type: 'svg', path: '<svg>...</svg>' });
```

---

### Task A6: Update TypeScript Types for New Source System
**Priority:** P1  
**Status:** 🔴 Not Started  
**Dependencies:** A1-A5

**Objective:** Update `SMNTCConfig` and `SMNTCKernelOptions` to support source configuration.

**Changes to `src/semantic/tokens.ts`:**
```typescript
// Add to existing types
import type { AnySourceConfig } from '../source/types';

export interface SMNTCConfigV2 extends SMNTCConfig {
  /** Source configuration (text, svg, image, or geometry) */
  source?: AnySourceConfig;
}
```

**Changes to `src/kernel/SMNTCKernel.ts`:**
- Add `source` option to constructor
- If `source` provided, generate geometry before `apply()`
- Maintain backward compatibility with `apply(mesh)` pattern

---

## Phase B Tasks (Week 2) — Mesh Intelligence

### Task B2: Image-to-Contour Extraction Pipeline
**Priority:** P0  
**Status:** 🔴 Not Started  
**Dependencies:** B1 (Gemini ML research)

**Wait for:** Gemini's research on ML edge detection libraries.

**Objective:** Convert raster images to vector contours, then to mesh.

---

### Task B3: Adaptive Vertex Density Algorithm
**Priority:** P1  
**Status:** 🔴 Not Started  
**Dependencies:** B2

**Objective:** Concentrate vertices where the image has more detail.

**Approach:**
1. Analyze edge density in image regions
2. Generate higher vertex count in complex areas
3. Use Delaunay triangulation with variable point density

---

### Task B4: Displacement Mask System in Shaders
**Priority:** P0  
**Status:** 🔴 Not Started  
**Dependencies:** A3, A4

**Objective:** Add mask texture support to control where displacement occurs.

**Shader changes needed in `uber.vert.ts`:**
```glsl
uniform sampler2D uMask;        // NEW: grayscale mask texture
uniform float uMaskEnabled;     // NEW: 0.0 or 1.0
uniform float uMaskInvert;      // NEW: invert mask behavior

// In main():
float maskValue = 1.0;
if (uMaskEnabled > 0.5) {
  maskValue = texture2D(uMask, uv).r;
  if (uMaskInvert > 0.5) {
    maskValue = 1.0 - maskValue;
  }
}

// Apply mask to displacement
float finalDisplacement = displacement * maskValue;
```

---

## How to Report Progress

After completing each task:

1. Update `AGENT-STATUS.md` with:
   ```markdown
   | A1 | SMNTCSource abstraction | CODEX | 🟢 Complete | 2026-02-XX |
   ```

2. Post completion message in `AGENT-COMMS.md`:
   ```markdown
   ### MSG-1XX | CODEX → ORCHESTRATOR
   **Subject:** Task A1 Complete — SMNTCSource abstraction
   **Timestamp:** 2026-02-XXTXX:XX:XXZ
   **Priority:** P0
   **Status:** 🟢 Complete
   
   Implemented SMNTCSource abstraction layer:
   - Created src/source/types.ts with all interfaces
   - Created factory function in src/source/factory.ts
   - Created GeometrySource pass-through
   
   Files created:
   - src/source/types.ts
   - src/source/index.ts
   - src/source/factory.ts
   - src/source/GeometrySource.ts
   
   **Blockers:** None
   **Next:** Ready for A3 (pending A2 from Gemini)
   ```

---

## Questions? Blockers?

If you encounter issues or need clarification:

1. Post in `AGENT-COMMS.md`:
   ```markdown
   ### MSG-1XX | CODEX → ORCHESTRATOR
   **Subject:** Question about [topic]
   **Priority:** P1
   **Status:** 🔴 Blocked
   
   [Your question]
   
   **Blockers:** [What's blocking you]
   ```

2. The Orchestrator will respond and unblock.

---

*Assigned by Claude Opus 4.5 — Good luck, Codex! 🚀*
