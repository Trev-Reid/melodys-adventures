import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { getLevel } from '../src/levels';
import { levelFromTiled } from '../src/levels/tiled/loadTiledLevel';
import { levelToTiled } from '../src/levels/tiled/levelToTiled';
import { GARDEN_IMAGES, UI_IMAGES, gardenPath, uiPath } from '../src/assets/artAssets';
import { DECORATION_TYPES } from '../src/config/decorations';
import { MELODY_MOVEMENT } from '../src/config/movement';
import { riseHeight } from '../src/gameplay/bark/barkRules';
import { OBSTACLE_TYPES } from '../src/config/obstacles';
import { MELODY_BARK } from '../src/config/abilities';
import { FOOTBALL, GATE } from '../src/config/teamwork';
import { BOY_MOVEMENT } from '../src/config/movement';
import { throwHeight } from '../src/gameplay/teamwork/teamworkRules';

const level = getLevel('home-and-garden');
const G = MELODY_MOVEMENT.gravity;
const JUMP = riseHeight(MELODY_MOVEMENT.jumpVelocity, G);
/** Jump, then BARK BOOST at the top: the highest Melody gets without a trampoline or a Super Bark. */
const BOOSTED = JUMP + riseHeight(MELODY_BARK.boost.speed, G);
const SUPER_BOOSTED = JUMP + riseHeight(MELODY_BARK.boost.superSpeed, G);
const BODY = 44; // Melody's hitbox height
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));
const deco = (kind: string) => (level.decorations ?? []).filter((d) => d.kind === kind);
const item = (id: string) => (level.collectibles ?? []).find((c) => c.id === id)!;
const solidTop = (kind: string, d: { y: number }) => d.y + DECORATION_TYPES[kind as keyof typeof DECORATION_TYPES].solids![0].y;

describe('garden art', () => {
  it('every image the game loads exists', () => {
    for (const name of GARDEN_IMAGES) expect(existsSync(`public/${gardenPath(name)}`), name).toBe(true);
    for (const name of UI_IMAGES) expect(existsSync(`public/${uiPath(name)}`), name).toBe(true);
  });

  it('every decoration uses images that exist (creatures like the robin have none of their own)', () => {
    for (const t of Object.values(DECORATION_TYPES)) {
      if (t.image) expect(GARDEN_IMAGES).toContain(t.image);
      for (const part of t.parts ?? []) expect(GARDEN_IMAGES).toContain(part.image);
      expect(t.image || t.critters, 'a decoration needs a picture or creatures').toBeTruthy();
    }
  });

  it('animated pictures have their frame sizes recorded, and divide evenly into frames', async () => {
    const { GARDEN_SHEETS } = await import('../src/assets/artAssets');
    const { imageSize } = await import('./helpers/imageSize');
    for (const [name, sheet] of Object.entries(GARDEN_SHEETS)) {
      const size = imageSize(`public/assets/garden/${name}.png`);
      expect(size.width, name).toBe(sheet.frameWidth * sheet.frames);
      expect(size.height, name).toBe(sheet.frameHeight);
    }
  });
});

