import { describe, expect, it } from 'vitest';
import { MELODY_SPRINT } from '../src/config/abilities';
import { SprintStamina } from '../src/characters/abilities/sprint/SprintStamina';

const DT = 1 / 60;
const run = (s: SprintStamina, want: boolean, seconds: number) => {
  for (let t = 0; t < seconds; t += DT) s.update(want, DT);
};

describe('SprintStamina', () => {
  it('drains while sprinting and runs out after staminaSeconds', () => {
    const s = new SprintStamina({ ...MELODY_SPRINT });
    run(s, true, MELODY_SPRINT.staminaSeconds / 2);
    expect(s.stamina).toBeCloseTo(0.5, 1);
    run(s, true, MELODY_SPRINT.staminaSeconds / 2 + DT);
    expect(s.exhausted).toBe(true);
    expect(s.stamina).toBeLessThan(0.05);
    expect(s.update(true, DT)).toBe(false);
  });

  it('must recover partly before sprinting again after running out', () => {
    const s = new SprintStamina({ ...MELODY_SPRINT });
    run(s, true, MELODY_SPRINT.staminaSeconds + 0.1);
    run(s, false, MELODY_SPRINT.rechargeDelaySeconds + 0.1);
    expect(s.update(true, DT)).toBe(false); // still tired
    run(s, false, MELODY_SPRINT.rechargeSeconds);
    expect(s.update(true, DT)).toBe(true);
  });

  it('recharges fully when not sprinting', () => {
    const s = new SprintStamina({ ...MELODY_SPRINT });
    run(s, true, 1);
    run(s, false, MELODY_SPRINT.rechargeDelaySeconds + MELODY_SPRINT.rechargeSeconds + 0.1);
    expect(s.stamina).toBe(1);
  });

  it('never drains when stamina is unlimited', () => {
    const s = new SprintStamina({ ...MELODY_SPRINT, staminaSeconds: Infinity });
    run(s, true, 30);
    expect(s.stamina).toBe(1);
    expect(s.sprinting).toBe(true);
  });
});
