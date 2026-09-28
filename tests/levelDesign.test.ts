/**
 * Level design checks: simulate Melody's jumps with the real movement code
 * and tuning, so changing a movement value can't silently break a level.
 */
import { describe, expect, it } from 'vitest';
import { MELODY_MOVEMENT } from '../src/config/movement';
import { MELODY_SPRINT } from '../src/config/abilities';
import { PlatformerMovement } from '../src/movement/PlatformerMovement';
import { getLevel } from '../src/levels';

const MELODYS_PLAYGROUND = getLevel('melodys-playground');
import { DEFAULT_PLATFORM_HEIGHT } from '../src/levels/LevelDefinition';
import { OBSTACLE_TYPES } from '../src/config/obstacles';

const DT = 1 / 60;
const BODY_W = 46;

/**
 * Run right off a ledge at full speed, pressing jump `jumpOffset` px before the
 * edge (negative = after the edge, using coyote time). Returns the body's right
 * edge at the moment her feet come back down to `targetTop`.
 */
function jumpReach(opts: { sprint: boolean; ledgeRight: number; ledgeTop: number; targetTop: number; jumpOffset: number }): number {
  const m = new PlatformerMovement({ ...MELODY_MOVEMENT });
  const mult = opts.sprint ? MELODY_SPRINT.speedMultiplier : 1;
  let x = opts.ledgeRight - 400; // body left edge
  let feet = opts.ledgeTop;
  let vx = MELODY_MOVEMENT.maxSpeed * mult;
  let vy = 0;
  let jumpDone = false;
  let rising = false;

  for (let i = 0; i < 600; i++) {
    const onGround = !rising && feet >= opts.ledgeTop && x < opts.ledgeRight;
    if (onGround) { feet = opts.ledgeTop; vy = Math.max(0, vy); }
    const pressJump = !jumpDone && x >= opts.ledgeRight - opts.jumpOffset;
    if (pressJump) jumpDone = true;

    m.modifiers.maxSpeed = mult;
    m.modifiers.acceleration = opts.sprint ? MELODY_SPRINT.accelerationMultiplier : 1;
    const out = m.step({ vx, vy, onGround }, { moveX: 1, jumpPressed: pressJump, jumpHeld: true }, DT);
    vx = out.vx;
    vy = out.vy + out.gravityY * DT; // Arcade: velocity then position
    if (out.jumped) rising = true;
    x += vx * DT;
    feet += vy * DT;
    if (vy < 0) rising = true;
    if (rising && vy > 0 && feet >= opts.targetTop) return x + BODY_W;
  }
  throw new Error('simulation did not land');
}

describe("Melody's Playground", () => {
  const secret = MELODYS_PLAYGROUND.platforms.find((p) => p.y === 300)!;
  const lookout = MELODYS_PLAYGROUND.platforms.find((p) => p.y === 380 && p.width === 256)!;
  const base = { ledgeRight: lookout.x + lookout.width, ledgeTop: lookout.y, targetTop: secret.y };

  it('the secret ledge is out of reach of a normal jump, even with perfect timing', () => {
    for (const jumpOffset of [0, -5, -10, -20] /* up to the coyote-time limit */) {
      expect(jumpReach({ ...base, sprint: false, jumpOffset })).toBeLessThan(secret.x);
    }
  });

  it('the secret ledge is reachable with a sprint-jump, even jumping a little early', () => {
    for (const jumpOffset of [0, 10, 20]) {
      expect(jumpReach({ ...base, sprint: true, jumpOffset })).toBeGreaterThan(secret.x + 8);
    }
  });

  it('every sausage sits in open space, not inside a platform or obstacle', () => {
    const boxes = [
      ...MELODYS_PLAYGROUND.platforms.map((p) => ({ x: p.x, y: p.y, w: p.width, h: p.height ?? DEFAULT_PLATFORM_HEIGHT })),
      ...(MELODYS_PLAYGROUND.obstacles ?? []).map((o) => ({ x: o.x, y: o.y, w: OBSTACLE_TYPES[o.type].width, h: OBSTACLE_TYPES[o.type].height })),
    ];
    for (const s of MELODYS_PLAYGROUND.collectibles ?? []) {
      for (const b of boxes) {
        const inside = s.x > b.x && s.x < b.x + b.w && s.y > b.y && s.y < b.y + b.h;
        expect(inside, `sausage at ${s.x},${s.y}`).toBe(false);
      }
    }
  });

  describe('Strength Zone', () => {
    const ledge = MELODYS_PLAYGROUND.platforms.find((p) => p.height === 220)!;
    const crateDef = MELODYS_PLAYGROUND.obstacles!.find((o) => o.type === 'heavyCrate')!;
    const crate = OBSTACLE_TYPES.heavyCrate;
    const ssLedge = MELODYS_PLAYGROUND.platforms.find((p) => p.x === 3870)!;

    it('the high ledge is too high to jump onto from the ground', () => {
      expect(MELODYS_PLAYGROUND.height - 64 - ledge.y).toBeGreaterThan(MELODY_MOVEMENT.jumpVelocity ** 2 / (2 * MELODY_MOVEMENT.gravity));
    });

    it('the ledge cannot be reached from the crate where it starts - even sprint-jumping', () => {
      const reach = jumpReach({ sprint: true, ledgeRight: crateDef.x + crate.width, ledgeTop: crateDef.y, targetTop: ledge.y, jumpOffset: -10 });
      expect(reach).toBeLessThan(ledge.x);
    });

    it('the ledge cannot be reached from the Super Sausage ledge either', () => {
      const reach = jumpReach({ sprint: true, ledgeRight: ssLedge.x + ssLedge.width, ledgeTop: ssLedge.y, targetTop: ledge.y, jumpOffset: -10 });
      expect(reach).toBeLessThan(ledge.x);
    });

    it('once the crate is pushed against the ledge, it is an easy jump up', () => {
      const rise = crateDef.y - ledge.y;
      expect(rise).toBeLessThan(MELODY_MOVEMENT.jumpVelocity ** 2 / (2 * MELODY_MOVEMENT.gravity) - 12);
    });
  });
});
