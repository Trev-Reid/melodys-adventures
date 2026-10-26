import { describe, expect, it } from 'vitest';
import sheet from '../src/characters/boy/boySheet.json';
import { climbFrame, interruptsAction, pickBoyAnim, waitDue, WAIT_AFTER_SECONDS, type BoyAnimInput } from '../src/characters/boy/boyAnimState';

const base: BoyAnimInput = { climbing: false, climbedYet: false, loco: 'idle', happy: false, waitDue: false };

describe("the boy's animations", () => {
  it('follows how he moves', () => {
    expect(pickBoyAnim(base)).toBe('idle');
    expect(pickBoyAnim({ ...base, loco: 'walk' })).toBe('walk');
    expect(pickBoyAnim({ ...base, loco: 'run' })).toBe('run');
    expect(pickBoyAnim({ ...base, loco: 'sprint' })).toBe('run'); // he has no sprint of his own
    for (const air of ['jump', 'air', 'fall', 'land'] as const) expect(pickBoyAnim({ ...base, loco: air })).toBe(air);
  });

  it('climbs seen from behind: hanging on until he moves, then hand over hand with the distance climbed', () => {
    expect(pickBoyAnim({ ...base, climbing: true })).toBe('climb_idle');
    expect(pickBoyAnim({ ...base, climbing: true, climbedYet: true, action: 'throw' })).toBe('climb');
    expect([0, 11, 12, 24, 36, 48].map((d) => climbFrame(d))).toEqual([0, 0, 1, 2, 3, 0]);
    expect(climbFrame(-24)).toBe(2); // climbing down too
  });

  it('acts things out, but walking off cuts a standing action short', () => {
    expect(pickBoyAnim({ ...base, action: 'pull' })).toBe('pull');
    expect(pickBoyAnim({ ...base, action: 'pull', loco: 'walk' })).toBe('walk');
    expect(pickBoyAnim({ ...base, action: 'throw', loco: 'run' })).toBe('throw'); // quick enough to finish on the run
    expect(interruptsAction('pickup', 'land')).toBe(false);
    expect(interruptsAction('call', 'jump')).toBe(true);
  });

  it('fidgets after standing about, and cheers when the level is done', () => {
    expect(waitDue(WAIT_AFTER_SECONDS - 0.1)).toBe(false);
    expect(waitDue(WAIT_AFTER_SECONDS + 0.5)).toBe(true);
    expect(waitDue(WAIT_AFTER_SECONDS + 3)).toBe(false);
    expect(pickBoyAnim({ ...base, waitDue: true })).toBe('wait');
    expect(pickBoyAnim({ ...base, happy: true })).toBe('cheer');
  });
});

describe("the boy's sprite sheet (boySheet.json)", () => {
  const frames = Object.values(sheet.animations).flatMap((a) => a.frames);

  it('has every animation the game plays, and a ball position for every frame of every skin', () => {
    for (const name of ['idle', 'walk', 'run', 'jump', 'air', 'fall', 'land', 'climb', 'climb_idle', 'wait', 'pickup', 'catch', 'throw', 'throw_up', 'pull', 'open', 'call', 'point', 'cheer']) {
      expect(sheet.animations, name).toHaveProperty(name);
    }
    expect(sheet.animations.climb.frames).toHaveLength(4);
    for (const skin of Object.keys(sheet.variants) as (keyof typeof sheet.ball)[]) {
      expect(sheet.ball[skin].length).toBeGreaterThanOrEqual(Math.max(...frames) + 1);
    }
  });

  it('frames are 64x80 (art pixels 2x2), with room above his head', () => {
    expect([sheet.frameWidth, sheet.frameHeight]).toEqual([64, 80]);
    expect(sheet.frameWidth % 2 + sheet.frameHeight % 2).toBe(0);
  });

  it('carries the ball where he always held it, so throws start from his hands', () => {
    // The ball leaves his hand at 13px in front, 27px up (Boy.handPosition): unchanged gameplay.
    for (const anim of sheet.carryAnimations as (keyof typeof sheet.animations)[]) {
      for (const f of sheet.animations[anim].frames) {
        const [x, y] = sheet.ball.carry[f];
        expect(Math.abs(x - 13), `${anim} frame ${f}`).toBeLessThanOrEqual(8);
        expect(Math.abs(y + 27), `${anim} frame ${f}`).toBeLessThanOrEqual(8);
      }
    }
    const [tx, ty] = sheet.ball.normal[sheet.animations.throw.frames[0]];
    expect(Math.hypot(tx - 13, ty + 27)).toBeLessThan(8);
  });
});
