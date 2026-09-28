import { describe, expect, it } from 'vitest';
import { levelFromTiled, TiledLevelError } from '../src/levels/tiled/loadTiledLevel';
import { levelToTiled } from '../src/levels/tiled/levelToTiled';
import type { TiledMap } from '../src/levels/tiled/tiledFormat';
import { LEVEL_ERRORS, getLevel } from '../src/levels';

const playground = () => getLevel('melodys-playground');
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));

function problemsOf(map: TiledMap): string[] {
  try {
    levelFromTiled(map, 'test');
  } catch (e) {
    if (e instanceof TiledLevelError) return e.problems;
    throw e;
  }
  return [];
}

describe('Tiled levels', () => {
  it('every map in src/levels/maps loads without problems', () => {
    expect(LEVEL_ERRORS).toEqual({});
  });

  it('saving and loading a level gives back exactly the same level', () => {
    const level = playground();
    const back = levelFromTiled(clone(levelToTiled(level)), level.key);
    expect(clone(back)).toEqual(clone(level));
  });

  it('explains objects with a missing or wrong Class', () => {
    const map = clone(levelToTiled(playground()));
    const collectibles = map.layers.find((l) => l.name === 'collectibles') as { objects: { type?: string }[] };
    collectibles.objects[0].type = '';
    collectibles.objects[1].type = 'sausge';
    const problems = problemsOf(map);
    expect(problems.some((p) => p.includes('has no Class') && p.includes('sausage'))).toBe(true);
    expect(problems.some((p) => p.includes('"sausge"'))).toBe(true);
  });

  it('catches a scent trail pointing at something that does not exist', () => {
    const map = clone(levelToTiled(playground()));
    const trails = map.layers.find((l) => l.name === 'scentTrails') as { objects: { properties?: { name: string; value: unknown }[] }[] };
    trails.objects[0].properties!.find((p) => p.name === 'targetId')!.value = 'nobody';
    expect(problemsOf(map).some((p) => p.includes('"nobody"'))).toBe(true);
  });

  it('needs exactly one spawn point', () => {
    const map = clone(levelToTiled(playground()));
    (map.layers.find((l) => l.name === 'markers') as { objects: unknown[] }).objects = [];
    expect(problemsOf(map).some((p) => p.includes('spawn'))).toBe(true);
  });

  it('accepts the older "class" field from Tiled 1.9', () => {
    const map = clone(levelToTiled(playground()));
    for (const layer of map.layers as { objects: { type?: string; class?: string }[] }[]) {
      for (const o of layer.objects) {
        o.class = o.type;
        delete o.type;
      }
    }
    expect(problemsOf(map)).toEqual([]);
  });
});
