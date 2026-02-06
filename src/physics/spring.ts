// ============================================================================
// SMNTC — Spring Physics Engine
// Damped harmonic oscillator for smooth semantic state transitions.
// F = -k · x - c · v
// ============================================================================

export interface SpringConfig {
  /** Stiffness (tension). Higher = snappier. Range: [10, 500]. Default: 170 */
  stiffness: number;

  /** Damping coefficient. Higher = less bounce. Range: [1, 50]. Default: 26 */
  damping: number;

  /** Mass of the virtual point. Default: 1.0 */
  mass: number;

  /** Precision threshold — spring "settles" when |v| + |displacement| < this. */
  precision: number;
}

export const DEFAULT_SPRING: SpringConfig = {
  stiffness: 170,
  damping: 26,
  mass: 1.0,
  precision: 0.001,
};

/**
 * A single spring-animated scalar.
 */
export class Spring {
  private _value: number;
  private _velocity: number;
  private _target: number;
  private _settled: boolean;

  public readonly config: SpringConfig;

  constructor(initial: number, config?: Partial<SpringConfig>) {
    this._value = initial;
    this._velocity = 0;
    this._target = initial;
    this._settled = true;
    this.config = { ...DEFAULT_SPRING, ...config };
  }

  /** Current interpolated value. */
  get value(): number {
    return this._value;
  }

  /** Current target value. */
  get target(): number {
    return this._target;
  }

  /** Whether the spring has reached equilibrium. */
  get settled(): boolean {
    return this._settled;
  }

  /**
   * Set a new target. The spring will animate toward it.
   */
  setTarget(target: number): void {
    if (target !== this._target) {
      this._target = target;
      this._settled = false;
    }
  }

  /**
   * Immediately jump to a value (no animation).
   */
  snap(value: number): void {
    this._value = value;
    this._target = value;
    this._velocity = 0;
    this._settled = true;
  }

  /**
   * Advance the spring by `dt` seconds.
   * Uses semi-implicit Euler integration for stability.
   */
  step(dt: number): number {
    if (this._settled) return this._value;

    const { stiffness, damping, mass, precision } = this.config;

    // Clamp dt to prevent explosion on tab-refocus
    const safeDt = Math.min(dt, 0.064);

    const displacement = this._value - this._target;
    const springForce = -stiffness * displacement;
    const dampingForce = -damping * this._velocity;
    const acceleration = (springForce + dampingForce) / mass;

    // Semi-implicit Euler: update velocity first, then position
    this._velocity += acceleration * safeDt;
    this._value += this._velocity * safeDt;

    // Settle check
    if (
      Math.abs(this._velocity) < precision &&
      Math.abs(this._value - this._target) < precision
    ) {
      this._value = this._target;
      this._velocity = 0;
      this._settled = true;
    }

    return this._value;
  }
}

/**
 * A bank of named springs — one per animatable shader uniform.
 */
export class SpringBank {
  private springs: Map<string, Spring> = new Map();
  private springConfig: Partial<SpringConfig>;

  constructor(config?: Partial<SpringConfig>) {
    this.springConfig = config ?? {};
  }

  /**
   * Ensure a spring exists for the given key, creating it at `initial` if new.
   */
  ensure(key: string, initial: number): Spring {
    let s = this.springs.get(key);
    if (!s) {
      s = new Spring(initial, this.springConfig);
      this.springs.set(key, s);
    }
    return s;
  }

  /**
   * Set the target for a specific spring. Creates if missing.
   */
  setTarget(key: string, target: number, initial?: number): void {
    const s = this.ensure(key, initial ?? target);
    s.setTarget(target);
  }

  /**
   * Get the current interpolated value of a spring.
   */
  getValue(key: string): number {
    return this.springs.get(key)?.value ?? 0;
  }

  /**
   * Advance all springs by `dt` seconds.
   * Returns `true` if any spring is still animating.
   */
  step(dt: number): boolean {
    let anyActive = false;
    for (const spring of this.springs.values()) {
      spring.step(dt);
      if (!spring.settled) anyActive = true;
    }
    return anyActive;
  }

  /**
   * Whether all springs have settled.
   */
  get settled(): boolean {
    for (const spring of this.springs.values()) {
      if (!spring.settled) return false;
    }
    return true;
  }

  /**
   * Immediately snap all springs to their targets.
   */
  snapAll(): void {
    for (const spring of this.springs.values()) {
      spring.snap(spring.target);
    }
  }

  /**
   * Remove all springs and free memory.
   */
  dispose(): void {
    this.springs.clear();
  }
}
