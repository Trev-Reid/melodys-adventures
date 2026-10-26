import type { LocomotionAnim } from '../animationState';

/**
 * Which of the boy's animations to show. Pure logic (no Phaser), so it's unit
 * tested. Boy.ts feeds it his state each frame; the sheet and its frames are
 * in boyAnimations.ts.
 */

/** Things he does with his hands: each plays once, on top of standing still. */
export type BoyAction = 'pickup' | 'catch' | 'throw' | 'throw_up' | 'pull' | 'open' | 'call' | 'point' | 'cheer';

export type BoyLook = 'idle' | 'walk' | 'run' | 'jump' | 'air' | 'fall' | 'land' | 'climb' | 'climb_idle' | 'wait' | BoyAction;

export interface BoyAnimInput {
  /** On a ladder. */
  climbing: boolean;
  /** Has he moved since grabbing the ladder? (Until he does, he just hangs on.) */
  climbedYet: boolean;
  /** From pickLocomotionAnim (his speed, the ground, landing). */
  loco: LocomotionAnim;
  /** A one-off action that's playing, if any. */
  action?: BoyAction;
  /** The level's done: he celebrates. */
  happy: boolean;
  /** He's stood still long enough to fidget. */
  waitDue: boolean;
}

/** Actions that are over the moment he moves (the others are quick enough to finish on the go). */
const STANDING_ACTIONS: BoyAction[] = ['pickup', 'pull', 'open', 'call', 'point', 'cheer'];

/** Does moving like this cut a standing action short? */
export function interruptsAction(action: BoyAction, loco: LocomotionAnim): boolean {
  if (!STANDING_ACTIONS.includes(action)) return false;
  return loco !== 'idle' && loco !== 'land';
}

export function pickBoyAnim(s: BoyAnimInput): BoyLook {
  if (s.climbing) return s.climbedYet ? 'climb' : 'climb_idle';
  if (s.action && !interruptsAction(s.action, s.loco)) return s.action;
  switch (s.loco) {
    case 'idle':
      return s.happy ? 'cheer' : s.waitDue ? 'wait' : 'idle';
    case 'sprint':
    case 'run':
      return 'run';
    default:
      return s.loco;
  }
}

/** Climbing: one frame per this many px climbed, so his hands and feet keep pace with the rungs. */
export const CLIMB_FRAME_PX = 12;

/** Which of the 4 climbing frames to show after climbing this far (px, up or down). */
export function climbFrame(distance: number, frames = 4): number {
  return Math.floor(Math.abs(distance) / CLIMB_FRAME_PX) % frames;
}

/** Stand still this long (s) and he starts fidgeting... */
export const WAIT_AFTER_SECONDS = 5;
/** ...again every this long (s). */
export const WAIT_EVERY_SECONDS = 7;

/** Should he fidget now, having stood still for this long? */
export function waitDue(stillSeconds: number): boolean {
  if (stillSeconds < WAIT_AFTER_SECONDS) return false;
  const into = (stillSeconds - WAIT_AFTER_SECONDS) % WAIT_EVERY_SECONDS;
  return into < 1.3; // the fidget lasts about 1.2 s (6 frames at 5 fps)
}
