import Phaser from 'phaser';
import { Character } from '../Character';
import { MELODY_MOVEMENT } from '@/config/movement';
import { MELODY_REST, MELODY_SPRINT } from '@/config/abilities';
import { TEXTURES } from '@/assets/keys';
import { SprintAbility } from '../abilities/sprint/SprintAbility';
import type { CharacterIntent } from '../abilities/Ability';
import { IDLE_INTENT } from '../abilities/Ability';
import { pickLocomotionAnim } from '../animationState';
import { MELODY_ANIM_NAMES, isMelodySkin, melodyAnimKey, type MelodyAnim, type MelodySkin } from './melodyAnimations';
import { EFFECTS } from '@/config/powerUps';
import type { MovementOutput } from '@/movement/PlatformerMovement';
import { sfx } from '@/core/audio/Sfx';

/** Awake and playing, or one of her resting states. */
export type RestState = 'awake' | 'sitting' | 'sleeping' | 'busy';

/**
 * Melody - the star of the show. A white-and-tan lurcher with a black collar.
 *
 * Abilities so far: sprint (her incredible speed), and naps when left alone.
 * Still to come: sniffing, sausage power-ups, getting scared, the squirrel toy.
 */
export class Melody extends Character {
  readonly sprint: SprintAbility;
  anim: MelodyAnim = 'idle';
  rest: RestState = 'awake';
  /** Set when the level is complete - she celebrates instead of idling. */
  happy = false;

