import Phaser from 'phaser';
import { gardenKey } from '@/assets/artAssets';
import { FOOTBALL } from '@/config/teamwork';

/** Who has the ball (if anyone). */
export type BallHolder = 'boy' | 'melody';

/**
 * The football: the boy picks it up and throws it (it knocks things out of
 * trees), and Melody fetches it back. Bounces and rolls with real physics
 * when nobody's holding it.
 */
export class Football extends Phaser.Physics.Arcade.Image {
  declare body: Phaser.Physics.Arcade.Body;
  readonly home: { x: number; y: number };
  holder?: BallHolder;
  /** Thrown by the boy and not picked up since: Melody wants to fetch it. */
  fetchable = false;
  /** Seconds it's been lying still. */
  stillFor = 0;
  /** Where it was last frame (to catch things it flew past). */
  readonly last = { x: 0, y: 0 };

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y - FOOTBALL.radius, gardenKey('football'));
    this.home = { x, y: y - FOOTBALL.radius };
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setDepth(6);
    const r = FOOTBALL.radius;
    this.body.setCircle(r, this.width / 2 - r, this.height / 2 - r);
    this.body.setGravityY(FOOTBALL.gravity);
    this.body.setBounce(FOOTBALL.bounce, FOOTBALL.bounce);
    this.body.setCollideWorldBounds(true);
    this.body.setMaxVelocity(1200, 1400);
    this.last.x = this.x;
    this.last.y = this.y;
  }

  get loose(): boolean {
    return !this.holder;
  }

  get resting(): boolean {
    return this.loose && this.body.blocked.down && Math.abs(this.body.velocity.x) < 12;
  }

  /** Someone picks it up: it stops being physical and follows them. */
  pickUp(by: BallHolder): void {
    this.holder = by;
    this.fetchable = false;
    this.stillFor = 0;
    this.body.stop();
    this.body.enable = false;
    this.setDepth(by === 'melody' ? 10.5 : 9.5);
  }

  /** Let go of it at a spot, moving at a speed (a throw, or just dropping it). */
  release(x: number, y: number, vx: number, vy: number, thrown: boolean): void {
    this.holder = undefined;
    this.body.enable = true;
    this.body.reset(x, y);
    this.body.setVelocity(vx, vy);
    this.fetchable = thrown;
    this.stillFor = 0;
    this.last.x = x;
    this.last.y = y;
    this.setDepth(6);
  }

  /** Back where it started (it got lost somewhere). */
  goHome(): void {
    this.release(this.home.x, this.home.y, 0, 0, false);
  }

  /** Call every frame. `hold` = where it's being held, if someone has it. */
  tick(dt: number, hold?: { x: number; y: number }): void {
    this.last.x = this.x;
    this.last.y = this.y;
    if (hold) {
      this.setPosition(hold.x, hold.y);
      return;
    }
    const b = this.body;
    // Rolls to a stop on the ground; flies freely through the air.
    b.setDragX(b.blocked.down ? FOOTBALL.rollDrag : 0);
    this.rotation += (b.velocity.x / FOOTBALL.radius) * dt;
    this.stillFor = this.resting ? this.stillFor + dt : 0;
  }
}
