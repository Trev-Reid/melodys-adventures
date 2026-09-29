import type { BarkConfig } from '@/config/abilities';
import type { Ability, CharacterIntent } from '../Ability';
import type { Character } from '../../Character';
import { barkBoostVelocity } from '@/gameplay/bark/barkRules';

/** A bark that just happened. Things in the world react to these. */
export interface BarkEvent {
  /** Where the sound comes from (her mouth). */
  x: number;
  y: number;
  /** 1 = facing right, -1 = facing left. */
  facing: 1 | -1;
  /** A SUPER BARK (the 'superBark' capability) rather than an ordinary woof. */
  isSuper: boolean;
  range: number;
  coneDegrees: number;
  /** This bark gave her a BARK BOOST (she barked in mid-air). */
  boosted: boolean;
  /** Where her feet were, for the boost puff. */
  feetX: number;
  feetY: number;
}

/**
 * Press bark to bark. Doesn't stop her moving. Barking in mid-air gives a
 * BARK BOOST upwards, once per jump (bigger with SUPER BARK).
 * Anyone can listen for barks
 * (the BarkSystem does) - the ability itself knows nothing about targets.
 */
export class BarkAbility implements Ability {
  readonly name = 'bark';
  private cooldown = 0;
  /** The mid-air boost has been used since she last stood on something. */
  private boostUsed = false;
  private readonly listeners: ((e: BarkEvent) => void)[] = [];

  constructor(readonly config: BarkConfig) {}

  onBark(listener: (e: BarkEvent) => void): void {
    this.listeners.push(listener);
  }

  update(character: Character, intent: CharacterIntent, dt: number): void {
    this.cooldown = Math.max(0, this.cooldown - dt);
    if (character.physicallyOnGround) this.boostUsed = false;
    if (!intent.barkPressed || this.cooldown > 0) return;
    this.cooldown = this.config.cooldownSeconds;

    const isSuper = character.can('superBark');
    const reach = isSuper ? this.config.super : this.config.normal;

    let boosted = false;
    if (!character.onGround && !this.boostUsed) {
      const speed = isSuper ? this.config.boost.superSpeed : this.config.boost.speed;
      const vy = barkBoostVelocity(character.body.velocity.y, speed);
      if (vy !== null) {
        character.body.setVelocityY(vy);
        character.movement.endJump();
        this.boostUsed = true;
        boosted = true;
      }
    }

    const event: BarkEvent = {
      x: character.x + character.facing * 34 * character.scaleX,
      y: character.body.top + 10 * character.scaleY,
      facing: character.facing,
      isSuper,
      range: reach.range,
      coneDegrees: reach.coneDegrees,
      boosted,
      feetX: character.x,
      feetY: character.body.bottom,
    };
    this.listeners.forEach((l) => l(event));
  }

  reset(): void {
    this.cooldown = 0;
    this.boostUsed = false;
  }
}
