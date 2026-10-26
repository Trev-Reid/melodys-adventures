import Phaser from 'phaser';
import { gardenKey } from '@/assets/artAssets';
import { LIFT } from '@/config/teamwork';
import type { InteractableDefinition } from '@/levels/LevelDefinition';

/** Where the pulley picture's wheel is: from its left edge, and from its top (px). */
const WHEEL = { x: 60, y: 24, radius: 10 };
/** The pulley picture's height (its post stands at the top stop). */
const PULLEY_HEIGHT = 168;
/** Where the rope ties on to the basket handle, above the floor (px). */
const HANDLE_Y = 76;

/**
 * A basket on a rope, hung from a pulley: a lift between two heights. A lever
 * sends it up or down; anyone standing in it rides along. Melody can't climb,
 * so this is how she gets up to the treehouse.
 */
export class Lift {
  readonly id: string;
  readonly x: number;
  /** Floor height (its top) at the bottom and top stops. */
  readonly bottomY: number;
  readonly topY: number;
  goingUp: boolean;
  /** The basket floor: you stand on it, and can only land on it from above. */
  readonly floor: Phaser.GameObjects.Zone;
  private readonly back: Phaser.GameObjects.Image;
  private readonly front: Phaser.GameObjects.Image;
  private readonly rope: Phaser.GameObjects.Graphics;
  private wasMoving = false;
  /** Called when it sets off and when it stops (for sounds). */
  onMove?: (moving: boolean) => void;

  constructor(scene: Phaser.Scene, def: InteractableDefinition) {
    this.id = def.id ?? '';
    this.x = def.x;
    this.bottomY = def.y;
    this.topY = def.y - (def.travel ?? 200);
    this.goingUp = !!def.startsUp;
    const startY = this.goingUp ? this.topY : this.bottomY;

    scene.add
      .image(def.x - WHEEL.x, this.topY, gardenKey('pulley'))
      .setOrigin(0, 1)
      .setDepth(-5);
    this.rope = scene.add.graphics().setDepth(-4.9);
    this.back = scene.add.image(def.x, startY + 4, gardenKey('basket-back')).setOrigin(0.5, 1).setDepth(8);
    this.front = scene.add.image(def.x, startY + 4, gardenKey('basket')).setOrigin(0.5, 1).setDepth(11);

    this.floor = scene.add.zone(def.x - LIFT.width / 2, startY, LIFT.width, 12).setOrigin(0, 0);
    scene.physics.add.existing(this.floor, false);
    const body = this.floor.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setImmovable(true);
    body.pushable = false;
    // Like a platform you can jump up through: only solid from above.
    body.checkCollision.down = false;
    body.checkCollision.left = false;
    body.checkCollision.right = false;
    this.drawRope(startY);
  }

  private get body(): Phaser.Physics.Arcade.Body {
    return this.floor.body as Phaser.Physics.Arcade.Body;
  }

  /** Where the floor is now (its top). */
  get floorY(): number {
    return this.body.y;
  }

  get moving(): boolean {
    return this.wasMoving;
  }

  /** Send it the other way. */
  toggle(): void {
    this.goingUp = !this.goingUp;
  }

  /** Steer towards the stop it's heading for. Call every frame. */
  update(): void {
    const body = this.body;
    const target = this.goingUp ? this.topY : this.bottomY;
    const moving = Math.abs(target - body.y) > 3;
    if (moving) body.setVelocityY(Math.sign(target - body.y) * LIFT.speed);
    else if (body.y !== target || body.velocity.y !== 0) body.reset(this.floor.x, target); // settle exactly at the stop
    if (moving !== this.wasMoving) {
      this.wasMoving = moving;
      this.onMove?.(moving);
    }
    this.back.y = body.y + 4;
    this.front.y = body.y + 4;
    this.drawRope(body.y);
  }

  /** Is this body standing in the basket? */
  holds(b: Phaser.Physics.Arcade.Body): boolean {
    const floor = this.body;
    return Math.abs(b.center.x - (floor.x + floor.width / 2)) <= floor.width / 2 && Math.abs(b.bottom - floor.y) <= 6;
  }

  private drawRope(floorY: number): void {
    const wheelBottom = this.topY - PULLEY_HEIGHT + WHEEL.y + WHEEL.radius;
    this.rope
      .clear()
      .lineStyle(2, 0xd8c49a, 1)
      .lineBetween(this.x, wheelBottom, this.x, floorY - HANDLE_Y + 4)
      .lineStyle(1, 0xa08a60, 1)
      .lineBetween(this.x + 1, wheelBottom, this.x + 1, floorY - HANDLE_Y + 4);
  }
}
