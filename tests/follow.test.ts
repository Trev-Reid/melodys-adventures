import { describe, expect, it } from 'vitest';
import { FollowBrain, type FollowerState, type LeaderState } from '../src/characters/follow/FollowBrain';
import { FOLLOW } from '../src/config/follow';

const DT = 1 / 60;
const me = (x: number, extra: Partial<FollowerState> = {}): FollowerState => ({
  x,
  feetY: 1000,
  onGround: true,
  blockedLeft: false,
  blockedRight: false,
  ...extra,
});
const leader = (x: number, feetY = 1000, onGround = true): LeaderState => ({ x, feetY, onGround });

describe('following', () => {
  it('walks towards the leader when too far away, either way', () => {
    expect(new FollowBrain(FOLLOW).update(me(0), leader(300), DT).intent.moveX).toBe(1);
    expect(new FollowBrain(FOLLOW).update(me(300), leader(0), DT).intent.moveX).toBe(-1);
  });

  it('stands still close to the leader', () => {
    expect(new FollowBrain(FOLLOW).update(me(0), leader(FOLLOW.stopDistance - 10), DT).intent.moveX).toBe(0);
  });

  it("keeps walking until it's close, then stops (no dithering at the edge)", () => {
    const brain = new FollowBrain(FOLLOW);
    brain.update(me(0), leader(FOLLOW.startDistance + 10), DT);
    const between = (FOLLOW.startDistance + FOLLOW.stopDistance) / 2;
    expect(brain.update(me(0), leader(between), DT).intent.moveX).toBe(1);
    expect(brain.update(me(0), leader(FOLLOW.stopDistance - 5), DT).intent.moveX).toBe(0);
    expect(brain.update(me(0), leader(between), DT).intent.moveX).toBe(0);
  });

  it('jumps over a wall in the way', () => {
    const d = new FollowBrain(FOLLOW).update(me(0, { blockedRight: true }), leader(300), DT);
    expect(d.intent.jumpPressed).toBe(true);
    expect(d.intent.jumpHeld).toBe(true);
  });

  it("doesn't jump at a wall behind it", () => {
    expect(new FollowBrain(FOLLOW).update(me(0, { blockedLeft: true }), leader(300), DT).intent.jumpPressed).toBe(false);
  });

  it('jumps up to a leader standing on a ledge nearby', () => {
    expect(new FollowBrain(FOLLOW).update(me(0), leader(80, 900), DT).intent.jumpPressed).toBe(true);
  });

  it("doesn't jump while the leader is just in mid-air", () => {
    expect(new FollowBrain(FOLLOW).update(me(0), leader(80, 900, false), DT).intent.jumpPressed).toBe(false);
  });

  it('only sprints when far behind', () => {
    expect(new FollowBrain(FOLLOW).update(me(0), leader(200), DT).intent.sprintHeld).toBe(false);
    expect(new FollowBrain(FOLLOW).update(me(0), leader(FOLLOW.sprintDistance + 50), DT).intent.sprintHeld).toBe(true);
  });

  it('catches up when left far behind', () => {
    expect(new FollowBrain(FOLLOW).update(me(0), leader(FOLLOW.catchUpDistance + 100), DT).catchUp).toBe(true);
  });

  it("waits to catch up until the leader lands, so there's ground to stand on", () => {
    expect(new FollowBrain(FOLLOW).update(me(0), leader(FOLLOW.catchUpDistance + 100, 900, false), DT).catchUp).toBe(false);
  });

  it("catches up when stuck below a ledge it can't jump onto", () => {
    const brain = new FollowBrain(FOLLOW);
    let caughtUp = false;
    for (let t = 0; t < FOLLOW.stuckSeconds + 0.5 && !caughtUp; t += DT) {
      caughtUp = brain.update(me(0), leader(60, 750), DT).catchUp;
    }
    expect(caughtUp).toBe(true);
  });

  it("isn't stuck while it keeps getting closer", () => {
    const brain = new FollowBrain(FOLLOW);
    let x = 0;
    for (let t = 0; t < FOLLOW.stuckSeconds * 2; t += DT) {
      expect(brain.update(me(x), leader(600), DT).catchUp).toBe(false);
      x += 2;
    }
  });

  it("isn't stuck just because the leader keeps running away", () => {
    const brain = new FollowBrain(FOLLOW);
    let lead = 300;
    for (let t = 0; t < FOLLOW.stuckSeconds * 2; t += DT) {
      expect(brain.update(me(0), leader(lead), DT).catchUp).toBe(false);
      lead += 1; // stays well inside catchUpDistance
    }
  });
});
