import Phaser from 'phaser';
import { OBSTACLE_TYPES, type ObstacleKind, type ObstacleType } from '@/config/obstacles';
import type { ObstacleDefinition } from '@/levels/LevelDefinition';
import { ensureObstacleTexture } from '@/assets/placeholders';
import { TEXTURES } from '@/assets/keys';

/** Gravity for pushable objects (matches Melody's rising gravity). */
const OBJECT_GRAVITY = 1500;

/**
 * A heavy crate, barrier, fence... Behaviour comes entirely from its
 * ObstacleType (config/obstacles.ts); ObstacleSystem handles interactions.
 */
export class Obstacle extends Phaser.GameObjects.Image {
  declare body: Phaser.Physics.Arcade.Body | Phaser.Physics.Arcade.StaticBody;
  readonly kind: ObstacleKind;
  readonly spec: ObstacleType;
  hits = 0;
  broken = false;
  /** Game time (ms) of the last hit, for the hit cooldown. */
  lastHitAt = Number.NEGATIVE_INFINITY;
  /** Set while Melody is shoving it. */
  pushDir = 0;
  pushTimer = 0;
  private cracks?: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, def: ObstacleDefinition) {
    const type = OBSTACLE_TYPES[def.type];
    const key = ensureObstacleTexture(scene, def.type, type);
    super(scene, def.x + type.width / 2, def.y + type.height / 2, key);
    this.kind = def.type;
    this.spec = type;
    scene.add.existing(this);
    this.setDepth(4);

    if (type.pushable) {
      scene.physics.add.existing(this, false);
      const body = this.body as Phaser.Physics.Arcade.Body;
      body.pushable = false;             // only a strong Melody moves it (see ObstacleSystem)
      body.setGravityY(OBJECT_GRAVITY);
      body.setCollideWorldBounds(true);
      body.setMaxVelocity(1000, 900);
    } else {
      scene.physics.add.existing(this, true);
    }
  }

  get isPushable(): boolean {
    return !!this.spec.pushable;
  }

  get isBreakable(): boolean {
    return !!this.spec.breakable;
  }

  /** BARK BREAK: can a bark smash it? */
  get isBarkBreakable(): boolean {
    return !!this.spec.barkBreakable;
  }

  /** Not loud enough: a little shudder. */
  shudder(): void {
    const x0 = this.x;
    this.scene.tweens.killTweensOf(this);
    this.scene.tweens.add({ targets: this, x: x0 + 3, duration: 35, yoyo: true, repeat: 3, onComplete: () => this.setX(x0) });
  }

  /** A hit that didn't break it yet: crack and wobble. */
  crack(): void {
    if (!this.cracks) this.cracks = this.scene.add.graphics().setDepth(this.depth + 1);
    const g = this.cracks;
    const b = this.getBounds();
    g.lineStyle(3, 0x2b1a0e, 0.9);
    let x = b.centerX + Phaser.Math.Between(-8, 8);
    let y = b.top + Phaser.Math.Between(10, b.height * 0.3);
    g.beginPath();
    g.moveTo(x, y);
    for (let i = 0; i < 5; i++) {
      x = Phaser.Math.Clamp(x + Phaser.Math.Between(-12, 12), b.left + 4, b.right - 4);
      y = Math.min(b.bottom - 4, y + Phaser.Math.Between(14, 30));
      g.lineTo(x, y);
    }
    g.strokePath();

    const x0 = this.x;
    this.scene.tweens.add({ targets: this, x: x0 + 4, duration: 40, yoyo: true, repeat: 3, onComplete: () => this.setX(x0) });
  }

  /** Smash it to bits. */
  smash(direction: number): void {
    if (this.broken) return;
    this.broken = true;
    this.scene.tweens.killTweensOf(this);
    const b = this.getBounds();
    const colors =
      this.spec.look === 'fence' ? [0xf1ead8, 0xcfc4a8]
      : this.spec.look === 'cracked' ? [0xd2a46a, 0xb07f47, 0x8a6238]
      : this.spec.look === 'stone' ? [0x9aa0a8, 0x7c828a, 0xb9bec5]
      : [0xb07a42, 0x8a5a2b, 0xd7a468];
    const emitter = this.scene.add.particles(0, 0, TEXTURES.debris, {
      x: { min: b.left, max: b.right },
      y: { min: b.top, max: b.bottom },
      speedX: { min: direction * 60, max: direction * 420 },
      speedY: { min: -420, max: -80 },
      rotate: { min: 0, max: 720 },
      scale: { min: 0.8, max: 2.2 },
      gravityY: 1100,
      lifespan: 1100,
      tint: colors,
      emitting: false,
    });
    emitter.setDepth(30);
    emitter.explode(26);
    this.scene.time.delayedCall(1300, () => emitter.destroy());

    this.cracks?.destroy();
    (this.body as Phaser.Physics.Arcade.StaticBody).enable = false;
    this.destroy();
  }
}
