import { describe, expect, it } from 'vitest';
import {
  canPopTo,
  chooseBoyAction,
  climbStep,
  ladderToGrab,
  passesNear,
  stepToward,
  throwHeight,
  throwVelocity,
  updateStay,
  type BoyActionContext,
} from '../src/gameplay/teamwork/teamworkRules';
import { CLIMB, FOOTBALL, TEAMWORK } from '../src/config/teamwork';
import { FollowBrain } from '../src/characters/follow/FollowBrain';
import { FOLLOW } from '../src/config/follow';
import { getLevel } from '../src/levels';
import { levelFromTiled, TiledLevelError } from '../src/levels/tiled/loadTiledLevel';
import { levelToTiled } from '../src/levels/tiled/levelToTiled';
import type { TiledMap } from '../src/levels/tiled/tiledFormat';
import { readPad, RETROLINK_MAPPING, STANDARD_MAPPING, type PadSnapshot } from '../src/core/input/gamepad/gamepadMapping';
import { BUTTON_LABELS, fillPrompts } from '../src/core/input/buttonLabels';

const nothing: BoyActionContext = {
  leverInReach: false,
  gateInReach: false,
  carryingBall: false,
  melodyStaying: false,
  melodyFollowing: true,
  melodyDistance: 500,
  sitRange: TEAMWORK.sitRange,
};

describe("the boy's action button", () => {
  it('does the most useful thing nearby', () => {
    expect(chooseBoyAction(nothing)).toBeUndefined();
    expect(chooseBoyAction({ ...nothing, gateInReach: true, carryingBall: true })).toBe('open');
    expect(chooseBoyAction({ ...nothing, leverInReach: true, gateInReach: true })).toBe('pull');
    expect(chooseBoyAction({ ...nothing, carryingBall: true, melodyDistance: 20 })).toBe('throw');
  });

  it('tells Melody to sit when she is near, and calls her back from anywhere', () => {
    expect(chooseBoyAction({ ...nothing, melodyDistance: 100 })).toBe('sit');
    expect(chooseBoyAction({ ...nothing, melodyDistance: 100, melodyFollowing: false })).toBeUndefined();
    expect(chooseBoyAction({ ...nothing, melodyStaying: true, melodyDistance: 2000 })).toBe('come');
  });
});

describe('Melody staying put', () => {
  const cfg = TEAMWORK;
  it('"Sit!" right next to her sticks', () => {
    let s = { staying: true, wasAway: false };
    for (let i = 0; i < 10; i++) {
      const r = updateStay(s, 60, cfg);
      expect(r.resumed).toBe(false);
      s = r;
    }
  });

  it('she follows again when he comes back for her', () => {
    let s = updateStay({ staying: true, wasAway: false }, cfg.awayDistance + 50, cfg);
    expect(s.staying).toBe(true);
    s = updateStay(s, cfg.resumeDistance + 30, cfg);
    expect(s.staying).toBe(true);
    const back = updateStay(s, cfg.resumeDistance - 10, cfg);
    expect(back.resumed).toBe(true);
    expect(back.staying).toBe(false);
  });
});

describe('team areas', () => {
  const treehouse = [{ x: 3790, y: 380, width: 480, height: 195 }];
  it("a left-behind character can't pop up into the treehouse", () => {
    expect(canPopTo(treehouse, { x: 3900, feetY: 830 }, { x: 3950, feetY: 568 })).toBe(false);
  });
  it('but can pop anywhere else, or when already up there', () => {
    expect(canPopTo(treehouse, { x: 3000, feetY: 1016 }, { x: 3500, feetY: 830 })).toBe(true);
    expect(canPopTo(treehouse, { x: 3850, feetY: 568 }, { x: 4100, feetY: 568 })).toBe(true);
    expect(canPopTo(treehouse, { x: 3850, feetY: 568 }, { x: 3500, feetY: 830 })).toBe(true);
  });
});

