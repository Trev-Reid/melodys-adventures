import Phaser from 'phaser';
import type { DetectableSpec, PointOfInterestDefinition } from '@/levels/LevelDefinition';
import type { Detectable } from '@/gameplay/scent/Detectable';
import { TEXTURES } from '@/assets/keys';
import { SCENT_DEPTH } from './ScentTrail';

/**
 * A discoverable spot: a marker on the ground plus a message. Hidden ones
 * appear when sniffed out. Placeholder visuals.
 */
export class PointOfInterest implements Detectable {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly hiddenSpec?: DetectableSpec;
  revealed: boolean;
  private readonly marker?: Phaser.GameObjects.Image;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly def: PointOfInterestDefinition,
  ) {
    this.id = def.id;
    this.x = def.x;
    this.y = def.y;
    this.hiddenSpec = def.hidden;
    this.revealed = !def.hidden;
    if (def.marker === 'pawPrints') {
      this.marker = scene.add.image(def.x, def.y, TEXTURES.pawPrints).setOrigin(0.5, 1).setDepth(SCENT_DEPTH);
      this.marker.setVisible(this.revealed);
    }
  }

  reveal(): void {
    if (this.revealed) return;
    this.revealed = true;
    if (this.marker) {
      this.marker.setVisible(true).setAlpha(0);
      this.scene.tweens.add({ targets: this.marker, alpha: 1, duration: 400 });
    }
    const t = this.scene.add
      .text(this.def.x, this.def.y - 30, this.def.text, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#e8d6ff',
        stroke: '#2a1a4a',
        strokeThickness: 5,
        align: 'center',
      })
      .setOrigin(0.5, 1)
      .setDepth(SCENT_DEPTH + 5);
    this.scene.tweens.add({ targets: t, y: t.y - 30, alpha: 0, delay: 2200, duration: 900, onComplete: () => t.destroy() });
  }
}
