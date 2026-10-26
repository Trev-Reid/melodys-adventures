import type { Ability, CharacterIntent, MovementOverride } from '../Ability';
import type { Character } from '../../Character';
import { climbStep, ladderToGrab, type ClimbConfig, type Rect } from '@/gameplay/teamwork/teamworkRules';

/**
 * Climbing ladders (the boy). Push up at a ladder to grab it, up/down to
 * climb, jump to leap off. At the top he steps onto whatever's there (the
 * treehouse deck); pushing down at the top of a ladder climbs back down
 * through it.
 */
export class ClimbAbility implements Ability {
  readonly name = 'climb';
  private ladders: Rect[] = [];
  private ladder?: Rect;
  /** Seconds since he last moved on the ladder (for the climbing animation). */
  private stepClock = 0;
  /** Called once per rung, for a little tap sound. */
  onRung?: () => void;

  constructor(readonly config: ClimbConfig) {}

  get climbing(): boolean {
    return !!this.ladder;
  }

  /** Is he moving on the ladder right now (for the animation)? */
  moving = false;

  setLadders(ladders: Rect[]): void {
    this.ladders = ladders;
  }

  /** The ladder he's standing at or on, if any (for the "Climb" prompt). */
  ladderNear(character: Character): Rect | undefined {
    const b = character.body;
    return (
      ladderToGrab(this.ladders, b.center.x, b.bottom, character.onGround, -1, this.config.grabDistance) ??
      ladderToGrab(this.ladders, b.center.x, b.bottom, character.onGround, 1, this.config.grabDistance)
    );
  }

  update(character: Character, intent: CharacterIntent): void {
    if (this.ladder) return;
    const b = character.body;
    const grab = ladderToGrab(this.ladders, b.center.x, b.bottom, character.onGround, intent.moveY, this.config.grabDistance);
    if (grab) {
      this.ladder = grab;
      this.stepClock = 0;
    }
  }

  overrideMovement(character: Character, intent: CharacterIntent, dt: number): MovementOverride | undefined {
    const ladder = this.ladder;
    if (!ladder) return undefined;
    const b = character.body;
    const step = climbStep(ladder, b.bottom, intent, character.physicallyOnGround, {
      ...this.config,
      jumpVelocity: character.movement.config.jumpVelocity,
    });
    if (!step.climbing) {
      this.ladder = undefined;
      this.moving = false;
      if (step.feetY !== undefined) b.reset(character.x, step.feetY); // step off at the top, onto the deck
      const vx = step.reason === 'jump' ? intent.moveX * character.movement.config.maxSpeed * 0.6 : 0;
      return { vx, vy: step.vy, gravityY: character.movement.config.gravity };
    }
    // Slide to the middle of the ladder so he's lined up with it.
    const middle = ladder.x + ladder.width / 2;
    const vx = Math.abs(middle - b.center.x) > 1 ? Math.sign(middle - b.center.x) * Math.min(240, Math.abs(middle - b.center.x) / dt) : 0;
    this.moving = step.vy !== 0;
    if (this.moving) {
      this.stepClock += dt;
      if (this.stepClock > 0.22) {
        this.stepClock = 0;
        this.onRung?.();
      }
    }
    return { vx, vy: step.vy, gravityY: 0 };
  }

  passesThroughOneWay(): boolean {
    return this.climbing;
  }

  reset(): void {
    this.ladder = undefined;
    this.moving = false;
  }

  debugText(): string {
    return this.ladder ? `climbing (${Math.round(this.ladder.x)}, ${Math.round(this.ladder.y)})` : 'climb -';
  }
}