describe('throwing the football', () => {
  it('goes forwards and up, or high when holding up', () => {
    const fwd = throwVelocity(1, false, 0, FOOTBALL);
    const up = throwVelocity(-1, true, 0, FOOTBALL);
    expect(fwd.vx).toBeGreaterThan(200);
    expect(up.vx).toBeLessThan(0);
    expect(Math.abs(up.vx)).toBeLessThan(Math.abs(fwd.vx));
    expect(throwHeight(up.vy, FOOTBALL.gravity)).toBeGreaterThan(throwHeight(fwd.vy, FOOTBALL.gravity) + 50);
  });

  it('knocks into things it flies past, even between frames', () => {
    expect(passesNear({ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 50, y: 30 }, 40)).toBe(true);
    expect(passesNear({ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 50, y: 60 }, 40)).toBe(false);
    expect(passesNear({ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 160, y: 0 }, 40)).toBe(false);
  });

  it('lifts glide to their stop without overshooting', () => {
    expect(stepToward(830, 568, 10)).toBe(820);
    expect(stepToward(570, 568, 10)).toBe(568);
    expect(stepToward(568, 830, 300)).toBe(830);
  });
});

describe('ladders', () => {
  const ladder = { x: 3910, y: 568, width: 42, height: 262 };
  const cfg = { ...CLIMB, jumpVelocity: 590 };

  it('grabbed by pushing up at the bottom, or down at the top', () => {
    expect(ladderToGrab([ladder], 3931, 830, true, -1, CLIMB.grabDistance)).toBe(ladder);
    expect(ladderToGrab([ladder], 3931, 568, true, 1, CLIMB.grabDistance)).toBe(ladder);
    expect(ladderToGrab([ladder], 3931, 830, true, 0, CLIMB.grabDistance)).toBeUndefined();
    expect(ladderToGrab([ladder], 3800, 830, true, -1, CLIMB.grabDistance)).toBeUndefined();
    expect(ladderToGrab([ladder], 3931, 568, true, -1, CLIMB.grabDistance)).toBeUndefined(); // already at the top
  });

  it('climbs up and down, and steps off at the top onto the deck', () => {
    expect(climbStep(ladder, 700, { moveX: 0, moveY: -1, jumpPressed: false }, false, cfg)).toEqual({ climbing: true, vy: -CLIMB.speed });
    expect(climbStep(ladder, 700, { moveX: 0, moveY: 1, jumpPressed: false }, false, cfg)).toEqual({ climbing: true, vy: CLIMB.speed });
    expect(climbStep(ladder, 700, { moveX: 1, moveY: 0, jumpPressed: false }, false, cfg)).toEqual({ climbing: true, vy: 0 });
    expect(climbStep(ladder, 568, { moveX: 0, moveY: -1, jumpPressed: false }, false, cfg)).toMatchObject({ climbing: false, reason: 'top', feetY: 568 });
    expect(climbStep(ladder, 830, { moveX: 0, moveY: 1, jumpPressed: false }, true, cfg)).toMatchObject({ climbing: false, reason: 'bottom' });
  });

  it('jump leaps off - but not while pushing up (on a keyboard up is jump too)', () => {
    expect(climbStep(ladder, 700, { moveX: 1, moveY: 0, jumpPressed: true }, false, cfg)).toMatchObject({ climbing: false, reason: 'jump' });
    expect(climbStep(ladder, 700, { moveX: 0, moveY: -1, jumpPressed: true }, false, cfg)).toMatchObject({ climbing: true });
  });
});

