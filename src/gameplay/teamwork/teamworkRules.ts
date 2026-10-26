/**
 * Teamwork rules as pure functions (no Phaser), so they're unit tested:
 * what the boy's action button does, climbing ladders, throwing the
 * football, Melody staying put, and where a left-behind character may pop.
 */

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function rectContains(r: Rect, x: number, y: number): boolean {
  return x >= r.x && x <= r.x + r.width && y >= r.y && y <= r.y + r.height;
}

/**
 * Can a character who's been left behind pop next to the leader? Not into a
 * team area (like the treehouse) they aren't already in - they have to get
 * there themselves (the boy climbs, Melody rides the basket).
 */
export function canPopTo(areas: Rect[], follower: { x: number; feetY: number }, leader: { x: number; feetY: number }): boolean {
  return areas.every((a) => !rectContains(a, leader.x, leader.feetY - 2) || rectContains(a, follower.x, follower.feetY - 2));
}

// --- The boy's action button -----------------------------------------------------

export type BoyActionKind = 'pull' | 'open' | 'throw' | 'come' | 'sit';

export interface BoyActionContext {
  leverInReach: boolean;
  /** A closed gate within reach. */
  gateInReach: boolean;
  carryingBall: boolean;
  /** Melody was told to sit (or left in the basket) and is waiting. */
  melodyStaying: boolean;
  /** Melody is following him (she's not the one being played). */
  melodyFollowing: boolean;
  melodyDistance: number;
  sitRange: number;
}

/** What pressing the action button does right now (most useful thing first). */
export function chooseBoyAction(c: BoyActionContext): BoyActionKind | undefined {
  if (c.leverInReach) return 'pull';
  if (c.gateInReach) return 'open';
  if (c.carryingBall) return 'throw';
  if (c.melodyStaying) return 'come';
  if (c.melodyFollowing && c.melodyDistance <= c.sitRange) return 'sit';
  return undefined;
}

/** Words for the little prompt over the boy's head. */
export const BOY_ACTION_WORDS: Record<BoyActionKind, string> = {
  pull: 'Pull',
  open: 'Open',
  throw: 'Throw',
  come: 'Come, Melody!',
  sit: 'Sit!',
};

// --- Throwing the football -----------------------------------------------------------

export interface ThrowConfig {
  throwForward: { vx: number; vy: number };
  throwUp: { vx: number; vy: number };
}

/** A throw: forwards and up, or (holding up) high in the air. Carries some of his run-up. */
export function throwVelocity(facing: 1 | -1, up: boolean, carrierVx: number, cfg: ThrowConfig): { vx: number; vy: number } {
  const t = up ? cfg.throwUp : cfg.throwForward;
  return { vx: facing * t.vx + carrierVx * 0.4, vy: t.vy };
}

/** Highest point (px above the release) a throw reaches. */
export function throwHeight(vy: number, gravity: number): number {
  return (vy * vy) / (2 * gravity);
}

/** Does a moving point pass within `radius` of a target between two frames? */
export function passesNear(from: { x: number; y: number }, to: { x: number; y: number }, target: { x: number; y: number }, radius: number): boolean {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((target.x - from.x) * dx + (target.y - from.y) * dy) / len2));
  const px = from.x + dx * t;
  const py = from.y + dy * t;
  return Math.hypot(target.x - px, target.y - py) <= radius;
}

// --- Lifts -----------------------------------------------------------------------------

/** Move towards a target by at most `maxStep` (never overshoots). */
export function stepToward(current: number, target: number, maxStep: number): number {
  const d = target - current;
  return Math.abs(d) <= maxStep ? target : current + Math.sign(d) * maxStep;
}

// --- Melody staying put ------------------------------------------------------------------

export interface StayState {
  staying: boolean;
  /** The boy has gone some way off since she sat down. */
  wasAway: boolean;
}

/**
 * A sitting Melody gets up again when the boy comes back for her - but only
 * after he's been away, so "Sit!" right next to her sticks.
 */
export function updateStay(s: StayState, distanceToBoy: number, cfg: { awayDistance: number; resumeDistance: number }): StayState & { resumed: boolean } {
  if (!s.staying) return { ...s, resumed: false };
  const wasAway = s.wasAway || distanceToBoy >= cfg.awayDistance;
  if (wasAway && distanceToBoy <= cfg.resumeDistance) return { staying: false, wasAway: false, resumed: true };
  return { staying: true, wasAway, resumed: false };
}

// --- Ladders -------------------------------------------------------------------------------

export interface ClimbConfig {
  speed: number;
  grabDistance: number;
  jumpOff: number;
}

/**
 * Which ladder (if any) he grabs: pushing up with some ladder above his feet,
 * or pushing down while standing at the top of one.
 */
export function ladderToGrab<T extends Rect>(ladders: T[], centerX: number, feetY: number, onGround: boolean, moveY: number, grabDistance: number): T | undefined {
  return ladders.find((l) => {
    if (Math.abs(centerX - (l.x + l.width / 2)) > grabDistance + l.width / 2) return false;
    if (moveY < -0.5) return feetY > l.y + 2 && feetY <= l.y + l.height + 4;
    if (moveY > 0.5) return onGround && Math.abs(feetY - l.y) <= 8;
    return false;
  });
}

export type ClimbStep =
  | { climbing: true; vy: number }
  | { climbing: false; reason: 'top' | 'bottom' | 'jump' | 'off'; vy: number; feetY?: number };

/**
 * One frame on a ladder. Up/down moves him; at the top he steps off onto
 * whatever's there, at the bottom onto the ground; jump (without pushing up -
 * on a keyboard up is jump too) leaps off it.
 */
export function climbStep(
  ladder: Rect,
  feetY: number,
  input: { moveX: number; moveY: number; jumpPressed: boolean },
  onGround: boolean,
  cfg: ClimbConfig & { jumpVelocity: number },
): ClimbStep {
  if (input.jumpPressed && input.moveY > -0.5) return { climbing: false, reason: 'jump', vy: -cfg.jumpVelocity * cfg.jumpOff };
  if (input.moveY < -0.5 && feetY <= ladder.y + 1) return { climbing: false, reason: 'top', vy: 0, feetY: ladder.y };
  if (input.moveY > 0.5 && onGround && feetY >= ladder.y + ladder.height - 4) return { climbing: false, reason: 'bottom', vy: 0 };
  if (feetY > ladder.y + ladder.height + 6) return { climbing: false, reason: 'off', vy: 0 };
  if (input.moveX !== 0 && input.moveY === 0 && onGround) return { climbing: false, reason: 'off', vy: 0 };
  return { climbing: true, vy: Math.sign(input.moveY) * (Math.abs(input.moveY) > 0.3 ? cfg.speed : 0) };
}
