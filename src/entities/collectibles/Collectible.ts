import Phaser from 'phaser';
import type { CollectibleDefinition, CollectibleKind, DetectableSpec } from '@/levels/LevelDefinition';
import type { Detectable } from '@/gameplay/scent/Detectable';
import { TEXTURES } from '@/assets/keys';
import { COLLECTIBLE_TYPES, type CollectibleType } from './collectibleTypes';

/** A floating pick-up. Pick-up detection is done by the scene (simple overlap). */
export class Collectible extends Phaser.GameObjects.Image implements Detectable {
  readonly kind: CollectibleKind;
  readonly info: CollectibleType;
  readonly id?: string;
  /** Hidden until Melody's nose finds it (see gameplay/scent). */
  readonly hiddenSpec?: DetectableSpec;
  revealed: boolean;
  collected = false;
  private readonly home: { x: number; y: number };
  private readonly glow?: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, def: CollectibleDefinition) {
    const type = COLLECTIBLE_TYPES[def.kind];
    super(scene, def.x, def.y, type.texture);
    this.kind = def.kind;
    this.info = type;
    this.id = def.id;
    this.hiddenSpec = def.hidden;
    this.revealed = !def.hidden;
    this.home = { x: def.x, y: def.y };
    scene.add.existing(this);
    this.setDepth(5);

    if (type.glow !== undefined) {
      this.glow = scene.add.image(def.x, def.y, TEXTURES.glow).setTint(type.glow).setDepth(4).setScale(1.3);
      scene.tweens.add({ targets: this.glow, scale: 1.8, alpha: 0.5, duration: 500, yoyo: true, repeat: -1 });
    }
    this.startBobbing();
    if (!this.revealed) {
      this.setVisible(false);
      this.glow?.setVisible(false);
    }
  }

  /** Found by sniffing: pop into view with a highlight. Stays found. */
  reveal(): void {
    if (this.revealed || this.collected) return;
    this.revealed = true;
    this.setVisible(true).setScale(0.2).setAlpha(1);
    this.scene.tweens.add({ targets: this, scale: 1, duration: 350, ease: 'Back.easeOut' });
    this.glow?.setVisible(true);
  }

  /** Slightly generous hit box - it should feel easy to grab things. */
  overlaps(rect: Phaser.Geom.Rectangle): boolean {
    if (this.collected || !this.revealed || !this.visible) return false;
    const pad = 6;
    const r = new Phaser.Geom.Rectangle(
      this.x - this.displayWidth / 2 - pad,
      this.y - this.displayHeight / 2 - pad,
      this.displayWidth + pad * 2,
      this.displayHeight + pad * 2,
    );
    return Phaser.Geom.Intersects.RectangleToRectangle(r, rect);
  }

  /** Play the pick-up animation, then remove (or hide until it respawns). */
  collect(): void {
    this.collected = true;
    this.scene.tweens.killTweensOf(this);
    this.glow?.setVisible(false);
    this.scene.tweens.add({
      targets: this,
      scale: 1.8,
      alpha: 0,
      y: this.y - 20,
      duration: 220,
      ease: 'Quad.easeOut',
      onComplete: () => {
        if (this.info.respawnSeconds) {
          this.setVisible(false);
          this.scene.time.delayedCall(this.info.respawnSeconds * 1000, () => this.respawn());
        } else {
          this.glow?.destroy();
          this.destroy();
        }
      },
    });
  }

  private respawn(): void {
    if (!this.scene) return;
    this.setPosition(this.home.x, this.home.y).setScale(0.2).setAlpha(1).setVisible(true);
    this.glow?.setVisible(true);
    this.scene.tweens.add({
      targets: this,
      scale: 1,
      duration: 300,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.collected = false;
        this.startBobbing();
      },
    });
  }

  private startBobbing(): void {
    // Gentle bob so items catch the eye; random start so they don't move in sync.
    this.scene.tweens.add({
      targets: this,
      y: this.home.y - 6,
      duration: 700,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
      delay: Phaser.Math.Between(0, 700),
    });
  }
}
