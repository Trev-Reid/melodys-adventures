import Phaser from 'phaser';
import { Character } from '../Character';
import { BOY_MOVEMENT } from '@/config/movement';
import { CLIMB } from '@/config/teamwork';
import { TEXTURES } from '@/assets/keys';
import type { MovementOutput } from '@/movement/PlatformerMovement';
import { sfx } from '@/core/audio/Sfx';
import { ClimbAbility } from '../abilities/climb/ClimbAbility';
import { pickLocomotionAnim } from '../animationState';
import { ballAnchor, boyAnimKey, boyFrames, BOY_SHEET, type BoyAnim, type BoySkin } from './boyAnimations';
import { climbFrame, interruptsAction, pickBoyAnim, waitDue, type BoyAction, type BoyLook } from './boyAnimState';

/** While the level's done he cheers, then waits this long (s) before cheering again. */
const CHEER_GAP_SECONDS = 0.9;

/**
 * Melody's boy. Follows her around, and the player can swap to control him
 * (TAB / C / SELECT). He has hands, so he does what Melody can't: he opens
 * gates, pulls levers, climbs ladders, throws the football and tells Melody
 * to sit (all on the action button - see gameplay/teamwork). Climbing is his
 * ClimbAbility; the rest is in TeamworkSystem, which tells him to act it out
 * with perform().
 *
 * Art: two sprite sheets from tools/sprites/make_boy.py (boyAnimations.ts) -
 * 'normal', and 'carry' for when he's holding the football. Animations only
 * change how he looks: his body, speed, jump and where the ball leaves his
 * hand (handPosition) are the same whatever he's showing.
 */
export class Boy extends Character {
  /** Shown when you swap to him. Change to his real name! */
  readonly displayName = 'Boy';
  readonly climb: ClimbAbility;
  /** Holding the football (TeamworkSystem keeps this up to date). */
  carrying = false;
  /** Set when the level is complete: he cheers. */
  happy = false;
  /** What he's showing (for the debug overlay and tests). */
  look: BoyLook = 'idle';
  private skin: BoySkin = 'normal';
  private action?: BoyAction;
  private secondsSinceLanding = Number.POSITIVE_INFINITY;
  private stillSeconds = 0;
  private climbDistance = 0;
  private climbedYet = false;
  private cheerWait = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, {
      texture: TEXTURES.boy,
      // Copy so runtime tweaks don't mutate the defaults.
      movement: { ...BOY_MOVEMENT },
      bodyWidth: 24,
      bodyHeight: 58,
    });
    this.setDepth(9);
    this.climb = this.addAbility(new ClimbAbility({ ...CLIMB }));
    this.climb.onRung = () => sfx.play('rung');
    this.play(boyAnimKey('idle'));
    this.on(Phaser.Animations.Events.ANIMATION_COMPLETE, (anim: Phaser.Animations.Animation) => {
      if (this.action && anim.key === boyAnimKey(this.action, this.skin)) this.action = undefined;
      if (anim.key === boyAnimKey('cheer', this.skin)) this.cheerWait = CHEER_GAP_SECONDS;
    });
  }

  /**
   * Act something out: picking the ball up, throwing it, pulling a lever,
   * calling Melody... It plays once, and never stops him moving - if he walks
   * off, the walk takes over.
   */
  perform(action: BoyAction): void {
    this.action = action;
    this.stillSeconds = 0;
    this.look = 'idle'; // so the same action can play again straight away
  }

  /** Where the ball leaves his hand when he throws it, in world pixels (gameplay: keep it fixed). */
  get handPosition(): { x: number; y: number } {
    if (this.climb.climbing) return { x: this.x, y: this.body.top + 6 };
    return { x: this.x + this.facing * 13, y: this.body.center.y + 2 };
  }

  /** Where the football is drawn while he holds it: in his hands, frame by frame. */
  get ballHold(): { x: number; y: number } {
    const frame = typeof this.frame.name === 'number' ? this.frame.name : Number(this.frame.name) || 0;
    const a = ballAnchor(this.skin, frame);
    const dir = this.flipX ? -1 : 1;
    return { x: this.x + dir * a.x, y: this.y + a.y };
  }

  protected override onJump(): void {
    sfx.play('jump');
  }

  protected override afterMove(out: MovementOutput, dt: number): void {
    this.secondsSinceLanding = out.landed ? 0 : this.secondsSinceLanding + dt;
    this.cheerWait = Math.max(0, this.cheerWait - dt);
    this.skin = this.carrying ? 'carry' : 'normal';

    if (this.climb.climbing) {
      // Seen from behind on the ladder; his hands and feet move as far as he climbs.
      if (this.climb.moving) {
        this.climbDistance += Math.abs(this.body.velocity.y) * dt;
        this.climbedYet = true;
      }
      this.action = undefined;
      this.stillSeconds = 0;
      this.setFlipX(false);
      const look: BoyLook = this.climbedYet ? 'climb' : 'climb_idle';
      const frames = boyFrames(look as BoyAnim);
      this.look = look;
      this.anims.stop();
      this.setTexture(BOY_SHEET.skins.find((s) => s.skin === this.skin)!.texture, frames[climbFrame(this.climbDistance, frames.length)]);
      return;
    }
    this.climbDistance = 0;
    this.climbedYet = false;
    this.setFlipX(this.facing < 0);

    const loco = pickLocomotionAnim({
      onGround: this.onGround,
      vx: this.body.velocity.x,
      vy: this.body.velocity.y,
      maxSpeed: this.movement.config.maxSpeed,
      secondsSinceLanding: this.secondsSinceLanding,
    });
    if (this.action && interruptsAction(this.action, loco)) this.action = undefined;
    this.stillSeconds = loco === 'idle' && !this.action ? this.stillSeconds + dt : 0;

    let look = pickBoyAnim({
      climbing: false,
      climbedYet: false,
      loco,
      action: this.action,
      happy: this.happy,
      waitDue: waitDue(this.stillSeconds),
    });
    // Celebrating: a cheer, a little pause, another cheer.
    if (look === 'cheer' && !this.action && this.cheerWait > 0) look = 'idle';
    this.show(look);

    // Legs keep pace with his speed.
    const speed = Math.abs(this.body.velocity.x);
    const max = this.movement.config.maxSpeed;
    this.anims.timeScale =
      look === 'walk' ? Phaser.Math.Clamp(speed / (max * 0.4), 0.6, 1.4)
      : look === 'run' ? Phaser.Math.Clamp(speed / max, 0.7, 1.3)
      : 1;
  }

  /** Play an animation, in the right skin; swapping skin mid-animation keeps its place. */
  private show(look: BoyLook): void {
    const key = boyAnimKey(look as BoyAnim, this.skin);
    if (look === this.look && this.anims.currentAnim?.key === key) return;
    if (look === this.look && this.anims.currentAnim) {
      // Same animation, other skin (he just picked the ball up or threw it).
      const frameIndex = this.anims.currentFrame?.index ?? 1;
      const playing = this.anims.isPlaying;
      this.play({ key, startFrame: frameIndex - 1 });
      if (!playing) this.anims.stop();
      return;
    }
    this.look = look;
    this.play(key);
  }

  override respawn(x: number, y: number): void {
    super.respawn(x, y);
    this.action = undefined;
    this.stillSeconds = 0;
    this.secondsSinceLanding = Number.POSITIVE_INFINITY;
    this.climbDistance = 0;
    this.climbedYet = false;
  }

  override debugLines(): string[] {
    return [...super.debugLines(), `anim ${this.look}${this.carrying ? ' (carrying)' : ''}`];
  }
}
