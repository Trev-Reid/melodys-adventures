import { describe, expect, it } from 'vitest';
import { isTrailVisible, shouldReveal } from '../src/gameplay/scent/scentRules';
import { StatusEffects, resolveCapabilities } from '../src/gameplay/effects/StatusEffects';
import type { Capability } from '../src/config/powerUps';
import type { ScentTrailDefinition } from '../src/levels/LevelDefinition';
import { getLevel } from '../src/levels';

const MELODYS_PLAYGROUND = getLevel('melodys-playground');

const has = (...caps: Capability[]) => (c: Capability) => caps.includes(c);
const trail: ScentTrailDefinition = { id: 't', scentType: 'squirrel', points: [{ x: 0, y: 0 }, { x: 10, y: 0 }] };

describe('scent rules', () => {
  it('SUPER SNIFF trails are hidden normally and shown with super sniff', () => {
    expect(isTrailVisible(trail, has())).toBe(false);
    expect(isTrailVisible(trail, has('superSniff'))).toBe(true);
    expect(isTrailVisible(trail, has('strength'))).toBe(false);
  });

  it('respects visibleNormally and active', () => {
    expect(isTrailVisible({ ...trail, visibleNormally: true }, has())).toBe(true);
    expect(isTrailVisible({ ...trail, active: false }, has('superSniff'))).toBe(false);
    expect(isTrailVisible({ ...trail, visibleWithSuperSniff: false }, has('superSniff'))).toBe(false);
  });

  it('hidden things are revealed only by super sniff, and only nearby', () => {
    const spec = { requiresSuperSniff: true, revealRadius: 200 };
    expect(shouldReveal(spec, has(), 10)).toBe(false);
    expect(shouldReveal(spec, has('superSniff'), 150)).toBe(true);
    expect(shouldReveal(spec, has('superSniff'), 250)).toBe(false);
  });
});

describe('power-ups work together', () => {
  it('SUPER SNIFF and SUPER STRENGTH can be active at the same time', () => {
    const fx = new StatusEffects();
    fx.apply('SUPER_STRENGTH');
    fx.apply('SUPER_SNIFF');
    const { capabilities } = resolveCapabilities(fx.capabilities());
    expect(capabilities.has('strength')).toBe(true);
    expect(capabilities.has('superSniff')).toBe(true);
    // Only strength changes how she looks.
    expect(fx.appearance().skin).toBe('buff');
    // Each keeps its own timer.
    fx.update(14);
    fx.apply('SUPER_SNIFF');
    fx.update(2);
    expect(fx.has('SUPER_STRENGTH')).toBe(false);
    expect(fx.has('SUPER_SNIFF')).toBe(true);
  });
});

describe('Sniff Zone', () => {
  const trails = MELODYS_PLAYGROUND.scentTrails ?? [];
  const collectibles = MELODYS_PLAYGROUND.collectibles ?? [];
  const pois = MELODYS_PLAYGROUND.pointsOfInterest ?? [];
  const findTarget = (id: string) => collectibles.find((c) => c.id === id) ?? pois.find((p) => p.id === id);

  it('has squirrel, sausage and cat trails', () => {
    expect(trails.map((t) => t.scentType).sort()).toEqual(['cat', 'sausage', 'squirrel']);
  });

  it('every trail leads to a real, hidden target and ends near it', () => {
    for (const t of trails) {
      const target = findTarget(t.targetId!);
      expect(target, t.id).toBeDefined();
      expect(target!.hidden, `${t.id} target should be hidden`).toBeDefined();
      const end = t.points[t.points.length - 1];
      expect(Math.hypot(end.x - target!.x, end.y - target!.y), t.id).toBeLessThan(40);
    }
  });

  it('the trails lead in different directions', () => {
    const dx = (id: string) => {
      const p = trails.find((t) => t.id === id)!.points;
      return { x: p[p.length - 1].x - p[0].x, y: p[p.length - 1].y - p[0].y };
    };
    expect(dx('sausage-trail').x).toBeLessThan(0); // left
    expect(dx('squirrel-trail').y).toBeLessThan(-100); // up
    expect(dx('cat-trail').x).toBeGreaterThan(0); // right, along the ground
  });

  it('there is a Super Sniff Treat', () => {
    expect(collectibles.some((c) => c.kind === 'sniffTreat')).toBe(true);
  });
});
