import { describe, expect, it } from 'vitest';
import { barkOutcome, barkReaches } from '../src/gameplay/bark/barkRules';
import { shouldReveal } from '../src/gameplay/scent/scentRules';
import { MELODY_BARK } from '../src/config/abilities';
import { BARK_TARGET_TYPES, DEFAULT_TREE_HEIGHT } from '../src/config/barkTargets';
import { StatusEffects, resolveCapabilities } from '../src/gameplay/effects/StatusEffects';
import { getLevel } from '../src/levels';

const superBark = (x: number, y: number, facing: 1 | -1) => ({ x, y, facing, ...MELODY_BARK.super });
const woof = (x: number, y: number, facing: 1 | -1) => ({ x, y, facing, ...MELODY_BARK.normal });

describe('bark rules', () => {
  it('reaches things in front of her, not behind', () => {
    expect(barkReaches(superBark(0, 0, 1), { x: 200, y: 0 })).toBe(true);
    expect(barkReaches(superBark(0, 0, 1), { x: -200, y: 0 })).toBe(false);
    expect(barkReaches(superBark(0, 0, -1), { x: -200, y: 0 })).toBe(true);
  });

  it('a super bark reaches further than an ordinary woof', () => {
    expect(barkReaches(woof(0, 0, 1), { x: 300, y: 0 })).toBe(false);
    expect(barkReaches(superBark(0, 0, 1), { x: 300, y: 0 })).toBe(true);
  });

  it('only reaches within the cone (not straight up)', () => {
    expect(barkReaches(superBark(0, 0, 1), { x: 10, y: -300 })).toBe(false);
  });

  it('bark targets need a super bark by default', () => {
    expect(barkOutcome(true, false)).toBe('tooQuiet');
    expect(barkOutcome(true, true)).toBe('react');
    expect(barkOutcome(false, false)).toBe('react');
  });

  it('things revealed by an event are not revealed by sniffing', () => {
    expect(shouldReveal({ revealedBy: 'event' }, () => true, 0)).toBe(false);
  });

  it('SUPER BARK stacks with the other powers', () => {
    const fx = new StatusEffects();
    fx.apply('SUPER_BARK');
    fx.apply('SUPER_SNIFF');
    fx.apply('SUPER_STRENGTH');
    const { capabilities } = resolveCapabilities(fx.capabilities());
    expect([...capabilities].sort()).toEqual(['strength', 'superBark', 'superSniff']);
  });
});

describe('Bark Zone', () => {
  const level = getLevel('melodys-playground');
  const targets = level.barkTargets ?? [];
  const byId = new Map((level.collectibles ?? []).filter((c) => c.id).map((c) => [c.id!, c]));
  // Bark comes from roughly her mouth: ~34px ahead, ~34px above her feet.
  const mouth = (feetX: number, feetY: number, facing: 1 | -1) => ({ x: feetX + facing * 34, y: feetY - 34 });

  it('has a ball in a tree, a leaf pile and a cat', () => {
    expect(targets.map((t) => t.kind).sort()).toEqual(['ballInTree', 'cat', 'leafPile']);
  });

  it('things they reveal exist and stay hidden until barked at', () => {
    for (const t of targets.filter((t) => t.reveals)) {
      const item = byId.get(t.reveals!);
      expect(item, t.reveals).toBeDefined();
      expect(item!.hidden?.revealedBy).toBe('event');
    }
  });

  it('the ball can be barked down from the ground, standing back a bit', () => {
    const tree = targets.find((t) => t.kind === 'ballInTree')!;
    const h = tree.height ?? DEFAULT_TREE_HEIGHT;
    const ball = { x: tree.x + 18, y: tree.y - h + 60 };
    const m = mouth(tree.x - 150, tree.y, 1);
    expect(barkReaches(superBark(m.x, m.y, 1), ball)).toBe(true);
  });

  it('the leaf pile can be barked at from the ground', () => {
    const pile = targets.find((t) => t.kind === 'leafPile')!;
    const m = mouth(pile.x - 150, pile.y, 1);
    expect(barkReaches(superBark(m.x, m.y, 1), { x: pile.x, y: pile.y - 18 })).toBe(true);
  });

  it('the cat can be barked at from the platform next to its ledge', () => {
    const cat = targets.find((t) => t.kind === 'cat')!;
    const platform = level.platforms.find((p) => p.x + p.width <= cat.x && p.x + p.width > cat.x - 150 && Math.abs(p.y - cat.y) < 60)!;
    expect(platform, 'a platform next to the cat').toBeDefined();
    const m = mouth(platform.x + platform.width - 20, platform.y, 1);
    expect(barkReaches(superBark(m.x, m.y, 1), { x: cat.x, y: cat.y - 24 })).toBe(true);
  });

  it('the cat is sitting on its sausage (blocks it until it runs off)', () => {
    const cat = targets.find((t) => t.kind === 'cat')!;
    const solid = BARK_TARGET_TYPES.cat.solid!;
    const sausage = byId.get('cat-sausage')!;
    expect(Math.abs(sausage.x - cat.x)).toBeLessThan(solid.width / 2);
    expect(sausage.y).toBeGreaterThan(cat.y - solid.height);
  });

  it('there is a Super Bark Biscuit', () => {
    expect((level.collectibles ?? []).some((c) => c.kind === 'barkBiscuit')).toBe(true);
  });
});

// --- BARK BOOST and BARK BREAK -------------------------------------------------

