import { describe, it, expect } from 'vitest';
import { Spring, SpringBank } from '../physics/spring';

// ============================================================================
// Spring (single scalar)
// ============================================================================

describe('Spring', () => {
  it('starts settled at the initial value', () => {
    const s = new Spring(5.0);
    expect(s.value).toBe(5.0);
    expect(s.target).toBe(5.0);
    expect(s.settled).toBe(true);
  });

  it('becomes unsettled when target changes', () => {
    const s = new Spring(0);
    s.setTarget(10);
    expect(s.settled).toBe(false);
    expect(s.target).toBe(10);
  });

  it('does not unsettle when target is set to current value', () => {
    const s = new Spring(5.0);
    s.setTarget(5.0);
    expect(s.settled).toBe(true);
  });

  it('converges toward the target over time', () => {
    const s = new Spring(0);
    s.setTarget(10);

    // Simulate ~1 second at 60fps
    for (let i = 0; i < 60; i++) {
      s.step(1 / 60);
    }

    // Should be very close to target
    expect(s.value).toBeCloseTo(10, 1);
  });

  it('eventually settles', () => {
    const s = new Spring(0);
    s.setTarget(10);

    // Simulate 5 seconds — more than enough for any config
    for (let i = 0; i < 300; i++) {
      s.step(1 / 60);
    }

    expect(s.settled).toBe(true);
    expect(s.value).toBe(10);
  });

  it('snap() immediately jumps to value', () => {
    const s = new Spring(0);
    s.setTarget(10);
    s.step(1 / 60); // Move a bit
    s.snap(42);

    expect(s.value).toBe(42);
    expect(s.target).toBe(42);
    expect(s.settled).toBe(true);
  });

  it('clamps dt to prevent physics explosion', () => {
    const s = new Spring(0);
    s.setTarget(10);

    // Simulate a huge dt (like after a tab refocus)
    s.step(5.0); // 5 seconds in one "frame"

    // Should not produce NaN or absurd values
    expect(Number.isFinite(s.value)).toBe(true);
    expect(Math.abs(s.value)).toBeLessThan(100);
  });

  it('respects custom config', () => {
    // Very high stiffness = converges faster
    const stiff = new Spring(0, { stiffness: 500, damping: 50 });
    const soft = new Spring(0, { stiffness: 10, damping: 5 });

    stiff.setTarget(10);
    soft.setTarget(10);

    // Simulate 30 frames
    for (let i = 0; i < 30; i++) {
      stiff.step(1 / 60);
      soft.step(1 / 60);
    }

    // Stiff spring should be closer to target
    expect(Math.abs(stiff.value - 10)).toBeLessThan(Math.abs(soft.value - 10));
  });
});

// ============================================================================
// SpringBank (named collection)
// ============================================================================

describe('SpringBank', () => {
  it('creates springs on demand via ensure()', () => {
    const bank = new SpringBank();
    const s = bank.ensure('freq', 0.5);
    expect(s.value).toBe(0.5);
  });

  it('returns existing spring on second ensure()', () => {
    const bank = new SpringBank();
    const s1 = bank.ensure('freq', 0.5);
    const s2 = bank.ensure('freq', 999); // initial ignored — spring already exists
    expect(s1).toBe(s2);
    expect(s2.value).toBe(0.5); // Not 999
  });

  it('getValue() returns 0 for non-existent springs', () => {
    const bank = new SpringBank();
    expect(bank.getValue('nonexistent')).toBe(0);
  });

  it('setTarget() creates spring if missing', () => {
    const bank = new SpringBank();
    bank.setTarget('freq', 2.5, 0.5);
    expect(bank.getValue('freq')).toBe(0.5); // Created at initial, not yet stepped
  });

  it('step() advances all springs', () => {
    const bank = new SpringBank();
    bank.setTarget('a', 10, 0);
    bank.setTarget('b', 20, 0);

    for (let i = 0; i < 120; i++) {
      bank.step(1 / 60);
    }

    expect(bank.getValue('a')).toBeCloseTo(10, 0);
    expect(bank.getValue('b')).toBeCloseTo(20, 0);
  });

  it('reports settled when all springs are at rest', () => {
    const bank = new SpringBank();
    bank.ensure('x', 5);
    expect(bank.settled).toBe(true);

    bank.setTarget('x', 10);
    expect(bank.settled).toBe(false);

    for (let i = 0; i < 300; i++) {
      bank.step(1 / 60);
    }
    expect(bank.settled).toBe(true);
  });

  it('snapAll() immediately settles all springs', () => {
    const bank = new SpringBank();
    bank.setTarget('a', 10, 0);
    bank.setTarget('b', 20, 0);

    bank.snapAll();

    expect(bank.getValue('a')).toBe(10);
    expect(bank.getValue('b')).toBe(20);
    expect(bank.settled).toBe(true);
  });

  it('dispose() clears all springs', () => {
    const bank = new SpringBank();
    bank.ensure('a', 1);
    bank.ensure('b', 2);

    bank.dispose();

    expect(bank.getValue('a')).toBe(0); // Non-existent → 0
    expect(bank.settled).toBe(true); // Empty bank is settled
  });
});
