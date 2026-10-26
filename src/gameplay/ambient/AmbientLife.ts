import Phaser from 'phaser';
import { gardenAnimKey, gardenKey } from '@/assets/artAssets';
import type { CritterSpawn, LeafArea } from '@/levels/LevelBuilder';
import { AMBIENT } from '@/config/ambient';

/** Where Melody (and the boy) are, so creatures can get out of the way. */
export interface Mover {
  x: number;
  /** Where their feet are. */
  y: number;
  /** How fast they're going (px/s) - running at things scares them sooner. */
  speed: number;
}

const ROBIN_FRAME = { idle: 0, peck: 1, hop: 2 } as const;

const dist = (ax: number, ay: number, bx: number, by: number) => Math.hypot(ax - bx, ay - by);

/** Is anyone close enough to scare this creature? Returns the nearest one if so. */
function threat(x: number, y: number, movers: Mover[], calm: number, alarmed: number): Mover | undefined {
  let nearest: Mover | undefined;
  let best = Number.POSITIVE_INFINITY;
  for (const m of movers) {
    const d = dist(x, y, m.x, m.y - 20);
    const range = m.speed > 200 ? alarmed : calm;
    if (d < range && d < best) {
      best = d;
      nearest = m;
    }
  }
  return nearest;
}

/** A butterfly flitting about near its flower, fluttering off when someone comes close. */
class Butterfly {
  readonly sprite: Phaser.GameObjects.Sprite;
  private t = Math.random() * 100;
  private readonly phase = [Math.random() * 6, Math.random() * 6, Math.random() * 6];
  private fleeing = 0;
  private vx = 0;
  private vy = 0;

  constructor(
    scene: Phaser.Scene,
    private readonly homeX: number,
    private readonly homeY: number,
  ) {
    this.sprite = scene.add.sprite(homeX, homeY, gardenKey('butterfly')).setDepth(12);
    this.sprite.setTint(Phaser.Utils.Array.GetRandom(AMBIENT.butterflyColours));
    this.sprite.play({ key: gardenAnimKey('butterfly'), startFrame: Phaser.Math.Between(0, 3) });
  }

  update(dt: number, movers: Mover[]): void {
    this.t += dt;
    const s = this.sprite;
    const scary = threat(s.x, s.y, movers, AMBIENT.butterflyScareDistance, AMBIENT.butterflyScareDistance * 1.6);
    if (scary && this.fleeing <= 0) {
      this.fleeing = 2.2;
      const away = Math.sign(s.x - scary.x) || 1;
      this.vx = away * Phaser.Math.Between(70, 110);
      this.vy = -Phaser.Math.Between(50, 90);
      s.anims.timeScale = 1.8;
    }
    if (this.fleeing > 0) {
      this.fleeing -= dt;
      s.x += this.vx * dt;
      s.y += (this.vy + Math.sin(this.t * 9) * 40) * dt;
      s.setFlipX(this.vx < 0);
      if (this.fleeing <= 0) s.anims.timeScale = 1;
      return;
    }
    // Wander in loops around home (and drift back if it fled).
    const [a, b, c] = this.phase;
    const tx = this.homeX + Math.cos(this.t * 0.9 + a) * 28 + Math.cos(this.t * 2.3 + b) * 9;
    const ty = this.homeY + Math.sin(this.t * 1.3 + c) * 14 + Math.sin(this.t * 3.1) * 5;
    const k = Math.min(1, dt * 2.5);
    const nx = s.x + (tx - s.x) * k;
    s.setFlipX(nx < s.x);
    s.setPosition(nx, s.y + (ty - s.y) * k);
  }
}

type RobinState = 'ground' | 'flying' | 'gone' | 'arriving';

/** A robin hopping and pecking about, flying off if Melody runs at it (or barks!). */
class Robin {
  readonly sprite: Phaser.GameObjects.Sprite;
  private state: RobinState = 'ground';
  private timer = Phaser.Math.FloatBetween(0.5, 2);
  private action: 'none' | 'peck' | 'hop' = 'none';
  private actionTime = 0;
  private hopFrom = 0;
  private hopTo = 0;
  private vx = 0;
  private vy = 0;

  constructor(
    scene: Phaser.Scene,
    private readonly homeX: number,
    private readonly homeY: number,
  ) {
    this.sprite = scene.add.sprite(homeX, homeY, gardenKey('robin'), ROBIN_FRAME.idle).setOrigin(0.5, 1).setDepth(8);
    if (!scene.anims.exists('robin-fly')) {
      scene.anims.create({
        key: 'robin-fly',
        frames: scene.anims.generateFrameNumbers(gardenKey('robin'), { frames: [3, 4] }),
        frameRate: 12,
        repeat: -1,
      });
    }
    this.sprite.setFlipX(Math.random() < 0.5);
  }

