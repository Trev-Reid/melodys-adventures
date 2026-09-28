import Phaser from 'phaser';
import type { SprintConfig } from '@/config/abilities';
import { COMBOS, type Capability } from '@/config/powerUps';
import type { Ability, CharacterIntent } from '../Ability';
import type { Character } from '../../Character';
import { SprintStamina } from './SprintStamina';

const TRAIL_INTERVAL_S = 0.05;
const BAR_WIDTH = 44;
const BAR_HEIGHT = 6;

/** Hold the sprint button for a burst of speed, limited by a stamina bar. */
export class SprintAbility implements Ability {
  readonly name = 'sprint';
  readonly stamina: SprintStamina;
  private readonly bar: Phaser.GameObjects.Graphics;
  private trailTimer = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    config: SprintConfig,
  ) {
    this.stamina = new SprintStamina(config);
    this.bar = scene.add.graphics().setDepth(20);
  }

  get isSprinting(): boolean {
    return this.stamina.sprinting;
  }

  update(character: Character, intent: CharacterIntent, dt: number): void {
    const cfg = this.stamina.config;
    const sprinting = this.stamina.update(intent.sprintHeld && intent.moveX !== 0, dt);

    if (sprinting) {
      character.movement.modifiers.maxSpeed *= cfg.speedMultiplier;
      character.movement.modifiers.acceleration *= cfg.accelerationMultiplier;
    }

    this.updateTrail(character, dt);
    this.drawBar(character);
  }

  capabilities(): Capability[] {
    return this.stamina.sprinting ? ['sprint'] : [];
  }

  reset(): void {
    this.stamina.reset();
    this.bar.clear();
  }

  debugText(): string {
    const s = this.stamina;
    const state = s.exhausted ? 'TIRED' : s.sprinting ? 'SPRINTING' : '-';
    return `sprint ${state.padEnd(9)} stamina ${(s.stamina * 100).toFixed(0)}%`;
  }

  destroy(): void {
    this.bar.destroy();
  }

  private updateTrail(character: Character, dt: number): void {
    const fastEnough = Math.abs(character.body.velocity.x) > character.movement.config.maxSpeed * 1.05;
    if (!this.stamina.config.showTrail || !fastEnough) {
      this.trailTimer = 0;
      return;
    }
    this.trailTimer -= dt;
    if (this.trailTimer > 0) return;
    this.trailTimer = TRAIL_INTERVAL_S;

    const ghost = this.scene.add
      .image(character.x, character.y, character.texture.key, character.frame.name)
      .setOrigin(character.originX, character.originY)
      .setScale(character.scaleX, character.scaleY)
      .setFlipX(character.flipX)
      .setAlpha(character.can('smash') ? 0.6 : 0.35)
      // Golden streaks during a SUPER CHARGE, pale ones for a normal sprint.
      .setTint(character.can('smash') ? (COMBOS.find((c) => c.grants.includes('smash'))?.color ?? 0xffd23f) : 0xfff1c4)
      .setDepth(character.depth - 1);
    this.scene.tweens.add({
      targets: ghost,
      alpha: 0,
      duration: 220,
      onComplete: () => ghost.destroy(),
    });
  }

  private drawBar(character: Character): void {
    const s = this.stamina;
    this.bar.clear();
    if (s.stamina >= 1) return;

    const x = character.x - BAR_WIDTH / 2;
    const y = character.body.top - 14;
    const colour = s.exhausted ? 0xe53935 : s.stamina > 0.5 ? 0x66bb6a : 0xffa726;

    this.bar.fillStyle(0x000000, 0.45).fillRoundedRect(x - 2, y - 2, BAR_WIDTH + 4, BAR_HEIGHT + 4, 3);
    this.bar.fillStyle(colour, 1).fillRoundedRect(x, y, Math.max(1, BAR_WIDTH * s.stamina), BAR_HEIGHT, 2);
  }
}
