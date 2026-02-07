// ============================================================================
// SMNTC — Web Component <smntc-surface>
// Framework-agnostic surface for zero-build usage.
// ============================================================================

import {
  WebGLRenderer,
  Scene,
  PerspectiveCamera,
  Mesh,
  PlaneGeometry,
  IcosahedronGeometry,
  TorusGeometry,
} from 'three';
import { SMNTCKernel } from '../kernel/SMNTCKernel';
import { resolveConstants, DEFAULTS } from '../semantic/transformer';
import type { SMNTCConfig } from '../semantic/tokens';

export class SMNTCSurfaceElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return [
      'surface',
      'vibe',
      'reactivity',
      'fidelity',
      'palette',
      'wireframe',
      'intensity',
      'speed',
      'contour-lines',
      'thermal-guard',
      'geometry',
      'scale',
      'position',
      'rotation',
    ];
  }

  private canvas: HTMLCanvasElement | null = null;
  private renderer: WebGLRenderer | null = null;
  private scene: Scene | null = null;
  private camera: PerspectiveCamera | null = null;
  private mesh: Mesh | null = null;
  private kernel: SMNTCKernel | null = null;
  private resizeObserver: ResizeObserver | null = null;

  connectedCallback(): void {
    if (this.canvas) return;

    const shadow = this.attachShadow({ mode: 'open' });
    const canvas = document.createElement('canvas');
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    shadow.appendChild(canvas);

    const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true });
    const scene = new Scene();
    const camera = new PerspectiveCamera(45, 1, 0.1, 100);

    camera.position.set(0, 0, 4);

    this.canvas = canvas;
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;

    this.buildMesh();
    this.buildKernel();
    this.handleResize();

    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(this);
  }

  disconnectedCallback(): void {
    this.kernel?.dispose();
    this.kernel = null;

    this.mesh?.geometry.dispose();
    this.mesh = null;

    this.renderer?.dispose();
    this.renderer = null;

    this.resizeObserver?.disconnect();
    this.resizeObserver = null;

    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
    this.canvas = null;
  }

  attributeChangedCallback(name: string, _oldValue: string | null, _newValue: string | null): void {
    if (!this.kernel || !this.mesh) return;

    const config = this.readConfig();
    this.kernel.configure(config);

    if (name === 'geometry' || name === 'fidelity') {
      this.rebuildGeometry();
    }
  }

  // =========================================================================
  // Build / Update
  // =========================================================================

  private buildMesh(): void {
    if (!this.scene) return;

    const geometry = this.createGeometry();
    const mesh = new Mesh(geometry);
    this.scene.add(mesh);

    const scale = this.parseVec3(this.getAttribute('scale')) ?? [4, 4, 4];
    const position = this.parseVec3(this.getAttribute('position')) ?? [0, 0, 0];
    const rotation = this.parseVec3(this.getAttribute('rotation')) ?? [-Math.PI / 2, 0, 0];

    mesh.scale.set(scale[0], scale[1], scale[2]);
    mesh.position.set(position[0], position[1], position[2]);
    mesh.rotation.set(rotation[0], rotation[1], rotation[2]);

    this.mesh = mesh;
  }

  private buildKernel(): void {
    if (!this.mesh || !this.camera || !this.renderer || !this.canvas) return;

    const config = this.readConfig();
    const kernel = new SMNTCKernel({
      ...config,
      camera: this.camera,
      domElement: this.canvas,
    });

    kernel.apply(this.mesh, this.camera, this.canvas);
    kernel.start(this.renderer, this.scene ?? undefined, this.camera);

    this.kernel = kernel;
  }

  private rebuildGeometry(): void {
    if (!this.mesh) return;
    const next = this.createGeometry();
    this.mesh.geometry.dispose();
    this.mesh.geometry = next;
  }

  private createGeometry(): PlaneGeometry | IcosahedronGeometry | TorusGeometry {
    const geometry = this.getAttribute('geometry') ?? 'plane';
    const fidelity = (this.getAttribute('fidelity') as SMNTCConfig['fidelity']) ?? DEFAULTS.fidelity;
    const segments = resolveConstants({ fidelity }).segments;

    if (geometry === 'sphere') {
      return new IcosahedronGeometry(1, Math.min(segments, 128));
    }
    if (geometry === 'torus') {
      return new TorusGeometry(1, 0.4, Math.max(4, Math.floor(segments / 2)), segments);
    }

    return new PlaneGeometry(1, 1, segments, segments);
  }

  private handleResize(): void {
    if (!this.renderer || !this.camera || !this.canvas) return;
    const width = this.clientWidth || 1;
    const height = this.clientHeight || 1;

    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  private readConfig(): SMNTCConfig {
    return {
      surface: this.getAttribute('surface') as SMNTCConfig['surface'] ?? DEFAULTS.surface,
      vibe: this.getAttribute('vibe') as SMNTCConfig['vibe'] ?? DEFAULTS.vibe,
      reactivity: this.getAttribute('reactivity') as SMNTCConfig['reactivity'] ?? DEFAULTS.reactivity,
      fidelity: this.getAttribute('fidelity') as SMNTCConfig['fidelity'] ?? DEFAULTS.fidelity,
      palette: this.getAttribute('palette') as SMNTCConfig['palette'] ?? DEFAULTS.palette,
      wireframe: this.getBooleanAttr('wireframe', DEFAULTS.wireframe),
      intensity: this.getNumberAttr('intensity', DEFAULTS.intensity),
      speed: this.getNumberAttr('speed', DEFAULTS.speed),
      contourLines: this.getNumberAttr('contour-lines', DEFAULTS.contourLines),
      thermalGuard: this.getBooleanAttr('thermal-guard', DEFAULTS.thermalGuard),
    };
  }

  // =========================================================================
  // Attribute helpers
  // =========================================================================

  private getBooleanAttr(name: string, fallback: boolean): boolean {
    if (!this.hasAttribute(name)) return fallback;
    const v = this.getAttribute(name);
    if (v === null || v === '') return true;
    return v === 'true' || v === '1';
  }

  private getNumberAttr(name: string, fallback: number): number {
    const v = this.getAttribute(name);
    if (v === null || v === '') return fallback;
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }

  private parseVec3(raw: string | null): [number, number, number] | null {
    if (!raw) return null;
    const parts = raw.split(',').map((p) => Number(p.trim()));
    if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return null;
    return [parts[0], parts[1], parts[2]];
  }
}
