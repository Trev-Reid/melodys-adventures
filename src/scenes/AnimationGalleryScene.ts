import Phaser from 'phaser';
import { SCENES } from './keys';
import { DISPLAY } from '@/config/display';
import { TEXTURES } from '@/assets/keys';
import { MELODY_ANIM_NAMES, MELODY_SHEET, melodyAnimKey, type MelodySkin } from '@/characters/melody/melodyAnimations';

/**
 * Art review page: every one of Melody's animations playing side by side.
 * Open with  http://localhost:5173/?gallery
 * Click an animation to flip it; press F to flip all, S to switch skin (normal / buff).
 */
export class AnimationGalleryScene extends Phaser.Scene {
  constructor() {
    super(SCENES.gallery);
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#87ceeb');
    const cols = 6;
    const cellW = DISPLAY.width / cols;
    const top = 44;
    const cellH = (DISPLAY.height - top) / Math.ceil(MELODY_ANIM_NAMES.length / cols);

    this.add
      .text(DISPLAY.width / 2, 16, "Melody's animations  -  click to flip, F flips all, S switches skin", {
        fontFamily: 'Arial, sans-serif', fontSize: '16px', fontStyle: 'bold', color: '#1e3a5f',
      })
      .setOrigin(0.5, 0);

    const sprites: Phaser.GameObjects.Sprite[] = [];
    MELODY_ANIM_NAMES.forEach((name, i) => {
      const cx = (i % cols) * cellW + cellW / 2;
      const cy = top + Math.floor(i / cols) * cellH;
      const groundY = cy + cellH - 22;
      this.add.rectangle(cx, groundY, cellW - 16, 3, 0x4caf50);
      const sprite = this.add.sprite(cx, groundY, TEXTURES.melody).setOrigin(0.5, 1).setInteractive();
      sprite.play({ key: melodyAnimKey(name), repeat: -1, repeatDelay: 400 });
      sprite.on('pointerdown', () => sprite.toggleFlipX());
      sprites.push(sprite);
      this.add
        .text(cx, groundY + 4, name, { fontFamily: 'monospace', fontSize: '13px', color: '#1e3a5f' })
        .setOrigin(0.5, 0);
    });

    this.input.keyboard?.on('keydown-F', () => sprites.forEach((s) => s.toggleFlipX()));

    const skins = MELODY_SHEET.skins.map((s) => s.skin);
    let skin: MelodySkin = 'normal';
    this.input.keyboard?.on('keydown-S', () => {
      skin = skins[(skins.indexOf(skin) + 1) % skins.length];
      sprites.forEach((s, i) => s.play({ key: melodyAnimKey(MELODY_ANIM_NAMES[i], skin), repeat: -1, repeatDelay: 400 }));
    });
  }
}
