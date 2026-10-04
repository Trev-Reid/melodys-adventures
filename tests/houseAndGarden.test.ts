/**
 * Level design checks for Melody's House and Garden: each puzzle needs the
 * powers it's meant to need, simulated with the real movement code and tuning.
 */
import { describe, expect, it } from 'vitest';
import { MELODY_MOVEMENT } from '../src/config/movement';
import { MELODY_BARK, MELODY_SPRINT } from '../src/config/abilities';
import { OBSTACLE_TYPES } from '../src/config/obstacles';
import { DEFAULT_REVEAL_RADIUS } from '../src/config/scents';
import { PlatformerMovement } from '../src/movement/PlatformerMovement';
import { barkBoostVelocity } from '../src/gameplay/bark/barkRules';
import { DEFAULT_PLATFORM_HEIGHT } from '../src/levels/LevelDefinition';
import { getLevel } from '../src/levels';

const LEVEL = getLevel('house-and-garden');
const DT = 1 / 60;
const BODY_W = 46;
const G = LEVEL.height - 64;
const { boost } = MELODY_BARK;

/**
 * Jump (running right if `run`), barking `boostFrame` frames after take-off.
 * Returns the path as { right edge, feet } per frame, with x measured from
 * where she took off.
 */
function flight(opts: { run: boolean; sprint?: boolean; boostSpeed?: number; boostFrame?: number }): { x: number; feet: number }[] {
  const m = new PlatformerMovement({ ...MELODY_MOVEMENT });
  const mult = opts.sprint ? MELODY_SPRINT.speedMultiplier : 1;
  m.modifiers.maxSpeed = mult;
  m.modifiers.acceleration = opts.sprint ? MELODY_SPRINT.accelerationMultiplier : 1;
  let vx = opts.run ? MELODY_MOVEMENT.maxSpeed * mult : 0;
  let vy = 0;
  let x = BODY_W;
  let feet = 0;
  const path = [];
  for (let i = 0; i < 300; i++) {
    const out = m.step({ vx, vy, onGround: i === 0 }, { moveX: opts.run ? 1 : 0, jumpPressed: i === 0, jumpHeld: true }, DT);
    vx = out.vx;
    vy = out.vy;
    if (opts.boostSpeed && i === opts.boostFrame) {
      vy = barkBoostVelocity(vy, opts.boostSpeed) ?? vy;
      m.endJump();
    }
    vy += out.gravityY * DT;
    x += vx * DT;
    feet += vy * DT;
    path.push({ x, feet });
    if (feet > 0) break;
  }
  return path;
}

/** Highest she can get her feet (px above where she jumped), barking at the best moment. */
function maxRise(boostSpeed?: number): number {
  let best = 0;
  for (let f = 0; f < 80; f++) {
    for (const p of flight({ run: false, boostSpeed, boostFrame: boostSpeed ? f : -1 })) best = Math.max(best, -p.feet);
  }
  return best;
}

/** Can a running (sprint) jump from a ledge's edge get her on top of a wall `gap` px away and `rise` px higher? */
function canClearWall(gap: number, rise: number, boostSpeed: number): boolean {
  for (let f = 0; f < 80; f++) {
    // Pressed against the wall, she slides up it and steps on top once her feet clear it.
    const path = flight({ run: true, sprint: true, boostSpeed, boostFrame: f });
    if (path.some((p) => p.x >= gap + BODY_W && -p.feet >= rise)) return true;
  }
  return false;
}

const plain = maxRise();
const normalBoost = maxRise(boost.speed);
const superBoost = maxRise(boost.superSpeed);
const platform = (x: number) => LEVEL.platforms.find((p) => p.x === x)!;
const height = (p: { y: number; height?: number }) => p.height ?? DEFAULT_PLATFORM_HEIGHT;

