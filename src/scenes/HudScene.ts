import Phaser from 'phaser';
import { SCENES } from './keys';
import { DISPLAY } from '@/config/display';
import { TEXTURES } from '@/assets/keys';
import { formatTime, type LevelProgress } from '@/gameplay/LevelProgress';
import type { ActiveEffect } from '@/gameplay/effects/StatusEffects';
import type { ComboDefinition, EffectType } from '@/config/powerUps';
import { uiKey, type UiImage } from '@/assets/artAssets';

export interface HudSceneData {
  progress: LevelProgress;
  /** Texture and name of the goal item shown in the counter. */
  goalTexture: string;
  goalPlural: string;
  isMuted: () => boolean;
  /** Active power-ups, for the countdown bars. */
  effects: () => ActiveEffect[];
  combos: () => ComboDefinition[];
  /** Hearts. */
  health: () => { current: number; max: number };
  /** Sprinting right now, and stamina 0..1. */
  sprint: () => { active: boolean; stamina: number };
}

/** The power-up badges, top right, left to right. */
const BADGES: { image: UiImage; label: string; effect?: EffectType; color: number }[] = [
  { image: 'badge-sprint', label: 'Super\nSprint', color: 0x43b6ff },
  { image: 'badge-strength', label: 'Super\nStrength', effect: 'SUPER_STRENGTH', color: 0xff8a43 },
  { image: 'badge-sniff', label: 'Super\nSniff', effect: 'SUPER_SNIFF', color: 0xc86aff },
  { image: 'badge-bark', label: 'Super\nBark', effect: 'SUPER_BARK', color: 0x43e0ff },
];
const BADGE_SIZE = 56;
const BADGE_GAP = 74;

interface BadgeView {
  icon: Phaser.GameObjects.Image;
  label: Phaser.GameObjects.Text;
  seconds: Phaser.GameObjects.Text;
  active: boolean;
}

const TEXT_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: 'Arial, sans-serif',
  fontSize: '26px',
  fontStyle: 'bold',
  color: '#ffffff',
  stroke: '#3b2412',
  strokeThickness: 5,
};

/** Player-facing heads-up display: collectible counter, timer, celebration. */
export class HudScene extends Phaser.Scene {
  private hud!: HudSceneData;
  private counter!: Phaser.GameObjects.Text;
  private icon!: Phaser.GameObjects.Image;
  private timer!: Phaser.GameObjects.Text;
  private muteLabel!: Phaser.GameObjects.Text;
  private lastCount = -1;
  private clock = 0;
  private hearts: Phaser.GameObjects.Image[] = [];
  private lastHealth = '';
  private badges: BadgeView[] = [];
  private rings!: Phaser.GameObjects.Graphics;
  private comboLabel!: Phaser.GameObjects.Text;

  constructor() {
    super(SCENES.hud);
  }

  create(data: HudSceneData): void {
    this.hud = data;
    this.lastCount = -1;
    const right = DISPLAY.width - 16;

    // Top left: Melody, her hearts, what's been found and the clock.
    this.add.image(12, 8, uiKey('portrait-melody')).setOrigin(0, 0);
    this.hearts = [];
    this.lastHealth = '';
    const left = 96;
    this.icon = this.add.image(left + 16, 66, data.goalTexture).setScale(1.3);
    this.counter = this.add.text(left + 40, 51, '', TEXT_STYLE).setOrigin(0, 0);
    this.timer = this.add.text(left + 2, 88, '', { ...TEXT_STYLE, fontSize: '16px', strokeThickness: 4 }).setOrigin(0, 0);

    // Top right: power-up badges.
    this.rings = this.add.graphics();
    this.badges = BADGES.map((b, i) => {
      const x = right - BADGE_SIZE / 2 - (BADGES.length - 1 - i) * BADGE_GAP;
      const icon = this.add.image(x, 12 + BADGE_SIZE / 2, uiKey(b.image)).setDisplaySize(BADGE_SIZE, BADGE_SIZE);
      const label = this.add
        .text(x, 12 + BADGE_SIZE + 4, b.label, { ...TEXT_STYLE, fontSize: '13px', strokeThickness: 3, align: 'center' })
        .setOrigin(0.5, 0);
      const seconds = this.add
        .text(x + BADGE_SIZE / 2 - 2, 10 + BADGE_SIZE, '', { ...TEXT_STYLE, fontSize: '15px', strokeThickness: 4 })
        .setOrigin(1, 1);
      return { icon, label, seconds, active: true };
    });
    this.comboLabel = this.add
      .text(right - (BADGES.length * BADGE_GAP) / 2 + 10, 12 + BADGE_SIZE + 40, '', { ...TEXT_STYLE, fontSize: '16px', color: '#ffd23f', strokeThickness: 4 })
      .setOrigin(0.5, 0);
    this.muteLabel = this.add
      .text(right, DISPLAY.height - 12, 'sound off (M)', { ...TEXT_STYLE, fontSize: '14px', strokeThickness: 3 })
      .setOrigin(1, 1);
  }

