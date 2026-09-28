import Phaser from 'phaser';
import { SCENES } from './keys';
import { DISPLAY } from '@/config/display';
import { TEXTURES } from '@/assets/keys';
import { formatTime, type LevelProgress } from '@/gameplay/LevelProgress';
import type { ActiveEffect } from '@/gameplay/effects/StatusEffects';
import type { ComboDefinition } from '@/config/powerUps';

export interface HudSceneData {
  progress: LevelProgress;
  /** Texture and name of the goal item shown in the counter. */
  goalTexture: string;
  goalPlural: string;
  isMuted: () => boolean;
  /** Active power-ups, for the countdown bars. */
  effects: () => ActiveEffect[];
  combos: () => ComboDefinition[];
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
  private effectBars!: Phaser.GameObjects.Graphics;
  private effectLabels: Phaser.GameObjects.Text[] = [];
  private clock = 0;

  constructor() {
    super(SCENES.hud);
  }

  create(data: HudSceneData): void {
    this.hud = data;
    this.lastCount = -1;
    const right = DISPLAY.width - 16;

    this.counter = this.add.text(right, 14, '', TEXT_STYLE).setOrigin(1, 0);
    this.icon = this.add.image(0, 30, data.goalTexture).setScale(1.5);
    this.timer = this.add.text(right, 50, '', { ...TEXT_STYLE, fontSize: '18px', strokeThickness: 4 }).setOrigin(1, 0);
    this.muteLabel = this.add
      .text(right, DISPLAY.height - 12, 'sound off (M)', { ...TEXT_STYLE, fontSize: '14px', strokeThickness: 3 })
      .setOrigin(1, 1);
    this.effectBars = this.add.graphics();
    this.effectLabels = [];
  }

  override update(): void {
    const p = this.hud.progress;
    if (p.collected !== this.lastCount) {
      this.counter.setText(`${p.collected} / ${p.total}`);
      this.icon.setX(this.counter.x - this.counter.width - 28);
      if (this.lastCount >= 0) this.bump(this.counter, this.icon);
      this.lastCount = p.collected;
    }
    this.timer.setText(formatTime(p.elapsedMs));
    this.muteLabel.setVisible(this.hud.isMuted());
    this.drawEffects();
  }

  /** Countdown bar for each active power-up, top centre. */
  private drawEffects(): void {
    this.clock += this.game.loop.delta / 1000;
    const effects = this.hud.effects();
    const combo = this.hud.combos()[0];
    const g = this.effectBars.clear();
    const w = 260;
    const x = DISPLAY.width / 2 - w / 2;

    effects.forEach((e, i) => {
      const y = 14 + i * 40;
      const warning = e.remaining <= e.def.warnAtSeconds && Math.floor(this.clock * 8) % 2 === 0;
      const color = combo?.color ?? e.def.color;
      g.fillStyle(0x000000, 0.45).fillRoundedRect(x - 4, y - 4, w + 8, 34, 8);
      g.fillStyle(0x3b2412, 1).fillRoundedRect(x, y + 16, w, 10, 5);
      g.fillStyle(warning ? 0xffffff : color, 1).fillRoundedRect(x, y + 16, Math.max(6, (w * e.remaining) / e.duration), 10, 5);

      let label = this.effectLabels[i];
      if (!label) {
        label = this.add.text(DISPLAY.width / 2, y - 2, '', { ...TEXT_STYLE, fontSize: '15px', strokeThickness: 4 }).setOrigin(0.5, 0);
        this.effectLabels[i] = label;
      }
      label.setText(`${combo ? combo.name : e.def.label}  ${Math.ceil(e.remaining)}s`).setVisible(true);
    });
    for (let i = effects.length; i < this.effectLabels.length; i++) this.effectLabels[i].setVisible(false);
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
