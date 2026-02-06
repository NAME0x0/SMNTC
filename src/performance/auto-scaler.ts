// ============================================================================
// SMNTC — Performance Auto-Scaler
// Monitors frame delta and dynamically adjusts fidelity to maintain 60 FPS.
// ============================================================================

import type { Fidelity } from '../semantic/tokens';

export interface AutoScalerOptions {
  /** Target frame time in ms. Default: 16.6 (60 FPS). */
  targetFrameTime?: number;

  /** Number of frames to sample before making a decision. Default: 30. */
  sampleWindow?: number;

  /** How many consecutive "bad" samples before downgrading. Default: 20. */
  downgradeThreshold?: number;

  /** How many consecutive "good" samples before upgrading. Default: 60. */
  upgradeThreshold?: number;

  /** Whether auto-scaling is enabled. Default: true. */
  enabled?: boolean;
}

const FIDELITY_LADDER: Fidelity[] = ['low', 'medium', 'high', 'ultra'];

/**
 * Tracks frame-time averages and emits fidelity change recommendations.
 */
export class AutoScaler {
  private targetFrameTime: number;
  private sampleWindow: number;
  private downgradeThreshold: number;
  private upgradeThreshold: number;
  private enabled: boolean;

  private frameTimes: number[] = [];
  private consecutiveBad = 0;
  private consecutiveGood = 0;
  private currentIndex: number;

  /** Callback invoked when the scaler recommends a fidelity change. */
  public onFidelityChange: ((fidelity: Fidelity) => void) | null = null;

  constructor(
    initialFidelity: Fidelity = 'medium',
    options: AutoScalerOptions = {},
  ) {
    this.targetFrameTime = options.targetFrameTime ?? 16.6;
    this.sampleWindow = options.sampleWindow ?? 30;
    this.downgradeThreshold = options.downgradeThreshold ?? 20;
    this.upgradeThreshold = options.upgradeThreshold ?? 60;
    this.enabled = options.enabled ?? true;
    this.currentIndex = FIDELITY_LADDER.indexOf(initialFidelity);
    if (this.currentIndex === -1) this.currentIndex = 1; // fallback to medium
  }

  get currentFidelity(): Fidelity {
    return FIDELITY_LADDER[this.currentIndex];
  }

  /**
   * Report a frame's delta time (in milliseconds).
   * Call this once per animation frame.
   */
  reportFrame(deltaMs: number): void {
    if (!this.enabled) return;

    this.frameTimes.push(deltaMs);
    if (this.frameTimes.length > this.sampleWindow) {
      this.frameTimes.shift();
    }

    // Only evaluate after we have a full sample window
    if (this.frameTimes.length < this.sampleWindow) return;

    const avg =
      this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;

    if (avg > this.targetFrameTime * 1.15) {
      // Running slow: increment bad counter
      this.consecutiveBad++;
      this.consecutiveGood = 0;

      if (this.consecutiveBad >= this.downgradeThreshold && this.currentIndex > 0) {
        this.currentIndex--;
        this.consecutiveBad = 0;
        this.frameTimes.length = 0;
        this.onFidelityChange?.(this.currentFidelity);
      }
    } else if (avg < this.targetFrameTime * 0.75) {
      // Running fast: increment good counter
      this.consecutiveGood++;
      this.consecutiveBad = 0;

      if (
        this.consecutiveGood >= this.upgradeThreshold &&
        this.currentIndex < FIDELITY_LADDER.length - 1
      ) {
        this.currentIndex++;
        this.consecutiveGood = 0;
        this.frameTimes.length = 0;
        this.onFidelityChange?.(this.currentFidelity);
      }
    } else {
      // In the sweet spot
      this.consecutiveBad = 0;
      this.consecutiveGood = 0;
    }
  }

  /** Enable or disable the auto-scaler at runtime. */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.frameTimes.length = 0;
      this.consecutiveBad = 0;
      this.consecutiveGood = 0;
    }
  }

  dispose(): void {
    this.frameTimes.length = 0;
    this.onFidelityChange = null;
  }
}
