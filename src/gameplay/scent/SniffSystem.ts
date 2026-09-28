import Phaser from 'phaser';
import type { Character } from '@/characters/Character';
import type { ScentTrail } from '@/entities/scent/ScentTrail';
import { SCENT_DEPTH } from '@/entities/scent/ScentTrail';
import type { Detectable } from './Detectable';
import { isTrailVisible, shouldReveal } from './scentRules';
import { sfx } from '@/core/audio/Sfx';

/**
 * Melody's nose as a game system. Each frame it decides which scent trails
 * the player can perceive and reveals hidden things she's close enough to
 * smell. It reveals information only - following the trail and working out
 * what to do is up to the player.
 */
export class SniffSystem {
  constructor(
    private readonly scene: Phaser.Scene,
    private readonly player: Character,
    private readonly trails: ScentTrail[],
    private readonly detectables: Detectable[],
    private readonly onReveal?: (d: Detectable) => void,
  ) {}

  update(dt: number): void {
    const can = (c: Parameters<Character['can']>[0]) => this.player.can(c);

    for (const trail of this.trails) {
      trail.setShown(isTrailVisible(trail.def, can));
      trail.update(dt);
    }

    const px = this.player.x;
    const py = this.player.body.center.y;
    for (const d of this.detectables) {
      if (d.revealed || !d.hiddenSpec) continue;
      const distance = Phaser.Math.Distance.Between(px, py, d.x, d.y);
      if (shouldReveal(d.hiddenSpec, can, distance)) {
        d.reveal();
        this.pingAt(d.x, d.y);
        sfx.play('reveal');
        this.onReveal?.(d);
      }
    }
  }

  /** Little "found it!" ring where something was revealed. */
  private pingAt(x: number, y: number): void {
    for (let i = 0; i < 2; i++) {
      const ring = this.scene.add.circle(x, y, 10).setStrokeStyle(3, 0xe8d6ff).setDepth(SCENT_DEPTH + 2);
      this.scene.tweens.add({ targets: ring, scale: 5, alpha: 0, duration: 700, delay: i * 180, onComplete: () => ring.destroy() });
    }
    const bang = this.scene.add
      .text(x, y - 34, '!', { fontFamily: 'Arial, sans-serif', fontSize: '30px', fontStyle: 'bold', color: '#ffe066', stroke: '#2a1a4a', strokeThickness: 5 })
      .setOrigin(0.5)
      .setDepth(SCENT_DEPTH + 3);
    this.scene.tweens.add({ targets: bang, y: y - 60, alpha: 0, duration: 1100, delay: 400, onComplete: () => bang.destroy() });
  }
}
