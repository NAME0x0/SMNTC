# Pattern System — SMNTC v2.0

The SMNTC Pattern System allows you to layer procedural textures and dot-matrices over any surface. These patterns are rendered directly in the fragment shader, ensuring O(1) performance regardless of complexity.

---

## 1. Overview

Patterns in SMNTC serve as a "visual overlay" that can react to surface displacement. They are useful for creating technical HUDs, biological textures, or retro digital displays.

Key features:
- **Procedural Generation:** No heavy textures required (unless using `custom`).
- **Surface Masking:** Patterns can be restricted to the peaks of your 3D mesh.
- **Blending:** Multiple blend modes (Add, Multiply, Screen, etc.) for complex compositions.

---

## 2. Pattern Tokens

Every pattern is defined by a `type` and a set of semantic parameters.

| Token | Visual Style | Primary Parameters |
|-------|--------------|--------------------|
| `grid` | Square blueprint lines | `scale`, `lineWidth`, `rotation` |
| `hexagon` | High-tech honeycomb | `scale`, `lineWidth` |
| `dots` | Digital dot-matrix | `scale`, `radius` |
| `voronoi` | Organic/Biological cells | `scale`, `lineWidth` |
| `waves` | CRT scan lines / ripples | `scale`, `amplitude`, `animate` |
| `concentric`| Radar / Sonar circles | `scale`, `center` |
| `noise` | Digital grain / static | `scale` |
| `custom` | User-provided texture | `map`, `repeat` |

---

## 3. Curated Presets

SMNTC includes a library of professional presets. You can import these directly to get started quickly.

```typescript
import { getPatternPreset } from 'smntc';

// Use a preset in your config
const config = {
  pattern: getPatternPreset('honeycomb')
};
```

### Available Presets:
- `blueprint-grid`: Low-opacity technical grid.
- `honeycomb`: Glowing sci-fi hex structure.
- `dot-matrix`: Retro LED-style display.
- `organic-cells`: Voronoi biological texture.
- `scan-lines`: Animated CRT scanning effect.
- `sonar`: Concentric radar pulses.
- `digital-noise`: Fine film grain overlay.
- `tech-wireframe`: Bold structural lines.

---

## 4. Configuration API

The `pattern` block in your config supports the following properties:

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `type` | `string` | `grid` | The pattern token type. |
| `scale` | `number` | `1.0` | Spatial frequency (higher = smaller pattern). |
| `lineWidth`| `number` | `1.0` | Thickness of lines/edges. |
| `radius` | `number` | `0.5` | Size of dots (dots mode only). |
| `opacity` | `number` | `1.0` | Global visibility of the pattern. |
| `blend` | `string` | `normal` | `normal`, `add`, `multiply`, `screen`, `overlay`. |
| `animate` | `boolean`| `true` | Whether the pattern scrolls/rotates over time. |

---

## 5. Advanced: Pattern Layering

Patterns can be used within the `layers` system to create multi-surface effects.

```json
{
  "layers": [
    {
      "animation": { "surface": "fluid", "vibe": "calm" },
      "opacity": 0.8
    },
    {
      "pattern": { "type": "dots", "scale": 20, "blend": "add" },
      "opacity": 0.4
    }
  ]
}
```

---

## 6. Performance Tips

1. **Avoid `custom` for simple shapes:** Use `grid` or `dots` instead of a texture map to save memory and bandwidth.
2. **Use `Screen` or `Add` for Glow:** When using palettes like `neon` or `vapor`, additive blending makes patterns feel part of the light field.
3. **Scale Responsively:** High `scale` values on small mobile screens can cause Moiré patterns. Use `fidelity: "low"` to automatically simplify pattern rendering.
