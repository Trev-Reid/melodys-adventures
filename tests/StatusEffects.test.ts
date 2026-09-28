import { describe, expect, it } from 'vitest';
import { StatusEffects, resolveCapabilities } from '../src/gameplay/effects/StatusEffects';
import { EFFECTS } from '../src/config/powerUps';

describe('StatusEffects', () => {
  it('SUPER_STRENGTH lasts its configured duration, then ends', () => {
    const fx = new StatusEffects();
    const events: string[] = [];
    fx.listen({ onStart: (t) => events.push(`start ${t}`), onEnd: (t) => events.push(`end ${t}`) });

    fx.apply('SUPER_STRENGTH');
    expect(fx.has('SUPER_STRENGTH')).toBe(true);
    expect(fx.capabilities()).toContain('strength');

    fx.update(EFFECTS.SUPER_STRENGTH.durationSeconds - 0.1);
    expect(fx.has('SUPER_STRENGTH')).toBe(true);
    fx.update(0.2);
    expect(fx.has('SUPER_STRENGTH')).toBe(false);
    expect(fx.capabilities()).not.toContain('strength');
    expect(events).toEqual(['start SUPER_STRENGTH', 'end SUPER_STRENGTH']);
  });

  it('picking it up again tops the timer back up instead of stacking', () => {
    const fx = new StatusEffects();
    fx.apply('SUPER_STRENGTH');
    fx.update(10);
    fx.apply('SUPER_STRENGTH');
    expect(fx.remaining('SUPER_STRENGTH')).toBeCloseTo(EFFECTS.SUPER_STRENGTH.durationSeconds);
    expect(fx.list()).toHaveLength(1);
  });

  it('SUPER_STRENGTH makes her buff and bigger, with a warning near the end', () => {
    const fx = new StatusEffects();
    expect(fx.appearance()).toEqual({ skin: undefined, scale: 1, warning: false });
    fx.apply('SUPER_STRENGTH');
    const look = fx.appearance();
    expect(look.skin).toBe('buff');
    expect(look.scale).toBeGreaterThan(1);
    expect(look.warning).toBe(false);
    fx.update(EFFECTS.SUPER_STRENGTH.durationSeconds - EFFECTS.SUPER_STRENGTH.warnAtSeconds + 0.1);
    expect(fx.appearance().warning).toBe(true);
    fx.update(EFFECTS.SUPER_STRENGTH.warnAtSeconds);
    expect(fx.appearance()).toEqual({ skin: undefined, scale: 1, warning: false });
  });

  it('supports custom durations', () => {
    const fx = new StatusEffects();
    fx.apply('SUPER_STRENGTH', 3);
    fx.update(3.1);
    expect(fx.has('SUPER_STRENGTH')).toBe(false);
  });
});

describe('capabilities and combos', () => {
  it('strength alone is just strength', () => {
    const { capabilities, combos } = resolveCapabilities(['strength']);
    expect([...capabilities]).toEqual(['strength']);
    expect(combos).toHaveLength(0);
  });

  it('strength + sprint = SUPER CHARGE (smash)', () => {
    const { capabilities, combos } = resolveCapabilities(['strength', 'sprint']);
    expect(capabilities.has('smash')).toBe(true);
    expect(combos.map((c) => c.name)).toEqual(['SUPER CHARGE']);
  });

  it('sprint alone does not smash', () => {
    expect(resolveCapabilities(['sprint']).capabilities.has('smash')).toBe(false);
  });
});
