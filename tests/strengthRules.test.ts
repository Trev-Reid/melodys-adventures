import { describe, expect, it } from 'vitest';
import { canPush, impactSpeed, resolveImpact } from '../src/gameplay/interactions/strengthRules';
import { OBSTACLE_TYPES } from '../src/config/obstacles';
import type { Capability } from '../src/config/powerUps';

const has = (...caps: Capability[]) => (c: Capability) => caps.includes(c);
const crate = OBSTACLE_TYPES.heavyCrate;
const barrier = OBSTACLE_TYPES.woodenBarrier;
const fast = barrier.breakable!.minImpactSpeed + 50;

describe('pushing', () => {
  it('normal Melody cannot push the heavy crate; strong Melody can', () => {
    expect(canPush(has(), crate)).toBe(false);
    expect(canPush(has('sprint'), crate)).toBe(false);
    expect(canPush(has('strength'), crate)).toBe(true);
  });

  it('nobody can push something that is not pushable', () => {
    expect(canPush(has('strength'), barrier)).toBe(false);
  });
});

describe('breaking', () => {
  it('normal Melody just bumps into the barrier', () => {
    expect(resolveImpact(has(), barrier, 999)).toBe('tooWeak');
  });

  it('strong Melody needs a run-up', () => {
    expect(resolveImpact(has('strength'), barrier, 40)).toBe('needsRunUp');
    expect(resolveImpact(has('strength'), barrier, fast)).toBe('hit');
  });

  it('SUPER CHARGE smashes straight through', () => {
    expect(resolveImpact(has('strength', 'sprint', 'smash'), barrier, fast)).toBe('smash');
  });

  it('works out impact speed from direction', () => {
    const obstacle = { left: 100, right: 140, top: 0 };
    expect(impactSpeed({ vx: 300, vy: 0, left: 40, right: 100, bottom: 50 }, obstacle)).toBe(300);
    expect(impactSpeed({ vx: -300, vy: 0, left: 40, right: 100, bottom: 50 }, obstacle)).toBe(0); // moving away
    expect(impactSpeed({ vx: 0, vy: 400, left: 100, right: 140, bottom: 5 }, obstacle)).toBe(400); // landing on it
  });
});
