import Phaser from 'phaser';
import type { StatusEffects } from '@/gameplay/effects/StatusEffects';
import type { ComboDefinition } from '@/config/powerUps';

/**
 * Small placeholder sparkles around a character while an effect with a
 * `sparkle` colour is active (faster and gold during a combo). The main
 * visual for a power-up is its `appearance` (e.g. buff and bigger), which
 * the character handles itself.
 */
export class EffectAura {
  private sparkTimer = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly target: Phaser.Physics.Arcade.Sprite,
    private readonly effects: StatusEffects,
  ) {}

  update(dt: number, combos: ComboDefinition[]): void {
    const sparkling = this.effects.list().find((e) => e.def.sparkle !== undefined);
    if (!sparkling) return;
    this.sparkTimer -= dt;
    if (this.sparkTimer > 0) return;
    this.sparkTimer = combos.length ? 0.05 : 0.22;
    this.spark(combos[0]?.color ?? sparkling.def.sparkle!);
  }

  private spark(color: number): void {
    const body = this.target.body as Phaser.Physics.Arcade.Body;
    const x = body.center.x + Phaser.Math.Between(-body.width * 0.6, body.width * 0.6);
    const y = body.center.y + Phaser.Math.Between(-body.height * 0.8, body.height * 0.3);
    const s = this.scene.add.star(x, y, 4, 1.5, 4, color).setDepth(this.target.depth + 1);
    this.scene.tweens.add({
      targets: s,
      y: y - Phaser.Math.Between(16, 30),
      alpha: 0,
      angle: 90,
      scale: 0.4,
      duration: 480,
      onComplete: () => s.destroy(),
    });
  }
}
