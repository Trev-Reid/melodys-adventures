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
