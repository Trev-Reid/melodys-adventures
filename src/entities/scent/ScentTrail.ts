import Phaser from 'phaser';
import type { ScentTrailDefinition } from '@/levels/LevelDefinition';
import { SCENT_TRAIL_STYLE, SCENT_TYPES } from '@/config/scents';
import { TEXTURES } from '@/assets/keys';

/** Depth for scent visuals: above the subdued world, below Melody's text. */
export const SCENT_DEPTH = 12;

/**
 * Draws one scent trail: a faint dotted line plus little scent icons that
 * drift along it towards where it leads. Invisible until shown.
 *
 * This is one possible look (placeholder). The trail's data lives in the
 * level; swapping the visuals means changing only this class or the
 * SCENT_TRAIL_STYLE settings.
 */
export class ScentTrail {
  readonly def: ScentTrailDefinition;
  private readonly path: Phaser.Curves.Path;
  private readonly length: number;
  private readonly dots: Phaser.GameObjects.Graphics;
  private readonly motes: Phaser.GameObjects.Image[] = [];
  private readonly moteGlows: Phaser.GameObjects.Image[] = [];
  private alpha = 0;
  private targetAlpha = 0;
  private clock = 0;

  constructor(scene: Phaser.Scene, def: ScentTrailDefinition) {
    this.def = def;
    const type = SCENT_TYPES[def.scentType];
    const color = def.color ?? type.color;

    const [first, ...rest] = def.points;
    this.path = new Phaser.Curves.Path(first.x, first.y);
    if (rest.length) this.path.splineTo(rest.map((p) => new Phaser.Math.Vector2(p.x, p.y)));
    this.length = this.path.getLength();

    this.dots = scene.add.graphics().setDepth(SCENT_DEPTH).setAlpha(0);
    if (SCENT_TRAIL_STYLE.showDots) {
      const n = Math.max(2, Math.floor(this.length / SCENT_TRAIL_STYLE.dotSpacing));
      for (let i = 0; i <= n; i++) {
        const p = this.path.getPoint(i / n);
        // Fade in from the start so you can tell which way it leads.
        this.dots.fillStyle(color, 0.25 + 0.45 * (i / n)).fillCircle(p.x, p.y, 2 + 1.2 * (i / n));
      }
    }

    const moteCount = Math.max(2, Math.round(this.length / SCENT_TRAIL_STYLE.moteSpacing));
    for (let i = 0; i < moteCount; i++) {
      this.moteGlows.push(scene.add.image(0, 0, TEXTURES.glow).setTint(color).setScale(0.55).setDepth(SCENT_DEPTH).setAlpha(0));
      this.motes.push(scene.add.image(0, 0, type.icon).setDepth(SCENT_DEPTH + 1).setAlpha(0));
    }
  }

  get visible(): boolean {
    return this.targetAlpha > 0;
  }

  setShown(shown: boolean): void {
    this.targetAlpha = shown ? 1 : 0;
  }

  update(dt: number): void {
    const fadeStep = dt / SCENT_TRAIL_STYLE.fadeSeconds;
    this.alpha = this.alpha < this.targetAlpha
      ? Math.min(this.targetAlpha, this.alpha + fadeStep)
      : Math.max(this.targetAlpha, this.alpha - fadeStep);
    this.dots.setAlpha(this.alpha);
    if (this.alpha <= 0) {
      this.motes.forEach((m) => m.setAlpha(0));
      this.moteGlows.forEach((m) => m.setAlpha(0));
      return;
    }

    this.clock += dt;
    const travel = (this.clock * SCENT_TRAIL_STYLE.moteSpeed) / this.length;
    this.motes.forEach((mote, i) => {
      const t = (travel + i / this.motes.length) % 1;
      const p = this.path.getPoint(t);
      const wobble = Math.sin(this.clock * 3 + i * 1.7) * SCENT_TRAIL_STYLE.wobble;
      // Fade in at the start and out at the end of the trail.
      const edge = Math.min(1, t / 0.08, (1 - t) / 0.08);
      mote.setPosition(p.x, p.y - 8 + wobble).setAlpha(this.alpha * edge);
      this.moteGlows[i].setPosition(p.x, p.y - 8 + wobble).setAlpha(this.alpha * edge * 0.8);
    });
  }

  destroy(): void {
    this.dots.destroy();
    this.motes.forEach((m) => m.destroy());
    this.moteGlows.forEach((m) => m.destroy());
  }
}
