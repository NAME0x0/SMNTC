# Mesh Generation Pipeline — SMNTC v2.0

This document describes how SMNTC converts various input sources (Text, SVG, Images) into optimized, animatable 3D meshes compatible with the SMNTC Uber-Shader.

---

## 1. Overview

SMNTC v2.0 introduces a **Multi-Source Input System**. Instead of requiring developers to provide pre-built Three.js geometries, the engine can now compile raw content into hardware-ready meshes. 

The pipeline follows these steps:
1. **Source Loading:** Fetching content (Text string, SVG path, Image URL).
2. **Contour Extraction:** Converting content into 2D vector shapes.
3. **Geometry Generation:** Extruding shapes into `BufferGeometry` with controllable density.
4. **Optimization:** Applying vertex reduction and UV mapping.
5. **Kernel Injection:** Passing the geometry to the `SMNTCKernel`.

---

## 2. Source Types

### Text Source (`text`)
Uses **opentype.js** to parse font files (.ttf, .otf) and extract glyph paths.
- **Workflow:** Text → opentype.js Path → Three.js Shape → ExtrudeGeometry.
- **Key Feature:** Full control over `curveSegments`, allowing for smooth displacement even on complex typography.

### SVG Source (`svg`)
Parses SVG `<path>` data or loads external `.svg` files.
- **Workflow:** SVG Path → ShapePath → Shape → ExtrudeGeometry.
- **Key Feature:** Resolution-independent logos and icons can be animated with 3D depth.

### Image Source (`image`)
Uses a lightweight CV (Computer Vision) pipeline to extract contours from bitmaps.
- **Workflow:** Image → Grayscale/Blur → Canny Edge Detection → Potrace (Vectorization) → SVG Path → Mesh.
- **Key Feature:** Converts static brand logos into dynamic 3D surfaces.

---

## 3. Image-to-Mesh Pipeline (CV Pipeline)

To maintain a tiny bundle size (<200KB total), SMNTC avoids heavy ML libraries like TensorFlow.js in favor of a hybrid CV approach:

1. **Preprocessing:** The image is drawn to an `OffscreenCanvas`, converted to grayscale, and softened with a Gaussian blur to reduce noise.
2. **Edge Detection:** A Sobel or Canny filter is applied via direct pixel manipulation to identify high-contrast boundaries.
3. **Vectorization:** The resulting binary map is processed by **Potrace**, which extracts smooth Bezier paths.
4. **Triangulation:** These paths are converted to Three.js Shapes and triangulated into a mesh.

---

## 4. Configuration Reference

All mesh generation is controlled via the `source` block in the SMNTC configuration:

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `type` | `string` | - | `text`, `svg`, `image`, `geometry` |
| `content` | `string` | - | Text content (`type: "text"` only). |
| `font` | `string` | runtime default | Text font family or font URL (`type: "text"` only). |
| `path` | `string` | - | SVG path data/markup/URL (`type: "svg"` only). |
| `src` | `string` | - | Image URL/path/data URI (`type: "image"` only). |
| `geometry` | `BufferGeometry` | - | Runtime-only Three.js geometry (`type: "geometry"`). Not serializable JSON. |
| `extrude` | `number` | `0.1` | 3D depth (`text`/`svg`). Set `0` for flat output. |
| `segments` | `number` | `12` | Curve/vertex density (`text`/`svg`). |
| `threshold` | `number` | `0.2` | Image contour threshold (`image` only). |
| `simplify` | `number` | `0.05` | Image contour simplification factor (`image` only). |
| `adaptiveDensity` | `number` | `0.75` | Image adaptive contour subdivision (`image` only). |
| `maskInvert` | `boolean` | `false` | Invert sampled displacement mask values. |

---

## 5. Performance & Optimization

### Vertex Density (`segments`)
SMNTC animations (vertex displacement) depend on vertex density. 
- **Low segments:** Sharp, faceted "glitch" look. High performance.
- **High segments:** Fluid, liquid-like surface. Higher GPU cost.

### Masked Displacement
For generic surfaces, `TextSource` and `ImageSource` can generate a **UV Mask**. This allows you to apply high-fidelity text animations to a standard plane without extruding complex geometry, drastically reducing draw call overhead.

### Disposal
Always call `source.dispose()` when removing a mesh to release font textures and canvas buffers.

---

## 6. Code Examples

### Generating 3D Text
```typescript
const kernel = new SMNTCKernel({
  source: {
    type: 'text',
    content: 'SMNTC',
    font: '/fonts/inter.ttf',
    extrude: 0.1,
    segments: 32
  },
  surface: 'fluid',
  vibe: 'calm'
});
```

### Image Logo Contour
```typescript
const kernel = new SMNTCKernel({
  source: {
    type: 'image',
    src: '/logos/brand.png',
    threshold: 0.6,
    simplify: 0.2
  },
  surface: 'topographic',
  palette: 'neon'
});
```
