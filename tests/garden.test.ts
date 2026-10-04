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

const level = getLevel('home-and-garden');
const G = MELODY_MOVEMENT.gravity;
const JUMP = riseHeight(MELODY_MOVEMENT.jumpVelocity, G);
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

  it('every decoration uses an image that exists', () => {
    for (const t of Object.values(DECORATION_TYPES)) expect(GARDEN_IMAGES).toContain(t.image);
  });
});

describe('Home & Garden level', () => {
  it('is a garden-themed level about finding bones', () => {
    expect(level.theme).toBe('garden');
    const goal = (level.collectibles ?? []).filter((c) => c.kind === 'bone');
    expect(goal.length).toBe(10);
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

  it('the treehouse can be climbed: stump, board, deck', () => {
    const lawn = level.platforms.find((p) => p.x === 3240)!;
    const stump = deco('stump').find((s) => s.y === lawn.y)!;
    const board = level.platforms.find((p) => p.kind === 'platform' && p.y < lawn.y)!;
    const [house] = deco('treehouse');
    const steps = [lawn.y, solidTop('stump', stump), board.y, solidTop('treehouse', house)];
    for (let i = 1; i < steps.length; i++) expect(steps[i - 1] - steps[i]).toBeLessThan(JUMP - 15);
    expect(solidTop('treehouse', house) - BODY).toBeLessThan(item('treehouse-bone').y + 10);
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
