import Phaser from 'phaser';
import { Character } from '../Character';
import { BOY_MOVEMENT } from '@/config/movement';
import { TEXTURES } from '@/assets/keys';
import type { MovementOutput } from '@/movement/PlatformerMovement';
import { sfx } from '@/core/audio/Sfx';

const WALK_ANIM = 'boy-walk';

/**
 * Melody's boy. Follows her around, and the player can swap to control him
 * (TAB / C). No special abilities yet - those go in `abilities` like Melody's.
 *
 * Placeholder art for now (assets/placeholders.ts): a standing frame and a
 * mid-stride frame. A real sprite sheet replaces them under the same keys.
 */
export class Boy extends Character {
  /** Shown when you swap to him. Change to his real name! */
  readonly displayName = 'Boy';

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, {
      texture: TEXTURES.boy,
      // Copy so runtime tweaks don't mutate the defaults.
      movement: { ...BOY_MOVEMENT },
      bodyWidth: 24,
      bodyHeight: 58,
    });
    this.setDepth(9);
    if (!scene.anims.exists(WALK_ANIM)) {
      scene.anims.create({ key: WALK_ANIM, frames: [{ key: TEXTURES.boyStep }, { key: TEXTURES.boy }], frameRate: 7, repeat: -1 });
    }
  }

  protected override onJump(): void {
    sfx.play('jump');
  }

  protected override afterMove(_out: MovementOutput, _dt: number): void {
    const speed = Math.abs(this.body.velocity.x);
    if (!this.onGround) {
      this.anims.stop();
      this.setTexture(TEXTURES.boyStep);
    } else if (speed > 20) {
      this.anims.play(WALK_ANIM, true);
      this.anims.timeScale = Phaser.Math.Clamp(speed / this.movement.config.maxSpeed, 0.6, 1.4);
    } else {
      this.anims.stop();
      this.setTexture(TEXTURES.boy);
    }
  }
}
