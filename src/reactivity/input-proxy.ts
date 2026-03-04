// ============================================================================
// SMNTC — Input Proxy
// Captures mouse, touch, and scroll coordinates and normalizes them
// for shader consumption. Sub-frame latency via direct uniform writes.
// ============================================================================

import type { Camera, Intersection, Mesh, Raycaster, Vector3 } from 'three';
import { Vector2 } from 'three';
import type { SMNTCUniforms } from '../kernel/uniforms';

const NDC_EPSILON = 1e-5;

export interface InputProxyOptions {
  /** The DOM element to listen on (typically renderer.domElement). */
  domElement: HTMLElement;

  /** Three.js camera for raycasting. */
  camera: Camera;

  /** Three.js raycaster instance (reused). */
  raycaster: Raycaster;

  /** The mesh to raycast against. */
  mesh: Mesh;

  /** Uniforms to write pointer data into. */
  uniforms: SMNTCUniforms;

  /** Whether to listen for shockwave clicks. */
  enableShockwave: boolean;
}

/**
 * Captures pointer & scroll and writes directly into shader uniforms.
 * Zero-allocation on each frame — mutates Vector3 in place.
 */
export class InputProxy {
  private domElement: HTMLElement;
  private camera: Camera;
  private raycaster: Raycaster;
  private mesh: Mesh;
  private uniforms: SMNTCUniforms;
  private enableShockwave: boolean;

  private ndcX = 0;
  private ndcY = 0;
  private shockStartTime = -100;
  private shockPending = false;
  private pointerDirty = false;

  // Reusable Vector2 for raycaster — zero allocation per frame
  private readonly _ndcVec = new Vector2();
  private readonly _intersections: Intersection[] = [];

  // Cached bounding rect — invalidated on resize
  private cachedRect: DOMRect | null = null;

  // Bound handler references for clean removal
  private _onPointerMove: (e: PointerEvent) => void;
  private _onPointerDown: (e: PointerEvent) => void;
  private _onResize: () => void;
  private _disposed = false;

  constructor(options: InputProxyOptions) {
    this.domElement = options.domElement;
    this.camera = options.camera;
    this.raycaster = options.raycaster;
    this.mesh = options.mesh;
    this.uniforms = options.uniforms;
    this.enableShockwave = options.enableShockwave;

    this._onPointerMove = this.handlePointerMove.bind(this);
    this._onPointerDown = this.handlePointerDown.bind(this);
    this._onResize = () => { this.cachedRect = null; };

    // Shockwave only needs click-position raycasts, not continuous pointer tracking.
    if (this.enableShockwave) {
      this.domElement.addEventListener('pointerdown', this._onPointerDown, { passive: true });
    } else {
      this.pointerDirty = true;
      this.domElement.addEventListener('pointermove', this._onPointerMove, { passive: true });
    }
    window.addEventListener('resize', this._onResize, { passive: true });
  }

  private handlePointerMove(e: PointerEvent): void {
    this.updatePointerNdc(e.clientX, e.clientY);
  }

  private handlePointerDown(e: PointerEvent): void {
    this.updatePointerNdc(e.clientX, e.clientY, true);
    this.shockPending = true;
  }

  private updatePointerNdc(clientX: number, clientY: number, forceDirty = false): void {
    if (!this.cachedRect) {
      this.cachedRect = this.domElement.getBoundingClientRect();
    }
    const rect = this.cachedRect;
    const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -((clientY - rect.top) / rect.height) * 2 + 1;
    if (
      forceDirty
      || Math.abs(ndcX - this.ndcX) > NDC_EPSILON
      || Math.abs(ndcY - this.ndcY) > NDC_EPSILON
    ) {
      this.ndcX = ndcX;
      this.ndcY = ndcY;
      this.pointerDirty = true;
    }
  }

  /**
   * Called once per frame to update uniforms.
   * Uses raycasting to find the world-space pointer intersection.
   */
  update(time: number): void {
    if (this._disposed) return;

    if (this.pointerDirty) {
      // Raycast from camera through NDC pointer
      this._ndcVec.set(this.ndcX, this.ndcY);
      this.raycaster.setFromCamera(this._ndcVec, this.camera);
      this._intersections.length = 0;
      this.raycaster.intersectObject(this.mesh, false, this._intersections);

      if (this._intersections.length > 0) {
        const point: Vector3 = this._intersections[0].point;
        // Write directly into the uniform's Vector3 — zero allocation
        this.uniforms.uPointer.value.copy(point);
      }

      this.pointerDirty = false;
    }

    // Shockwave timing
    if (this.enableShockwave) {
      if (this.shockPending) {
        this.shockStartTime = time;
        this.shockPending = false;
      }
      this.uniforms.uShockTime.value = time - this.shockStartTime;
    }
  }

  dispose(): void {
    this._disposed = true;
    this.domElement.removeEventListener('pointermove', this._onPointerMove);
    this.domElement.removeEventListener('pointerdown', this._onPointerDown);
    window.removeEventListener('resize', this._onResize);
    this.cachedRect = null;
    this._intersections.length = 0;
  }
}