describe('following without popping', () => {
  const self = { x: 3900, feetY: 830, onGround: true, blockedLeft: false, blockedRight: false };
  const leader = { x: 3950, feetY: 568, onGround: true };

  it("doesn't keep jumping at a leader it can't reach", () => {
    const brain = new FollowBrain(FOLLOW);
    const d = brain.update(self, leader, 1 / 60, { canPop: false, reachUp: false });
    expect(d.intent.jumpPressed).toBe(false);
  });

  it('waits instead of popping when stuck', () => {
    const brain = new FollowBrain(FOLLOW);
    const far = { x: 3000, feetY: 830, onGround: true };
    let last = brain.update({ ...self, blockedRight: true }, far, 1 / 60, { canPop: false });
    for (let i = 0; i < 60 * (FOLLOW.stuckSeconds + 0.5); i++) {
      last = brain.update({ ...self, x: 3900, blockedLeft: true }, far, 1 / 60, { canPop: false });
      expect(last.catchUp).toBe(false);
    }
    expect(last.stuck).toBe(true);
    expect(last.intent.moveX).toBe(0);
  });

  it('still pops when it may (the old behaviour)', () => {
    const brain = new FollowBrain(FOLLOW);
    const d = brain.update(self, { x: 3900 + FOLLOW.catchUpDistance + 100, feetY: 830, onGround: true }, 1 / 60);
    expect(d.catchUp).toBe(true);
  });
});

describe('Tiled: interactables', () => {
  const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));
  const problemsOf = (map: TiledMap): string[] => {
    try {
      levelFromTiled(map, 'test');
    } catch (e) {
      if (e instanceof TiledLevelError) return e.problems;
      throw e;
    }
    return [];
  };
  const garden = getLevel('home-and-garden');
  const layerOf = (map: TiledMap) =>
    map.layers.find((l) => l.name === 'interactables') as { objects: { type?: string; name: string; width: number; height: number; point?: boolean; properties?: { name: string; value: unknown }[] }[] };

  it('gates, levers, lifts, the football and team areas load and save', () => {
    const kinds = (garden.interactables ?? []).map((t) => t.kind).sort();
    expect(kinds).toEqual(['football', 'gate', 'lever', 'lift', 'teamArea']);
    const back = levelFromTiled(clone(levelToTiled(garden)), garden.key);
    expect(clone(back.interactables)).toEqual(clone(garden.interactables));
    expect(back.collectibles?.find((c) => c.id === 'tree-bone')?.stuck).toBe(true);
  });

  it('a lever must say what it works, and that thing must exist', () => {
    const map = clone(levelToTiled(garden));
    const lever = layerOf(map).objects.find((o) => o.type === 'lever')!;
    lever.properties!.find((p) => p.name === 'target')!.value = 'nowhere';
    expect(problemsOf(map).some((p) => p.includes('"nowhere"'))).toBe(true);
    lever.properties = [];
    expect(problemsOf(map).some((p) => p.includes('no target'))).toBe(true);
  });

  it('a lift needs a name; ladders and team areas need a size', () => {
    const map = clone(levelToTiled(garden));
    const objects = layerOf(map).objects;
    objects.find((o) => o.type === 'lift')!.name = '';
    const area = objects.find((o) => o.type === 'teamArea')!;
    area.width = 0;
    area.height = 0;
    area.point = true;
    const problems = problemsOf(map);
    expect(problems.some((p) => p.includes('lift') && p.includes('Name'))).toBe(true);
    expect(problems.some((p) => p.includes('teamArea') && p.includes('rectangle'))).toBe(true);
  });
});

describe("the boy's action button on a controller", () => {
  const pad = (pressed: number[]): PadSnapshot => ({
    id: 'test',
    mapping: '',
    axes: [0, 0],
    buttons: Array.from({ length: 12 }, (_, i) => ({ pressed: pressed.includes(i), value: pressed.includes(i) ? 1 : 0 })),
  });

  it('is the same button as bark (A)', () => {
    expect(readPad(pad([1]), RETROLINK_MAPPING).buttons.use).toBe(true);
    expect(readPad({ ...pad([1]), mapping: 'standard' }, STANDARD_MAPPING).buttons.use).toBe(true);
    expect(readPad(pad([2]), RETROLINK_MAPPING).buttons.use).toBe(false);
  });

  it('signs say the right button', () => {
    expect(fillPrompts('Throw it ({use})', 'gamepad')).toBe(`Throw it (${BUTTON_LABELS.gamepad.use})`);
    expect(fillPrompts('{climb}', 'keyboard')).toBe(BUTTON_LABELS.keyboard.climb);
  });
});
