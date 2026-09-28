import { describe, expect, it } from 'vitest';
import { LAND_POSE_SECONDS, pickLocomotionAnim } from '../src/characters/animationState';

const MAX = 320;
const base = { onGround: true, vx: 0, vy: 0, maxSpeed: MAX, secondsSinceLanding: 10 };

describe('pickLocomotionAnim', () => {
  it('idles, walks, runs and sprints depending on speed', () => {
    expect(pickLocomotionAnim(base)).toBe('idle');
    expect(pickLocomotionAnim({ ...base, vx: 100 })).toBe('walk');
    expect(pickLocomotionAnim({ ...base, vx: -MAX })).toBe('run');
    expect(pickLocomotionAnim({ ...base, vx: MAX * 1.6 })).toBe('sprint');
  });

  it('shows take-off while rising fast, mid-air near the top, and falling on the way down', () => {
    expect(pickLocomotionAnim({ ...base, onGround: false, vy: -500 })).toBe('jump');
    expect(pickLocomotionAnim({ ...base, onGround: false, vy: -50 })).toBe('air');
    expect(pickLocomotionAnim({ ...base, onGround: false, vy: 400 })).toBe('fall');
  });

  it('holds the landing pose briefly after touching down', () => {
    expect(pickLocomotionAnim({ ...base, vx: MAX, secondsSinceLanding: 0 })).toBe('land');
    expect(pickLocomotionAnim({ ...base, vx: MAX, secondsSinceLanding: LAND_POSE_SECONDS + 0.01 })).toBe('run');
  });
});
