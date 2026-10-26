import Phaser from 'phaser';

/**
 * A little label over the boy's head saying what his action button does
 * right now - [A] Open, [A] Pull, [A] Throw, [↑ ↓] Climb - so nobody has to
 * guess. Shows the keyboard key or controller button, whichever is in use.
 */
export class ActionPrompt {
  private readonly container: Phaser.GameObjects.Container;
  private readonly bg: Phaser.GameObjects.Graphics;
  private readonly key: Phaser.GameObjects.Text;
  private readonly word: Phaser.GameObjects.Text;
  private shown = '';
  private clock = 0;

  constructor(private readonly scene: Phaser.Scene) {
    const style = { fontFamily: 'Arial, sans-serif', fontStyle: 'bold' };
    this.bg = scene.add.graphics();
    this.key = scene.add.text(0, 0, '', { ...style, fontSize: '14px', color: '#3b2412' }).setOrigin(0.5, 0.5);
    this.word = scene.add.text(0, 0, '', { ...style, fontSize: '15px', color: '#ffffff' }).setOrigin(0, 0.5);
    this.container = scene.add.container(0, 0, [this.bg, this.key, this.word]).setDepth(41).setVisible(false);
  }

  /** Show `button` + `word` centred above (x, y). */
  show(button: string, word: string, x: number, y: number, dt: number): void {
    const text = `${button}|${word}`;
    if (text !== this.shown) {
      this.shown = text;
      this.key.setText(button);
      this.word.setText(word);
      const keyW = Math.max(22, this.key.width + 10);
      const w = keyW + 8 + this.word.width + 12;
      const h = 26;
      this.bg
        .clear()
        .fillStyle(0x1b2a1f, 0.82)
        .fillRoundedRect(-w / 2, -h / 2, w, h, 9)
        .fillStyle(0xffe066, 1)
        .fillRoundedRect(-w / 2 + 4, -h / 2 + 4, keyW, h - 8, 5)
        .fillStyle(0xc9a23a, 1)
        .fillRect(-w / 2 + 6, h / 2 - 6, keyW - 4, 2);
      this.key.setPosition(-w / 2 + 4 + keyW / 2, 0);
      this.word.setPosition(-w / 2 + 4 + keyW + 8, 0);
      if (!this.container.visible) {
        this.container.setVisible(true).setScale(0.6).setAlpha(0);
        this.scene.tweens.add({ targets: this.container, scale: 1, alpha: 1, duration: 160, ease: 'Back.easeOut' });
      }
    }
    this.clock += dt;
    this.container.setPosition(x, y + Math.sin(this.clock * 4) * 2);
  }

  hide(): void {
    if (!this.container.visible) return;
    this.shown = '';
    this.container.setVisible(false);
  }
}