  /** Off it goes! */
  scare(fromX: number): void {
    if (this.state !== 'ground' && this.state !== 'arriving') return;
    this.state = 'flying';
    this.timer = 2.2;
    const away = Math.sign(this.sprite.x - fromX) || 1;
    this.vx = away * Phaser.Math.Between(140, 190);
    this.vy = -Phaser.Math.Between(90, 140);
    this.sprite.setFlipX(away < 0).play('robin-fly');
  }

  update(dt: number, movers: Mover[]): void {
    const s = this.sprite;
    switch (this.state) {
      case 'ground': {
        const scary = threat(s.x, s.y, movers, AMBIENT.robinScareDistance, AMBIENT.robinScareDistance * 1.6);
        if (scary) return this.scare(scary.x);
        this.behave(dt);
        return;
      }
      case 'flying':
        this.timer -= dt;
        this.vy -= 60 * dt;
        s.x += this.vx * dt;
        s.y += this.vy * dt;
        if (this.timer < 0.6) s.setAlpha(Math.max(0, this.timer / 0.6));
        if (this.timer <= 0) {
          this.state = 'gone';
          s.setVisible(false);
          this.timer = Phaser.Math.FloatBetween(AMBIENT.robinAwaySeconds * 0.7, AMBIENT.robinAwaySeconds * 1.3);
        }
        return;
      case 'gone':
        this.timer -= dt;
        // Only comes back when the coast is clear.
        if (this.timer <= 0 && !threat(this.homeX, this.homeY, movers, 320, 320)) {
          this.state = 'arriving';
          const from = Math.random() < 0.5 ? -1 : 1;
          s.setPosition(this.homeX + from * 160, this.homeY - 140).setAlpha(1).setVisible(true).setFlipX(from > 0).play('robin-fly');
          this.timer = 1.1;
        }
        return;
      case 'arriving': {
        this.timer -= dt;
        const k = Math.min(1, dt * 3);
        s.x += (this.homeX - s.x) * k;
        s.y += (this.homeY - s.y) * k;
        if (this.timer <= 0) {
          s.setPosition(this.homeX, this.homeY).stop().setFrame(ROBIN_FRAME.idle);
          this.state = 'ground';
          this.timer = 1;
        }
        return;
      }
    }
  }

  /** Little robin things: peck, hop, look the other way. */
  private behave(dt: number): void {
    const s = this.sprite;
    if (this.action === 'peck') {
      this.actionTime += dt;
      s.setFrame(Math.floor(this.actionTime / 0.14) % 2 === 0 ? ROBIN_FRAME.peck : ROBIN_FRAME.idle);
      if (this.actionTime > 0.56) this.action = 'none';
      return;
    }
    if (this.action === 'hop') {
      this.actionTime += dt;
      const t = Math.min(1, this.actionTime / 0.22);
      s.x = this.hopFrom + (this.hopTo - this.hopFrom) * t;
      s.y = this.homeY - Math.sin(t * Math.PI) * 6;
      s.setFrame(t < 1 ? ROBIN_FRAME.hop : ROBIN_FRAME.idle);
      if (t >= 1) this.action = 'none';
      return;
    }
    this.timer -= dt;
    if (this.timer > 0) return;
    this.timer = Phaser.Math.FloatBetween(0.6, 2.2);
    const roll = Math.random();
    if (roll < 0.45) {
      this.action = 'peck';
      this.actionTime = 0;
    } else if (roll < 0.8) {
      // hop a little way, staying near home
      const dir = Math.abs(s.x - this.homeX) > 24 ? Math.sign(this.homeX - s.x) : Math.random() < 0.5 ? -1 : 1;
      this.action = 'hop';
      this.actionTime = 0;
      this.hopFrom = s.x;
      this.hopTo = s.x + dir * Phaser.Math.Between(8, 16);
      s.setFlipX(dir < 0);
    } else {
      s.setFlipX(!s.flipX);
    }
  }
}

/** The squirrel: sits flicking its tail, scampers off if Melody gets close, comes back later. */
class Squirrel {
  readonly sprite: Phaser.GameObjects.Sprite;
  private state: 'sitting' | 'running' | 'gone' = 'sitting';
  private timer = 2;
  private vx = 0;

  constructor(
    scene: Phaser.Scene,
    private readonly homeX: number,
    private readonly homeY: number,
  ) {
    this.sprite = scene.add.sprite(homeX, homeY, gardenKey('squirrel'), 0).setOrigin(0.5, 1).setDepth(8);
    if (!scene.anims.exists('squirrel-flick')) {
      scene.anims.create({ key: 'squirrel-flick', frames: scene.anims.generateFrameNumbers(gardenKey('squirrel'), { frames: [0, 1, 2, 1, 0] }), frameRate: 12 });
      scene.anims.create({ key: 'squirrel-run', frames: scene.anims.generateFrameNumbers(gardenKey('squirrel'), { frames: [3, 4] }), frameRate: 12, repeat: -1 });
    }
  }

  scare(fromX: number): void {
    if (this.state !== 'sitting') return;
    this.state = 'running';
    this.timer = 0.9;
    const away = Math.sign(this.sprite.x - fromX) || 1;
    this.vx = away * 230;
    this.sprite.setFlipX(away < 0).play('squirrel-run');
  }

