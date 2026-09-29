import Phaser from 'phaser';
import type { BarkTargetDefinition } from '@/levels/LevelDefinition';
import { BARK_TARGET_TYPES, DEFAULT_TREE_HEIGHT, type BarkTargetType } from '@/config/barkTargets';
import { TEXTURES } from '@/assets/keys';
import { sfx } from '@/core/audio/Sfx';

const LEAF_COLORS = [0xd9822b, 0xb85c1a, 0xe8b33a, 0x9c3d17, 0xc9a227];

/**
 * Something that reacts to a bark. Placeholder visuals for now:
 *  - ballInTree: a tree with Melody's ball stuck in it -> the ball falls
 *  - leafPile:   a heap of leaves -> blows away, revealing what's under it
 *  - cat:        the neighbour's cat blocking the way -> runs off
 */
export class BarkTarget {
  readonly def: BarkTargetDefinition;
  readonly spec: BarkTargetType;
  done = false;
  /** Where the bark has to reach (the ball, the middle of the pile, the cat). */
  readonly aim: { x: number; y: number };
  /** For solid targets (the cat): blocks Melody until it reacts. */
  readonly blocker?: Phaser.GameObjects.Zone;
  private readonly parts: Phaser.GameObjects.GameObject[] = [];
  private readonly main: Phaser.GameObjects.Image;
  private canopy?: Phaser.GameObjects.Container;

  constructor(
    private readonly scene: Phaser.Scene,
    def: BarkTargetDefinition,
  ) {
    this.def = def;
    this.spec = BARK_TARGET_TYPES[def.kind];
    const { x, y } = def;

    if (def.kind === 'ballInTree') {
      const h = def.height ?? DEFAULT_TREE_HEIGHT;
      const trunk = scene.add.rectangle(x, y, 22, h - 40, 0x6b4520).setOrigin(0.5, 1).setDepth(-2);
      const leaves = scene.add.graphics();
      for (const [dx, dy, r, c] of [[-40, 10, 42, 0x3f8f3a], [38, 8, 40, 0x3f8f3a], [0, -16, 52, 0x4caf50], [-22, 28, 34, 0x4caf50], [26, 30, 32, 0x57b85a]] as const) {
        leaves.fillStyle(c).fillCircle(dx, dy, r);
      }
      this.canopy = scene.add.container(x, y - h + 40, [leaves]).setDepth(-1);
      this.main = scene.add.image(x + 18, y - h + 60, TEXTURES.ball).setDepth(3);
      this.aim = { x: this.main.x, y: this.main.y };
      this.parts.push(trunk, this.canopy);
    } else if (def.kind === 'leafPile') {
      const g = scene.add.graphics().setDepth(6);
      const rng = new Phaser.Math.RandomDataGenerator([`${x},${y}`]);
      for (let i = 0; i < 70; i++) {
        const a = rng.realInRange(0, Math.PI);
        const r = rng.realInRange(0, 1);
        g.fillStyle(rng.pick(LEAF_COLORS)).fillEllipse(x + Math.cos(a) * 50 * r, y - Math.sin(a) * 30 * r, 12, 7);
      }
      this.main = scene.add.image(x, y, TEXTURES.leaf).setVisible(false);
      this.parts.push(g);
      this.aim = { x, y: y - 18 };
    } else {
      this.main = scene.add.image(x, y, TEXTURES.cat).setOrigin(0.5, 1).setDepth(8);
      this.aim = { x, y: y - 24 };
    }

    if (this.spec.solid) {
      const { width, height } = this.spec.solid;
      this.blocker = scene.add.zone(x, y - height / 2, width, height);
      scene.physics.add.existing(this.blocker, true);
    }
  }

  /** A proper (super) bark hit it. `reveal` shows its linked hidden item at a spot. */
  react(direction: number, reveal: (at?: { x: number; y: number }) => void): void {
    if (this.done) return;
    this.done = true;
    if (this.blocker) (this.blocker.body as Phaser.Physics.Arcade.StaticBody).enable = false;

    switch (this.spec.reaction) {
      case 'fall': {
        this.shakeCanopy(4);
        this.leafBurst(this.aim.x, this.aim.y, direction, 10);
        const landY = this.def.y - 12;
        this.scene.tweens.add({
          targets: this.main,
          x: this.main.x + direction * 30,
          y: landY,
          angle: direction * 360,
          duration: 700,
          ease: 'Bounce.easeOut',
          onComplete: () => {
            reveal({ x: this.main.x, y: landY + 2 });
            this.main.destroy();
          },
        });
        break;
      }
      case 'scatter': {
        sfx.play('rustle');
        this.leafBurst(this.def.x, this.def.y - 15, direction, 40);
        for (const p of this.parts) {
          this.scene.tweens.add({ targets: p, alpha: 0, duration: 250, onComplete: () => p.destroy() });
        }
        reveal();
        break;
      }
      case 'flee': {
        sfx.play('meow');
        this.say('MEOW!', '#ffd08a');
        // Leap up in fright, then run off away from Melody.
        this.main.setFlipX(direction > 0);
        this.scene.tweens.chain({
          targets: this.main,
          tweens: [
            { y: this.main.y - 50, x: this.main.x + direction * 40, duration: 220, ease: 'Quad.easeOut' },
            { y: this.def.y, x: this.main.x + direction * 110, duration: 260, ease: 'Quad.easeIn' },
            { x: this.main.x + direction * 900, alpha: 0, duration: 900, ease: 'Quad.easeIn' },
          ],
          onComplete: () => this.main.destroy(),
        });
        reveal();
        break;
      }
    }
  }

  /** An ordinary woof hit it - react a little, so players know to try something bigger. */
  tooQuiet(): void {
    if (this.spec.reaction === 'fall') this.shakeCanopy(1);
    if (this.spec.reaction === 'scatter') this.leafBurst(this.def.x, this.def.y - 20, 1, 4);
    if (this.spec.reaction === 'flee') {
      const x0 = this.main.x;
      this.scene.tweens.add({ targets: this.main, x: x0 + 3, duration: 50, yoyo: true, repeat: 3, onComplete: () => this.main.setX(x0) });
    }
  }

  private shakeCanopy(strength: number): void {
    if (!this.canopy) return;
    const x0 = this.canopy.x;
    this.scene.tweens.add({ targets: this.canopy, x: x0 + 4 * strength, duration: 60, yoyo: true, repeat: 2 + strength, onComplete: () => this.canopy?.setX(x0) });
  }

  private leafBurst(x: number, y: number, direction: number, count: number): void {
    const emitter = this.scene.add.particles(x, y, TEXTURES.leaf, {
      speedX: { min: direction * 60, max: direction * 420 },
      speedY: { min: -320, max: -40 },
      rotate: { min: 0, max: 360 },
      gravityY: 380,
      lifespan: 1400,
      alpha: { start: 1, end: 0 },
      tint: LEAF_COLORS,
      emitting: false,
    });
    emitter.setDepth(30);
    emitter.explode(count);
    this.scene.time.delayedCall(1500, () => emitter.destroy());
  }

  private say(text: string, color: string): void {
    const t = this.scene.add
      .text(this.aim.x, this.aim.y - 30, text, { fontFamily: 'Arial, sans-serif', fontSize: '20px', fontStyle: 'bold', color, stroke: '#3b2412', strokeThickness: 5 })
      .setOrigin(0.5)
      .setDepth(40);
    this.scene.tweens.add({ targets: t, y: t.y - 30, alpha: 0, delay: 500, duration: 700, onComplete: () => t.destroy() });
  }
}
