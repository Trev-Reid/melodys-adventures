/**
 * Picks which movement animation a character should show, from its physics
 * state. Pure logic (no Phaser) so it's unit tested and shared by every
 * character - Melody now, the boy later.
 */
export type LocomotionAnim = 'idle' | 'walk' | 'run' | 'sprint' | 'jump' | 'air' | 'fall' | 'land';

export interface LocomotionState {
  onGround: boolean;
  vx: number;
  vy: number;
  /** The character's normal (non-sprint) top speed. */
  maxSpeed: number;
  /** Seconds since the character last touched down. */
  secondsSinceLanding: number;
}

/** Below this horizontal speed she counts as standing still. */
export const STILL_SPEED = 25;
/** Fraction of top speed where walking turns into running. */
export const RUN_FRACTION = 0.55;
/** Fraction of top speed above which she's sprinting. */
export const SPRINT_FRACTION = 1.12;
/** How long the landing pose is held. */
export const LAND_POSE_SECONDS = 0.1;
/** Rising faster than this shows the take-off pose; slower (near the top) shows the mid-air pose. */
export const TAKEOFF_SPEED = 250;
/** Falling faster than this shows the falling pose. */
export const FALL_SPEED = 150;

export function pickLocomotionAnim(s: LocomotionState): LocomotionAnim {
  if (!s.onGround) {
    if (s.vy < -TAKEOFF_SPEED) return 'jump';
    return s.vy > FALL_SPEED ? 'fall' : 'air';
  }
  if (s.secondsSinceLanding < LAND_POSE_SECONDS) return 'land';
  const speed = Math.abs(s.vx);
  if (speed > s.maxSpeed * SPRINT_FRACTION) return 'sprint';
  if (speed > s.maxSpeed * RUN_FRACTION) return 'run';
  if (speed > STILL_SPEED) return 'walk';
  return 'idle';
}