  update(dt: number, movers: Mover[]): void {
    const s = this.sprite;
    if (this.state === 'sitting') {
      const scary = threat(s.x, s.y, movers, AMBIENT.squirrelScareDistance, AMBIENT.squirrelScareDistance * 1.5);
      if (scary) return this.scare(scary.x);
      this.timer -= dt;
      if (this.timer <= 0) {
        this.timer = Phaser.Math.FloatBetween(1.5, 4);
        s.play('squirrel-flick');
        if (Math.random() < 0.3) s.setFlipX(!s.flipX);
      }
    } else if (this.state === 'running') {
      this.timer -= dt;
      s.x += this.vx * dt;
      s.setAlpha(Math.max(0, this.timer / 0.9));
      if (this.timer <= 0) {
        this.state = 'gone';
        s.setVisible(false);
        this.timer = AMBIENT.squirrelAwaySeconds;
      }
    } else {
      this.timer -= dt;
      if (this.timer <= 0 && !threat(this.homeX, this.homeY, movers, 350, 350)) {
        this.state = 'sitting';
        s.setPosition(this.homeX, this.homeY).setVisible(true).stop().setFrame(0);
        s.scene.tweens.add({ targets: s, alpha: 1, duration: 500 });
        this.timer = 2;
      }
    }
  }
}

/** A leaf drifting down from a tree, swaying side to side. */
interface Leaf {
  sprite: Phaser.GameObjects.Sprite;
  x: number;
  vy: number;
  t: number;
  groundY: number;
}

/**
 * The garden's wildlife and weather: butterflies, robins, the squirrel and
 * falling leaves. All just for looks - they never get in Melody's way.
 */
export class AmbientLife {
  private readonly butterflies: Butterfly[] = [];
  private readonly robins: Robin[] = [];
  private readonly squirrels: Squirrel[] = [];
  private readonly leaves: Leaf[] = [];
  private readonly leafTimers: number[];

  constructor(
    private readonly scene: Phaser.Scene,
    critters: CritterSpawn[],
    private readonly leafAreas: LeafArea[],
  ) {
    for (const c of critters) {
      if (c.kind === 'butterfly') this.butterflies.push(new Butterfly(scene, c.x, c.y));
      else if (c.kind === 'robin') this.robins.push(new Robin(scene, c.x, c.y));
      else this.squirrels.push(new Squirrel(scene, c.x, c.y));
    }
    this.leafTimers = leafAreas.map(() => Math.random() * AMBIENT.leafEverySeconds);
  }

  update(dt: number, movers: Mover[]): void {
    for (const b of this.butterflies) b.update(dt, movers);
    for (const r of this.robins) r.update(dt, movers);
    for (const s of this.squirrels) s.update(dt, movers);
    this.updateLeaves(dt);
  }

  /** A bark scares everything within range. */
  scare(x: number, y: number, range: number): void {
    for (const r of this.robins) if (dist(x, y, r.sprite.x, r.sprite.y) < range) r.scare(x);
    for (const s of this.squirrels) if (dist(x, y, s.sprite.x, s.sprite.y) < range) s.scare(x);
  }

  private updateLeaves(dt: number): void {
    const cam = this.scene.cameras.main.worldView;
    this.leafAreas.forEach((area, i) => {
      this.leafTimers[i] -= dt;
      if (this.leafTimers[i] > 0) return;
      this.leafTimers[i] = AMBIENT.leafEverySeconds * Phaser.Math.FloatBetween(0.5, 1.5);
      // Only bother when the tree is near the screen.
      if (area.x > cam.right + 200 || area.x + area.width < cam.left - 200) return;
      const x = area.x + Math.random() * area.width;
      const y = area.y + Math.random() * area.height * 0.6;
      const sprite = this.scene.add
        .sprite(x, y, gardenKey('leaf'))
        .setDepth(Math.random() < 0.35 ? 11 : -5.5)
        .setTint(Phaser.Utils.Array.GetRandom(AMBIENT.leafColours));
      sprite.play({ key: gardenAnimKey('leaf'), startFrame: Phaser.Math.Between(0, 3) });
      sprite.anims.timeScale = Phaser.Math.FloatBetween(0.6, 1.3);
      this.leaves.push({ sprite, x, vy: Phaser.Math.Between(26, 42), t: Math.random() * 6, groundY: area.groundY });
    });
    for (let i = this.leaves.length - 1; i >= 0; i--) {
      const l = this.leaves[i];
      l.t += dt;
      l.sprite.y += l.vy * dt;
      l.sprite.x = l.x + Math.sin(l.t * 1.7) * 16;
      l.x -= 6 * dt; // a light breeze
      const left = l.groundY - l.sprite.y;
      if (left < 20) l.sprite.setAlpha(Math.max(0, left / 20));
      if (left <= 0) {
        l.sprite.destroy();
        this.leaves.splice(i, 1);
      }
    }
  }
}
