import Phaser from 'phaser';
import type { BarkAbility, BarkEvent } from '@/characters/abilities/bark/BarkAbility';
import type { BarkTarget } from '@/entities/bark/BarkTarget';
import type { Collectible } from '@/entities/collectibles/Collectible';
import type { Obstacle } from '@/entities/obstacles/Obstacle';
import { sfx } from '@/core/audio/Sfx';
import type { Detectable } from '@/gameplay/scent/Detectable';
import { barkOutcome, barkReaches } from './barkRules';
import { MELODY_BARK } from '@/config/abilities';

/**
 * Makes the world hear Melody's barks: draws the sound wave and tells any
 * bark target inside it to react (or wobble, if the bark wasn't loud enough).
 */
export class BarkSystem {
  private lastHintAt = -Infinity;

  constructor(
    private readonly scene: Phaser.Scene,
    bark: BarkAbility,
    private readonly targets: BarkTarget[],
    /** Hidden things a target can reveal, by name. */
    private readonly revealables: Map<string, Detectable>,
    private readonly say: (text: string, color?: string) => void,
    /** Blocks a bark can smash (BARK BREAK). */
    private readonly blocks: Obstacle[] = [],
  ) {
    bark.onBark((e) => this.onBark(e));
  }

  /** Solid targets (e.g. the cat) that should block Melody. */
  get blockers(): Phaser.GameObjects.Zone[] {
    return this.targets.flatMap((t) => (t.blocker ? [t.blocker] : []));
  }

  private onBark(e: BarkEvent): void {
    this.drawWave(e);
    if (e.boosted) this.drawBoost(e);
    let tooQuiet: { spec: { tooQuietText: string } } | undefined;
    const superReach = { ...e, ...MELODY_BARK.super };

    // BARK BREAK: smash every block the sound reaches.
    let smashed = 0;
    for (const block of this.blocks) {
      if (block.broken) continue;
      const requires = block.spec.barkBreakable!.requiresSuperBark;
      const centre = { x: block.x, y: block.y };
      if (barkReaches(e, centre)) {
        if (barkOutcome(requires, e.isSuper) === 'react') {
          block.smash(e.facing);
          smashed++;
        } else {
          block.shudder();
          tooQuiet = { spec: { tooQuietText: block.spec.tooWeakText } };
        }
      } else if (!e.isSuper && requires && barkReaches(superReach, centre)) {
        tooQuiet = { spec: { tooQuietText: block.spec.tooWeakText } };
      }
    }
    if (smashed > 0) {
      sfx.play('crumble');
      this.scene.cameras.main.shake(120, 0.005);
      this.say(smashed > 2 ? 'KA-BOOM!' : 'CRUMBLE!', '#ffcf6b');
    }

    for (const target of this.targets) {
      if (target.done) continue;
      const requires = target.def.requiresSuperBark ?? target.spec.requiresSuperBark;
      if (!barkReaches(e, target.aim)) {
        // An ordinary woof that a Super Bark *would* have reached still gets a
        // hint, so players learn what the biscuit is for.
        if (!e.isSuper && requires && barkReaches(superReach, target.aim)) {
          target.tooQuiet();
          tooQuiet = target;
        }
        continue;
      }
      if (barkOutcome(requires, e.isSuper) === 'react') {
        target.react(e.facing, (at) => this.reveal(target.def.reveals, at));
      } else {
        target.tooQuiet();
        tooQuiet = target;
      }
    }

    // One hint at a time, not too often.
    const now = this.scene.time.now;
    if (tooQuiet && now - this.lastHintAt > 1500) {
      this.lastHintAt = now;
      this.say(tooQuiet.spec.tooQuietText, '#bfe9ff');
    }
  }

  private reveal(id: string | undefined, at?: { x: number; y: number }): void {
    if (!id) return;
    const item = this.revealables.get(id);
    if (!item || item.revealed) return;
    if (at && 'setHome' in item) (item as Collectible).setHome(at.x, at.y);
    item.reveal();
  }

  /** BARK BOOST: a puff of sound rings blasting down from her feet. */
  private drawBoost(e: BarkEvent): void {
    const color = e.isSuper ? 0x4fc3f7 : 0xffffff;
    for (let i = 0; i < 3; i++) {
      const g = this.scene.add.graphics({ x: e.feetX, y: e.feetY }).setDepth(35);
      g.lineStyle(3, color, 0.9).strokeEllipse(0, 0, 44, 12);
      this.scene.tweens.add({
        targets: g,
        y: e.feetY + 30 + i * 12,
        scaleX: 2.2,
        scaleY: 1.6,
        alpha: 0,
        duration: 380,
        delay: i * 70,
        ease: 'Quad.easeOut',
        onComplete: () => g.destroy(),
      });
    }
  }

  /** Placeholder "sound wave": arcs spreading out in front of her. */
  private drawWave(e: BarkEvent): void {
    const color = e.isSuper ? 0x4fc3f7 : 0xffffff;
    const half = Phaser.Math.DegToRad(e.coneDegrees);
    const start = e.facing > 0 ? -half : Math.PI - half;
    const end = e.facing > 0 ? half : Math.PI + half;
    const rings = e.isSuper ? 4 : 2;

    for (let i = 0; i < rings; i++) {
      const g = this.scene.add.graphics({ x: e.x, y: e.y }).setDepth(35);
      g.lineStyle(e.isSuper ? 5 : 3, color, 0.9).beginPath().arc(0, 0, 20, start, end).strokePath();
      g.setScale(0.5);
      this.scene.tweens.add({
        targets: g,
        scale: e.range / 20,
        alpha: 0,
        duration: e.isSuper ? 520 : 320,
        delay: i * 90,
        ease: 'Quad.easeOut',
        onComplete: () => g.destroy(),
      });
    }

    const word = this.scene.add
      .text(e.x + e.facing * 24, e.y - 18, e.isSuper ? 'WOOF!' : 'woof!', {
        fontFamily: 'Arial, sans-serif',
        fontSize: e.isSuper ? '30px' : '16px',
        fontStyle: 'bold',
        color: e.isSuper ? '#bfe9ff' : '#ffffff',
        stroke: '#1d3a5f',
        strokeThickness: e.isSuper ? 6 : 4,
      })
      .setOrigin(0.5)
      .setDepth(40);
    this.scene.tweens.add({ targets: word, y: word.y - 26, alpha: 0, duration: 700, delay: 150, onComplete: () => word.destroy() });
    if (e.isSuper) this.scene.cameras.main.shake(120, 0.004);
  }
}