  override update(): void {
    const p = this.hud.progress;
    if (p.collected !== this.lastCount) {
      this.counter.setText(`${p.collected} / ${p.total}`);
      if (this.lastCount >= 0) this.bump(this.counter, this.icon);
      this.lastCount = p.collected;
    }
    this.timer.setText(formatTime(p.elapsedMs));
    this.muteLabel.setVisible(this.hud.isMuted());
    this.drawHearts();
    this.drawBadges();
  }

  private drawHearts(): void {
    const h = this.hud.health();
    const key = `${h.current}/${h.max}`;
    if (key === this.lastHealth) return;
    this.lastHealth = key;
    this.hearts.forEach((img) => img.destroy());
    this.hearts = Array.from({ length: h.max }, (_, i) =>
      this.add.image(96 + i * 34, 14, uiKey(i < h.current ? 'heart-full' : 'heart-empty')).setOrigin(0, 0).setScale(1.2),
    );
  }

  /**
   * Badges light up while their power is on, with a ring that runs down as
   * it wears off (Sprint: the ring is her stamina).
   */
  private drawBadges(): void {
    this.clock += this.game.loop.delta / 1000;
    const effects = this.hud.effects();
    const sprint = this.hud.sprint();
    const g = this.rings.clear();

    BADGES.forEach((b, i) => {
      const view = this.badges[i];
      const effect = b.effect ? effects.find((e) => e.type === b.effect) : undefined;
      const active = b.effect ? !!effect : sprint.active;
      const fraction = effect ? effect.remaining / effect.duration : sprint.stamina;
      const warning = !!effect && effect.remaining <= effect.def.warnAtSeconds && Math.floor(this.clock * 8) % 2 === 0;

      if (active !== view.active) {
        view.active = active;
        view.icon.setAlpha(active ? 1 : 0.8);
        if (active) view.icon.clearTint();
        else view.icon.setTint(0x8a8a8a);
        view.label.setAlpha(active ? 1 : 0.7);
        if (active) this.tweens.add({ targets: view.icon, scale: view.icon.scale * 1.25, duration: 120, yoyo: true });
      }
      view.seconds.setText(effect ? `${Math.ceil(effect.remaining)}` : '');

      // Ring: always for sprint stamina (when not full), and while a power is on.
      if (active || (!b.effect && fraction < 0.999)) {
        const x = view.icon.x;
        const y = view.icon.y;
        const r = BADGE_SIZE / 2 + 5;
        g.lineStyle(5, 0x000000, 0.45).strokeCircle(x, y, r);
        g.lineStyle(4, warning ? 0xffffff : b.color, 1);
        g.beginPath();
        g.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0.001, fraction), false);
        g.strokePath();
      }
    });

    const combo = this.hud.combos()[0];
    this.comboLabel.setText(combo ? combo.name : '');
  }

  /** Big "well done" moment. */
  celebrate(): void {
    const p = this.hud.progress;
    const cx = DISPLAY.width / 2;
    const cy = DISPLAY.height / 2;

    const panel = this.add.container(cx, cy).setDepth(100);
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.45).fillRoundedRect(-300, -95, 600, 190, 22);
    const title = this.add
      .text(0, -52, `You found all ${p.total} ${this.hud.goalPlural}!`, { ...TEXT_STYLE, fontSize: '34px', color: '#ffe066' })
      .setOrigin(0.5);
    const time = this.add.text(0, 4, `Time: ${formatTime(p.elapsedMs)}`, TEXT_STYLE).setOrigin(0.5);
    const again = this.add
      .text(0, 52, 'Press R to play again', { ...TEXT_STYLE, fontSize: '20px', strokeThickness: 4 })
      .setOrigin(0.5);
    panel.add([bg, title, time, again]);

    panel.setScale(0.3).setAlpha(0);
    this.tweens.add({ targets: panel, scale: 1, alpha: 1, duration: 450, ease: 'Back.easeOut' });
    this.tweens.add({ targets: again, alpha: 0.35, duration: 600, yoyo: true, repeat: -1, delay: 800 });

    this.confetti();
  }

  private confetti(): void {
    const emitter = this.add.particles(0, -10, TEXTURES.confetti, {
      x: { min: 0, max: DISPLAY.width },
      speedY: { min: 120, max: 320 },
      speedX: { min: -80, max: 80 },
      rotate: { min: 0, max: 360 },
      lifespan: 3200,
      gravityY: 60,
      tint: [0xff595e, 0xffca3a, 0x8ac926, 0x1982c4, 0x6a4c93, 0xffffff],
      quantity: 4,
      frequency: 40,
      emitting: true,
    });
    emitter.setDepth(90);
    this.time.delayedCall(1800, () => emitter.stop());
  }

  private bump(...targets: Phaser.GameObjects.Components.Transform[]): void {
    for (const t of targets) {
      const base = t === this.icon ? 1.5 : 1;
      this.tweens.add({ targets: t, scale: base * 1.3, duration: 90, yoyo: true, onComplete: () => t.setScale(base) });
    }
  }
}