describe("Melody's House and Garden", () => {
  it('every sausage sits in open space, not inside a platform or obstacle', () => {
    const boxes = [
      ...LEVEL.platforms.filter((p) => !p.oneWay).map((p) => ({ x: p.x, y: p.y, w: p.width, h: height(p) })),
      ...(LEVEL.obstacles ?? []).map((o) => ({ x: o.x, y: o.y, w: OBSTACLE_TYPES[o.type].width, h: OBSTACLE_TYPES[o.type].height })),
    ];
    for (const c of LEVEL.collectibles ?? []) {
      for (const b of boxes) {
        const inside = c.x > b.x && c.x < b.x + b.w && c.y > b.y && c.y < b.y + b.h;
        expect(inside, `${c.kind} at ${c.x},${c.y}`).toBe(false);
      }
    }
  });

  it('the fridge needs a BARK BOOST', () => {
    const fridge = platform(1140);
    const h = G - fridge.y;
    expect(plain).toBeLessThan(h);
    expect(normalBoost).toBeGreaterThan(h + 10);
  });

  it('the bookcase needs a SUPER BOOST', () => {
    const h = G - platform(1980).y;
    expect(normalBoost).toBeLessThan(h);
    expect(superBoost).toBeGreaterThan(h + 10);
  });

  it("the bookcase can't be reached without SUPER BARK by jumping from the top of the fridge", () => {
    const fridge = platform(1140);
    const bookcase = platform(1980);
    const gap = bookcase.x - (fridge.x + fridge.width);
    expect(canClearWall(gap, fridge.y - bookcase.y, boost.speed)).toBe(false);
  });

  it('the back door and shed door have no gap above them to jump through', () => {
    const doors = LEVEL.obstacles!.filter((o) => o.type === 'woodenBarrier');
    for (const door of doors) {
      const above = LEVEL.platforms.find((p) => !p.oneWay && p.y + height(p) === door.y && p.x <= door.x && p.x + p.width >= door.x + OBSTACLE_TYPES.woodenBarrier.width);
      expect(above, `door at ${door.x}`).toBeDefined();
    }
    // The house wall is too tall to boost over, even from the bookcase.
    expect(platform(1980).y - platform(2500).y).toBeGreaterThan(superBoost + 20);
  });

  it("the shed's hidden things can only be sniffed out from inside the shed", () => {
    const roof = platform(2990);
    const door = LEVEL.obstacles!.find((o) => o.x === 3000)!;
    for (const id of ['shed-sausage', 'squirrel']) {
      const c = LEVEL.collectibles!.find((k) => k.id === id)!;
      const r = c.hidden?.revealRadius ?? DEFAULT_REVEAL_RADIUS;
      expect(c.x).toBeGreaterThan(door.x + OBSTACLE_TYPES.woodenBarrier.width);
      expect(Math.hypot(c.x - door.x, c.y - (G - 22)), `${id} from outside the door`).toBeGreaterThan(r);
      expect(roof.y - 22 - c.y < -r, `${id} from the roof`).toBe(true);
    }
  });

  it('only one leaf pile hides a sausage, and the sausage trail leads to it', () => {
    const trail = LEVEL.scentTrails!.find((t) => t.id === 'compost-trail')!;
    const pile = LEVEL.barkTargets!.find((t) => t.reveals === trail.targetId)!;
    expect(pile.kind).toBe('leafPile');
    expect(trail.points.at(-1)!.x).toBe(pile.x);
  });

  describe('the garden wall', () => {
    const crateDef = LEVEL.obstacles!.find((o) => o.type === 'heavyCrate')!;
    const wall = LEVEL.platforms.find((p) => p.kind === 'ground' && p.x > crateDef.x)!;
    const crate = OBSTACLE_TYPES.heavyCrate;
    const crateTop = crateDef.y;

    it('is too tall to SUPER BOOST onto from the ground', () => {
      expect(superBoost).toBeLessThan(G - wall.y);
    });

    it('needs the crate pushed against it AND a SUPER BOOST', () => {
      expect(normalBoost).toBeLessThan(crateTop - wall.y);
      expect(superBoost).toBeGreaterThan(crateTop - wall.y + 10);
    });

    it("can't be reached from the crate where it starts, even sprint-jumping with a SUPER BOOST", () => {
      expect(canClearWall(wall.x - (crateDef.x + crate.width), crateTop - wall.y, boost.superSpeed)).toBe(false);
    });

    it('has steps down the far side, so Melody can always climb back', () => {
      const steps = LEVEL.platforms.filter((p) => p.oneWay && p.x > wall.x + wall.width).sort((a, b) => b.y - a.y);
      let feet = G;
      for (const s of steps) {
        expect(feet - s.y).toBeLessThan(plain - 20);
        feet = s.y;
      }
      expect(feet - wall.y).toBeLessThan(plain - 20);
    });
  });
});