describe('Home & Garden level', () => {
  it('is a garden-themed level about finding bones', () => {
    expect(level.theme).toBe('garden');
    const goal = (level.collectibles ?? []).filter((c) => c.kind === 'bone');
    expect(goal.length).toBe(11);
    expect((level.collectibles ?? []).some((c) => c.kind === 'sausage')).toBe(false);
  });

  it('saves and loads in Tiled without changing (decorations, styles, theme)', () => {
    const back = levelFromTiled(clone(levelToTiled(level)), level.key);
    expect(clone(back)).toEqual(clone(level));
  });

  it('the stump can be jumped onto, and its bone reached', () => {
    const [stump] = deco('stump');
    const terrace = level.platforms.find((p) => p.x <= stump.x && p.x + p.width >= stump.x && p.y === stump.y)!;
    const top = solidTop('stump', stump);
    expect(terrace.y - top).toBeLessThan(JUMP - 15);
  });

  it('a normal bounce reaches the low trampoline bone; the high one needs a held bounce', () => {
    const [t] = deco('trampoline');
    const bounce = DECORATION_TYPES.trampoline.solids![0].bounce!;
    const mat = solidTop('trampoline', t);
    const reach = (speed: number) => mat - riseHeight(speed, G) - BODY;
    const low = (level.collectibles ?? []).find((c) => c.kind === 'bone' && Math.abs(c.x - t.x) < 40 && c.y > 600)!;
    const high = item('high-bounce-bone');
    expect(reach(bounce.speed)).toBeLessThan(low.y - 10);
    expect(reach(bounce.speed)).toBeGreaterThan(high.y);
    expect(reach(bounce.heldSpeed)).toBeLessThan(high.y - 20);
  });

  it('the back lawn is too high to jump; the crate makes a step', () => {
    const lawn = level.platforms.find((p) => p.x === 3240)!;
    const crate = (level.obstacles ?? []).find((o) => o.type === 'heavyCrate')!;
    expect(1016 - lawn.y).toBeGreaterThan(JUMP + 30);
    expect(crate.y - lawn.y).toBeLessThan(JUMP - 20);
    expect(crate.x + OBSTACLE_TYPES.heavyCrate.width).toBeLessThan(lawn.x); // pushed against the wall to use it
  });

  it("the side gate: Melody can't get past it without the boy", () => {
    const gate = (level.interactables ?? []).find((t) => t.kind === 'gate')!;
    const hedgeTop = gate.y + GATE.hedge.y;
    // Nothing to her left is high enough to jump the hedge from (she starts on the left).
    const tops = [gate.y, ...level.platforms.filter((p) => p.x < gate.x && p.x + p.width > gate.x - 300).map((p) => p.y)];
    for (const top of tops) expect(top - BOOSTED, `from ${top}`).toBeGreaterThan(hedgeTop + 30);
    expect(level.spawn.x).toBeLessThan(gate.x);
    // The gate fills the gap under the hedge.
    expect(GATE.door.y).toBeLessThanOrEqual(GATE.hedge.y + GATE.hedge.height);
  });

  it('the treehouse needs teamwork: the boy climbs the ladder, Melody rides the basket', () => {
    const lawn = level.platforms.find((p) => p.x === 3240)!;
    const [house] = deco('treehouse');
    const deck = solidTop('treehouse', house);
    // Too high for Melody, even with a bark boost; and nothing nearby to jump up from.
    expect(lawn.y - deck).toBeGreaterThan(BOOSTED + 20);
    const near = (x: number) => Math.abs(x - house.x) < 700;
    expect(level.platforms.filter((p) => near(p.x) && p.y < lawn.y)).toEqual([]);
    expect(deco('stump').filter((s) => near(s.x))).toEqual([]);
    // The boy's ladder runs from the lawn to the deck.
    const [ladder] = DECORATION_TYPES.treehouse.ladders!;
    expect(house.y + ladder.y).toBe(deck);
    expect(house.y + ladder.y + ladder.height).toBe(lawn.y);
    // The basket goes from the lawn up to the deck, worked by a lever on the deck.
    const lift = (level.interactables ?? []).find((t) => t.kind === 'lift')!;
    expect(lift.y).toBe(lawn.y);
    expect(lift.y - lift.travel!).toBe(deck);
    const lever = (level.interactables ?? []).find((t) => t.kind === 'lever')!;
    expect(lever.target).toBe(lift.id);
    expect(lever.y).toBe(deck);
    // Nobody gets popped up there: they have to get up themselves.
    const area = (level.interactables ?? []).find((t) => t.kind === 'teamArea')!;
    expect(area.x).toBeLessThan(house.x - 180);
    expect(area.x + area.width!).toBeGreaterThan(lift.x + 40);
    expect(area.y + area.height!).toBeGreaterThan(deck);
    expect(area.y + area.height!).toBeLessThan(lawn.y - 100);
  });

  it('up in the treehouse: a bark biscuit, and a bone under leaves that need a Super Bark', () => {
    const [house] = deco('treehouse');
    const deck = solidTop('treehouse', house);
    const leaves = (level.barkTargets ?? []).find((t) => t.id === 'treehouse-leaves')!;
    expect(leaves.y).toBe(deck);
    expect(leaves.requiresSuperBark ?? true).toBe(true);
    expect(item('treehouse-bone').hidden?.revealedBy).toBe('event');
    const biscuit = (level.collectibles ?? []).find((c) => c.kind === 'barkBiscuit')!;
    expect(deck - biscuit.y).toBeLessThan(40);
    expect(Math.abs(biscuit.x - house.x)).toBeLessThan(170);
    // A Super Bark boost from the lawn could reach the deck, so the only biscuit is up there.
    expect((level.collectibles ?? []).filter((c) => c.kind === 'barkBiscuit').length).toBe(1);
    expect(SUPER_BOOSTED).toBeGreaterThan(0);
  });

  it('a bone stuck up the big tree: out of reach, but the boy can throw the ball at it', () => {
    const bone = item('tree-bone');
    expect(bone.stuck).toBe(true);
    const ground = 1016;
    // Melody's head at her highest (from the ground or the cracked blocks) doesn't get there...
    expect(ground - BOOSTED - BODY).toBeGreaterThan(bone.y + 20);
    const blocks = (level.obstacles ?? []).filter((o) => o.type === 'crackedBlock');
    const blockTop = Math.min(...blocks.map((b) => b.y));
    expect(bone.x - Math.max(...blocks.map((b) => b.x + 48))).toBeGreaterThan(300);
    expect(blockTop).toBeGreaterThan(bone.y + 100);
    // ...nor the boy's.
    expect(ground - riseHeight(BOY_MOVEMENT.jumpVelocity, G) - 58).toBeGreaterThan(bone.y + 20);
    // A throw straight up from his hand goes past it.
    const hand = ground - 30;
    expect(hand - throwHeight(FOOTBALL.throwUp.vy, FOOTBALL.gravity)).toBeLessThan(bone.y - 20);
    const football = (level.interactables ?? []).find((t) => t.kind === 'football')!;
    expect(football.x).toBeLessThan(bone.x);
  });

  it('the drain bone is hidden until sniffed, with a scent trail leading to it', () => {
    expect(item('drain-bone').hidden?.requiresSuperSniff).toBe(true);
    const trail = (level.scentTrails ?? []).find((t) => t.targetId === 'drain-bone')!;
    expect(trail.points.at(-1)!.x).toBeCloseTo(deco('drain')[0].x, -1);
    expect((level.collectibles ?? []).some((c) => c.kind === 'sniffTreat' && c.x < trail.points[0].x + 40)).toBe(true);
  });

  it('the leaf pile hides a bone, with a bark biscuit before it', () => {
    const pile = (level.barkTargets ?? []).find((t) => t.kind === 'leafPile')!;
    expect(pile.reveals).toBe('leaf-bone');
    expect(item('leaf-bone').hidden?.revealedBy).toBe('event');
    expect((level.collectibles ?? []).some((c) => c.kind === 'barkBiscuit' && c.x < pile.x)).toBe(true);
  });
});
