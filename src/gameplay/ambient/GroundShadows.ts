import Phaser from 'phaser';
import { gardenKey } from '@/assets/artAssets';

/** Something that has a soft shadow on the ground under it. */
interface Caster {
  readonly x: number;
  readonly body: Phaser.Physics.Arcade.Body;
}

/**
 * A soft shadow under Melody (and the boy) on whatever is below them, getting
 * smaller and fainter the higher they jump. Makes them feel grounded.
 */
export class GroundShadows {
  private readonly shadows: { who: Caster; img: Phaser.GameObjects.Image }[] = [];

  constructor(
    scene: Phaser.Scene,
    casters: Caster[],
    /** Things the shadow can fall on (platforms, crates, the trampoline...). */
    private readonly surfaces: () => Phaser.GameObjects.GameObject[],
  ) {
    for (const who of casters) {
      this.shadows.push({ who, img: scene.add.image(0, 0, gardenKey('fx-shadow')).setDepth(1.5).setVisible(false) });
    }
  }

  update(): void {
    const tops = this.surfaces();
    for (const { who, img } of this.shadows) {
      const feet = who.body.bottom;
      let ground = Number.POSITIVE_INFINITY;
      for (const obj of tops) {
        const b = (obj as Phaser.GameObjects.GameObject & { body?: Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody }).body;
        if (!b || !b.enable) continue;
        if (who.x < b.left || who.x > b.right) continue;
        if (b.top >= feet - 6 && b.top < ground) ground = b.top;
      }
      const height = ground - feet;
      if (!Number.isFinite(ground) || height > 420) {
        img.setVisible(false);
        continue;
      }
      const k = Phaser.Math.Clamp(1 - height / 320, 0.35, 1);
      const w = who.body.width * 1.35 * k;
      img.setVisible(true).setPosition(who.x, ground + 1).setDisplaySize(w, Math.max(6, w * 0.26)).setAlpha(0.8 * k);
    }
  }
}
