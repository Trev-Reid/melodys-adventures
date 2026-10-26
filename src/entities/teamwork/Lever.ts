import Phaser from 'phaser';
import { gardenKey } from '@/assets/artAssets';
import { LEVER } from '@/config/teamwork';
import type { InteractableDefinition } from '@/levels/LevelDefinition';

/** A lever on a post: the boy pulls it to work a gate or a lift (its `target`). */
export class Lever {
  readonly x: number;
  readonly y: number;
  readonly target: string;
  pulled = false;
  private readonly sprite: Phaser.GameObjects.Image;

  constructor(
    private readonly scene: Phaser.Scene,
    def: InteractableDefinition,
  ) {
    this.x = def.x;
    this.y = def.y;
    this.target = def.target ?? '';
    this.sprite = scene.add.image(def.x, def.y, gardenKey('lever'), 0).setOrigin(0.5, 1).setDepth(3);
  }

  /** Flip it the other way. */
  pull(): void {
    this.pulled = !this.pulled;
    this.sprite.setFrame(this.pulled ? 1 : 0);
    this.sprite.setAngle(this.pulled ? -6 : 6);
    this.scene.tweens.add({ targets: this.sprite, angle: 0, duration: 220, ease: 'Back.easeOut' });
  }

  inReach(x: number, feetY: number): boolean {
    return Math.abs(x - this.x) <= LEVER.reach && Math.abs(feetY - this.y) <= 40;
  }
}