import { barkBoostVelocity, riseHeight } from '../src/gameplay/bark/barkRules';
import { MELODY_MOVEMENT } from '../src/config/movement';
import { OBSTACLE_TYPES } from '../src/config/obstacles';

const G = MELODY_MOVEMENT.gravity;
const jumpRise = riseHeight(MELODY_MOVEMENT.jumpVelocity, G);
/** Best case: bark right at the top of a jump. */
const boostRise = jumpRise + riseHeight(MELODY_BARK.boost.speed, G);
const superBoostRise = jumpRise + riseHeight(MELODY_BARK.boost.superSpeed, G);

describe('bark boost rules', () => {
  it('pops her upwards when falling or slowing down', () => {
    expect(barkBoostVelocity(300, 560)).toBe(-560);
    expect(barkBoostVelocity(0, 560)).toBe(-560);
    expect(barkBoostVelocity(-100, 560)).toBe(-560);
  });

  it("isn't used up if she's already rising faster than the boost", () => {
    expect(barkBoostVelocity(-620, 560)).toBeNull();
  });

  it('a boost gives real extra height, and a super boost more', () => {
    expect(boostRise - jumpRise).toBeGreaterThan(80);
    expect(superBoostRise).toBeGreaterThan(boostRise + 50);
  });
});

describe('bark break blocks', () => {
  it('cracked blocks break with any bark, stone needs a super bark', () => {
    const cracked = OBSTACLE_TYPES.crackedBlock.barkBreakable!;
    const stone = OBSTACLE_TYPES.stoneBlock.barkBreakable!;
    expect(barkOutcome(cracked.requiresSuperBark, false)).toBe('react');
    expect(barkOutcome(stone.requiresSuperBark, false)).toBe('tooQuiet');
    expect(barkOutcome(stone.requiresSuperBark, true)).toBe('react');
  });

  it("can't be smashed by running into them (they're for barking)", () => {
    expect(OBSTACLE_TYPES.crackedBlock.breakable).toBeUndefined();
    expect(OBSTACLE_TYPES.stoneBlock.breakable).toBeUndefined();
  });

  it('standing next to a wall, a woof breaks the bottom block (a gap she fits through)', () => {
    // Her mouth is ~34px ahead of her middle and ~34px above her feet.
    const feetY = 1016;
    const block = { x: 1000 + 24, y: feetY - 24 };
    const mouth = { x: 1000 - 23 + 34, y: feetY - 34 };
    expect(barkReaches(woof(mouth.x, mouth.y, 1), block)).toBe(true);
    expect(OBSTACLE_TYPES.crackedBlock.height).toBeGreaterThanOrEqual(44); // her body height
  });
});

describe('Bark Boost & Break zone', () => {
  const level = getLevel('melodys-playground');
  const ground = 1016;
  const walls = (type: string) => {
    const blocks = (level.obstacles ?? []).filter((o) => o.type === type);
    return { x: blocks[0]?.x ?? 0, count: blocks.length, top: Math.min(...blocks.map((b) => b.y)) };
  };

  it('the boost ledge needs a bark boost (too high for a jump)', () => {
    const ledge = level.platforms.find((p) => p.x === 6350)!;
    const rise = ground - ledge.y;
    expect(rise).toBeGreaterThan(jumpRise + 30);
    expect(rise).toBeLessThan(boostRise - 25);
  });

  it('the walls are too tall to boost over without a super bark', () => {
    for (const type of ['crackedBlock', 'stoneBlock']) {
      const w = walls(type);
      expect(w.count).toBeGreaterThanOrEqual(5);
      expect(ground - w.top).toBeGreaterThan(boostRise + 30);
    }
  });

  it("you can't boost off the ledge over the cracked wall", () => {
    const ledge = level.platforms.find((p) => p.x === 6350)!;
    const w = walls('crackedBlock');
    // Sprinting (x1.6) + jump + boost at the top from the ledge: how far before dropping below the wall top?
    const speed = MELODY_MOVEMENT.maxSpeed * 1.6;
    const up = MELODY_MOVEMENT.jumpVelocity / G + MELODY_BARK.boost.speed / G;
    const apex = ledge.y - boostRise;
    const fallG = G * MELODY_MOVEMENT.fallGravityMultiplier;
    const down = Math.sqrt((2 * Math.max(0, w.top - apex)) / fallG);
    expect(speed * (up + down)).toBeLessThan(w.x - (ledge.x + ledge.width));
  });

  it('has a Super Bark Biscuit between the walls, and sausages behind each', () => {
    const cracked = walls('crackedBlock');
    const stone = walls('stoneBlock');
    const items = level.collectibles ?? [];
    expect(items.some((c) => c.kind === 'barkBiscuit' && c.x > cracked.x && c.x < stone.x)).toBe(true);
    expect(items.some((c) => c.id === 'break-sausage' && c.x > cracked.x)).toBe(true);
    expect(items.some((c) => c.id === 'stone-sausage' && c.x > stone.x)).toBe(true);
  });

  it('the high sausage needs a super boost', () => {
    const s = (level.collectibles ?? []).find((c) => c.id === 'super-boost-sausage')!;
    const reachHead = (rise: number) => rise + 44 + 12; // body + sausage size
    expect(reachHead(boostRise)).toBeLessThan(ground - s.y);
    expect(reachHead(superBoostRise)).toBeGreaterThan(ground - s.y + 15);
  });
});
