import type { BarkConfig } from '@/config/abilities';
import type { Ability, CharacterIntent } from '../Ability';
import type { Character } from '../../Character';

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
}

/**
 * Press bark to bark. Doesn't stop her moving. Anyone can listen for barks
 * (the BarkSystem does) - the ability itself knows nothing about targets.
 */
export class BarkAbility implements Ability {
  readonly name = 'bark';
  private cooldown = 0;
  private readonly listeners: ((e: BarkEvent) => void)[] = [];

  constructor(readonly config: BarkConfig) {}

  onBark(listener: (e: BarkEvent) => void): void {
    this.listeners.push(listener);
  }

  update(character: Character, intent: CharacterIntent, dt: number): void {
    this.cooldown = Math.max(0, this.cooldown - dt);
    if (!intent.barkPressed || this.cooldown > 0) return;
    this.cooldown = this.config.cooldownSeconds;

    const isSuper = character.can('superBark');
    const reach = isSuper ? this.config.super : this.config.normal;
    const event: BarkEvent = {
      x: character.x + character.facing * 34 * character.scaleX,
      y: character.body.top + 10 * character.scaleY,
      facing: character.facing,
      isSuper,
      range: reach.range,
      coneDegrees: reach.coneDegrees,
    };
    this.listeners.forEach((l) => l(event));
  }

  reset(): void {
    this.cooldown = 0;
  }
}
