import type { FollowConfig } from '@/config/follow';
import { IDLE_INTENT, type CharacterIntent } from '../abilities/Ability';

/** What the follower needs to know about itself. */
export interface FollowerState {
  x: number;
  /** Where its feet are (y grows downwards). */
  feetY: number;
  onGround: boolean;
  /** Something solid is directly to its left / right. */
  blockedLeft: boolean;
  blockedRight: boolean;
}

/** What the follower needs to know about the character it follows. */
export interface LeaderState {
  x: number;
  feetY: number;
  onGround: boolean;
}

export interface FollowDecision {
  /** Fed to the follower exactly like the player's own controls. */
  intent: CharacterIntent;
  /** Too far behind or stuck: put the follower next to the leader. */
  catchUp: boolean;
}

/** The leader has to move this far before "not getting closer" starts over. */
const LEADER_MOVED = 40;
/** Getting this much closer counts as progress. */
const PROGRESS = 8;

/**
 * Follow-the-leader as plain logic (no Phaser), so it's unit-tested. Turns
 * where the leader is into a CharacterIntent - the same thing the keyboard
 * produces - so a following character moves by exactly the same rules as
 * one the player controls.
 */
export class FollowBrain {
  private walking = false;
  private jumpHold = 0;
  private stuckFor = 0;
  private closest = Number.POSITIVE_INFINITY;
  private leaderAnchor?: { x: number; feetY: number };

  constructor(readonly config: FollowConfig) {}

  update(self: FollowerState, leader: LeaderState, dt: number): FollowDecision {
    const cfg = this.config;
    const dx = leader.x - self.x;
    const away = Math.abs(dx);
    const leaderAbove = self.feetY - leader.feetY > cfg.jumpIfLeaderAbove && leader.onGround;
    const distance = Math.hypot(dx, self.feetY - leader.feetY);

    if (distance > cfg.catchUpDistance && leader.onGround) return this.catchUp();

    // Walk when too far away, stop when close (two thresholds, so no dithering).
    if (away > cfg.startDistance) this.walking = true;
    else if (away < cfg.stopDistance) this.walking = false;
    const wantsUp = leaderAbove && away < cfg.jumpReach;
    const moveX = this.walking || (wantsUp && away > 20) ? Math.sign(dx) : 0;

    // Jump at walls in the way, and up to where the leader is standing.
    const blocked = (moveX > 0 && self.blockedRight) || (moveX < 0 && self.blockedLeft);
    let jumpPressed = false;
    if (self.onGround && this.jumpHold <= 0 && (blocked || wantsUp)) {
      jumpPressed = true;
      this.jumpHold = cfg.jumpHoldSeconds;
    }
    const jumpHeld = this.jumpHold > 0;
    this.jumpHold = Math.max(0, this.jumpHold - dt);

    // Stuck: trying to reach a leader who's stayed put, without getting any closer.
    const trying = moveX !== 0 || leaderAbove;
    const anchor = this.leaderAnchor;
    if (!trying || !anchor || Math.hypot(leader.x - anchor.x, leader.feetY - anchor.feetY) > LEADER_MOVED) {
      this.leaderAnchor = { x: leader.x, feetY: leader.feetY };
      this.closest = distance;
      this.stuckFor = 0;
    } else if (distance < this.closest - PROGRESS) {
      this.closest = distance;
      this.stuckFor = 0;
    } else {
      this.stuckFor += dt;
    }
    if (this.stuckFor >= cfg.stuckSeconds && leader.onGround) return this.catchUp();

    return {
      intent: { ...IDLE_INTENT, moveX, jumpPressed, jumpHeld, sprintHeld: away > cfg.sprintDistance },
      catchUp: false,
    };
  }

  /** Forget everything, e.g. after a respawn or catching up. */
  reset(): void {
    this.walking = false;
    this.jumpHold = 0;
    this.stuckFor = 0;
    this.closest = Number.POSITIVE_INFINITY;
    this.leaderAnchor = undefined;
  }

  private catchUp(): FollowDecision {
    this.reset();
    return { intent: IDLE_INTENT, catchUp: true };
  }
}
