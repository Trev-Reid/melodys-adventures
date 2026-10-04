/**
 * How the character you're NOT controlling follows the one you are
 * (the boy following Melody, or Melody following the boy). Just numbers:
 * change them, save, and the game reloads.
 */
export interface FollowConfig {
  /** Stops walking once this close to the leader (px, side to side). */
  stopDistance: number;
  /** Starts walking again once further than this. */
  startDistance: number;
  /** Sprints (if they can) when further than this. */
  sprintDistance: number;
  /** Jumps when the leader is standing at least this much higher... */
  jumpIfLeaderAbove: number;
  /** ...and no further away than this (px, side to side). */
  jumpReach: number;
  /** Holds jump this long for a full-height jump (seconds). */
  jumpHoldSeconds: number;
  /** Pops next to the leader if further away than this (px)... */
  catchUpDistance: number;
  /** ...or after trying this long without getting any closer (seconds). */
  stuckSeconds: number;
}

export const FOLLOW: FollowConfig = {
  stopDistance: 60,
  startDistance: 110,
  sprintDistance: 320,
  jumpIfLeaderAbove: 40,
  jumpReach: 180,
  jumpHoldSeconds: 0.3,
  catchUpDistance: 750,
  stuckSeconds: 2,
};