  private secondsSinceLanding = Number.POSITIVE_INFINITY;
  private stillSeconds = 0;
  /** While > 0 she's busy (waking up, a big sniff...) and ignores input. */
  private busyTimer = 0;
  private zzzTimer = 0;
  private readonly restCfg = { ...MELODY_REST };
  /** Animation to loop after the current one-shot animation finishes. */
  private nextAnim?: MelodyAnim;
  /** Which sprite sheet she's drawn with ('buff' during SUPER STRENGTH). */
  skin: MelodySkin = 'normal';
  private targetScale = 1;
  private appearanceClock = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, {
      texture: TEXTURES.melody,
      // Copy so runtime tweaks (power-ups, debug tuning) don't mutate the defaults.
      movement: { ...MELODY_MOVEMENT },
      // Covers her body and legs; her head can poke slightly past walls, which feels fairer.
      bodyWidth: 46,
      bodyHeight: 44,
    });
    this.setDepth(10);
    this.sprint = this.addAbility(new SprintAbility(scene, { ...MELODY_SPRINT }));
    this.playAnim('idle');
    this.on(Phaser.Animations.Events.ANIMATION_COMPLETE, (anim: Phaser.Animations.Animation) => {
      const next = this.nextAnim;
      if (next && anim.key === melodyAnimKey(this.anim, this.skin)) this.playAnim(next);
    });

    // Some power-ups start with a moment of acting (SUPER SNIFF: a big sniff).
    this.effects.listen({
      onStart: (type) => {
        const start = EFFECTS[type].onStart;
        if (start) this.perform(start.anim, start.pauseSeconds);
      },
    });
  }

  /**
   * Stop and act for a moment - she ignores input until it's done.
   * Used for waking up, sniffing when SUPER SNIFF starts, celebrating a find.
   */
  perform(anim: string | undefined, seconds: number): void {
    this.rest = 'busy';
    this.busyTimer = seconds;
    this.stillSeconds = 0;
    if (anim && (MELODY_ANIM_NAMES as string[]).includes(anim)) {
      this.anim = 'idle'; // force a restart even if already playing
      this.playAnim(anim as MelodyAnim);
    }
  }

  override applyIntent(intent: CharacterIntent, dtSeconds: number): void {
    const wantsToAct = intent.moveX !== 0 || intent.jumpPressed || intent.sprintHeld;

    if (this.rest === 'sleeping' && wantsToAct) {
      this.perform('wake', this.restCfg.wakeUpSeconds);
    } else if (this.rest === 'sitting' && wantsToAct) {
      this.rest = 'awake';
    }

    if (this.rest === 'busy') {
      this.busyTimer -= dtSeconds;
      if (this.busyTimer <= 0) this.wakeUp();
      super.applyIntent(IDLE_INTENT, dtSeconds); // still busy (stretching, sniffing...)
      return;
    }
    super.applyIntent(intent, dtSeconds);
  }

  protected override afterMove(out: MovementOutput, dtSeconds: number): void {
    this.updateAppearance(dtSeconds);
    this.secondsSinceLanding = out.landed ? 0 : this.secondsSinceLanding + dtSeconds;
    if (this.rest === 'busy') return;

    const loco = pickLocomotionAnim({
      onGround: this.onGround,
      vx: this.body.velocity.x,
      vy: this.body.velocity.y,
      maxSpeed: this.movement.config.maxSpeed,
      secondsSinceLanding: this.secondsSinceLanding,
    });

    // Resting: stand still long enough and she sits, then naps.
    if (loco === 'idle' && !this.happy) this.stillSeconds += dtSeconds;
    else this.stillSeconds = 0;
    if (loco !== 'idle' && this.rest !== 'awake') this.rest = 'awake';

    if (this.rest === 'awake' && this.stillSeconds >= this.restCfg.sitAfterSeconds) {
      this.rest = 'sitting';
      this.playAnim('sit', 'sit_idle');
    }
    if (this.rest === 'sitting' && this.stillSeconds >= this.restCfg.sleepAfterSeconds) {
      this.rest = 'sleeping';
      this.playAnim('lie_down', 'sleep');
    }
    if (this.rest === 'sleeping') this.emitZzz(dtSeconds);
    if (this.rest !== 'awake') return;

    const next: MelodyAnim = loco === 'idle' && this.happy ? 'happy' : loco;
    this.playAnim(next);

    // Legs keep pace with her speed.
    const speed = Math.abs(this.body.velocity.x);
    const max = this.movement.config.maxSpeed;
    this.anims.timeScale =
      next === 'walk' ? Phaser.Math.Clamp(speed / (max * 0.4), 0.6, 1.4)
      : next === 'run' ? Phaser.Math.Clamp(speed / max, 0.7, 1.3)
      : 1;
  }

  protected override onJump(): void {
    sfx.play('jump');
  }

  override respawn(x: number, y: number): void {
    super.respawn(x, y);
    this.secondsSinceLanding = Number.POSITIVE_INFINITY;
    this.wakeUp();
  }

  override debugLines(): string[] {
    const skin = this.skin !== 'normal' ? `  [${this.skin} x${this.scaleX.toFixed(2)}]` : '';
    const rest = this.rest !== 'awake' ? `  (${this.rest})` : this.stillSeconds > 1 ? `  still ${this.stillSeconds.toFixed(0)}s` : '';
    return [...super.debugLines(), `anim ${this.anim}${rest}${skin}`];
  }

  /**
   * Power-ups can change how she looks (config/powerUps.ts `appearance`):
   * SUPER STRENGTH makes her buff and bigger. She flickers back and forth
   * when it's about to run out, then shrinks back to normal.
   */
  private updateAppearance(dt: number): void {
    this.appearanceClock += dt;
    const look = this.effects.appearance();
    const flickerOff = look.warning && Math.floor(this.appearanceClock * 8) % 2 === 0;
    const skin: MelodySkin = !flickerOff && isMelodySkin(look.skin) ? look.skin : 'normal';

    if (skin !== this.skin) {
      this.skin = skin;
      // Swap sheets mid-animation without restarting it.
      const frameIndex = this.anims.currentFrame?.index ?? 1;
      const timeScale = this.anims.timeScale;
      this.play({ key: melodyAnimKey(this.anim, skin), startFrame: frameIndex - 1 });
      this.anims.timeScale = timeScale;
    }

    const scale = look.warning && flickerOff ? 1 + (look.scale - 1) * 0.5 : look.scale;
    if (scale !== this.targetScale) {
      const growing = scale > this.targetScale;
      this.targetScale = scale;
      this.scene.tweens.killTweensOf(this);
      this.scene.tweens.add({
        targets: this,
        scaleX: scale,
        scaleY: scale,
        duration: look.warning ? 60 : growing ? 380 : 300,
        ease: growing && !look.warning ? 'Back.easeOut' : 'Sine.easeInOut',
      });
    }
  }

  private wakeUp(): void {
    this.rest = 'awake';
    this.stillSeconds = 0;
    this.busyTimer = 0;
  }

  /** Play an animation (if not already playing), optionally followed by a looping one. */
  private playAnim(anim: MelodyAnim, then?: MelodyAnim): void {
    if (anim === this.anim) return;
    this.anim = anim;
    this.nextAnim = then;
    this.anims.timeScale = 1;
    this.play(melodyAnimKey(anim, this.skin));
  }

  private emitZzz(dt: number): void {
    this.zzzTimer -= dt;
    if (this.zzzTimer > 0) return;
    this.zzzTimer = 1.3;
    const x = this.x + this.facing * 26 * this.scaleX;
    const top = this.body.top;
    const z = this.scene.add
      .text(x, top + 10, 'z', { fontFamily: 'Arial, sans-serif', fontSize: '16px', fontStyle: 'bold', color: '#ffffff', stroke: '#3b2412', strokeThickness: 3 })
      .setOrigin(0.5)
      .setDepth(20);
    this.scene.tweens.add({
      targets: z,
      x: x + this.facing * 14,
      y: top - 30,
      scale: 1.6,
      alpha: 0,
      duration: 1600,
      ease: 'Sine.easeOut',
      onComplete: () => z.destroy(),
    });
  }
}
