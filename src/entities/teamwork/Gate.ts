import Phaser from 'phaser';
import { gardenKey } from '@/assets/artAssets';
import { GATE } from '@/config/teamwork';
import type { InteractableDefinition } from '@/levels/LevelDefinition';

/**
 * A garden door in a tall hedge. Solid until the boy opens it (Melody has no
 * hands); the hedge above is always solid and too tall to jump over.
 */
export class Gate {
  readonly id?: string;
  readonly x: number;
  /** Where it stands (its bottom). */
  readonly y: number;
  isOpen = false;
  /** Solid while it's shut. */
  readonly door: Phaser.GameObjects.Zone;
  /** The hedge over the door: always solid. */
  readonly hedge: Phaser.GameObjects.Zone;
  private readonly sprite: Phaser.GameObjects.Image;

  constructor(
    private readonly scene: Phaser.Scene,
    def: InteractableDefinition,
  ) {
    this.id = def.id;
    this.x = def.x;
    this.y = def.y;
    scene.add.image(def.x, def.y, gardenKey('hedge-arch')).setOrigin(0.5, 1).setDepth(-5.5);
    this.sprite = scene.add.image(def.x, def.y, gardenKey('gate'), 0).setOrigin(0.5, 1).setDepth(4);
    const solid = (r: { x: number; y: number; width: number; height: number }) => {
      const z = scene.add.zone(def.x + r.x, def.y + r.y, r.width, r.height).setOrigin(0, 0);
      scene.physics.add.existing(z, true);
      return z;
    };
    this.door = solid(GATE.door);
    this.hedge = solid(GATE.hedge);
    if (def.startsOpen) this.open(false);
  }

  /** Swing it open (it stays open). Returns false if it already was. */
  open(animate = true): boolean {
    if (this.isOpen) return false;
    this.isOpen = true;
    (this.door.body as Phaser.Physics.Arcade.StaticBody).enable = false;
    this.sprite.setFrame(1);
    if (animate) {
      this.sprite.setScale(1.08, 1);
      this.scene.tweens.add({ targets: this.sprite, scaleX: 1, duration: 260, ease: 'Back.easeOut' });
    }
    return true;
  }

  /** Is someone standing here close enough to open it? */
  inReach(x: number, feetY: number): boolean {
    return !this.isOpen && Math.abs(x - this.x) <= GATE.reach && Math.abs(feetY - this.y) <= 60;
  }

  /** Is this body pushing against the shut door? */
  blocks(body: Phaser.Physics.Arcade.Body): boolean {
    if (this.isOpen) return false;
    const door = this.door.body as Phaser.Physics.Arcade.StaticBody;
    const nearX = Math.abs(body.center.x - door.center.x) <= body.halfWidth + door.halfWidth + 3;
    return nearX && body.bottom > door.top && body.top < door.bottom;
  }
}
