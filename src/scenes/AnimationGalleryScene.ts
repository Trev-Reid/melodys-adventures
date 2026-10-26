import Phaser from 'phaser';
import { SCENES } from './keys';
import { DISPLAY } from '@/config/display';
import { TEXTURES } from '@/assets/keys';
import { MELODY_ANIM_NAMES, MELODY_SHEET, melodyAnimKey, type MelodyAnim, type MelodySkin } from '@/characters/melody/melodyAnimations';
import { BOY_ANIM_NAMES, BOY_SHEET, boyAnimKey, type BoyAnim, type BoySkin } from '@/characters/boy/boyAnimations';

interface Cast {
  title: string;
  texture: string;
  names: string[];
  skins: string[];
  key(name: string, skin: string): string;
  scale: number;
}

const CAST: Cast[] = [
  {
    title: "Melody's animations",
    texture: TEXTURES.melody,
    names: MELODY_ANIM_NAMES,
    skins: MELODY_SHEET.skins.map((s) => s.skin),
    key: (name, skin) => melodyAnimKey(name as MelodyAnim, skin as MelodySkin),
    scale: 1,
  },
  {
    title: "The boy's animations",
    texture: TEXTURES.boy,
    names: BOY_ANIM_NAMES,
    skins: BOY_SHEET.skins.map((s) => s.skin),
    key: (name, skin) => boyAnimKey(name as BoyAnim, skin as BoySkin),
    scale: 1,
  },
];

/**
 * Art review page: every animation of a character playing side by side.
 * Open with  http://localhost:5173/?gallery  (or ?gallery=boy).
 * Click an animation to flip it; F flips all, S switches skin (Melody: normal / buff;
 * the boy: normal / carrying the ball), C switches character.
 */
export class AnimationGalleryScene extends Phaser.Scene {
  constructor() {
    super(SCENES.gallery);
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#87ceeb');
    const wanted = new URLSearchParams(window.location.search).get('gallery');
    let castIndex = wanted === 'boy' ? 1 : 0;
    let skin = 0;
    const objects: Phaser.GameObjects.GameObject[] = [];
    let sprites: Phaser.GameObjects.Sprite[] = [];

    const build = () => {
      objects.forEach((o) => o.destroy());
      objects.length = 0;
      const cast = CAST[castIndex];
      const cols = cast === CAST[0] ? 6 : 7;
      const cellW = DISPLAY.width / cols;
      const top = 44;
      const cellH = (DISPLAY.height - top) / Math.ceil(cast.names.length / cols);
      objects.push(
        this.add
          .text(DISPLAY.width / 2, 16, `${cast.title} (${cast.skins[skin]})  -  click to flip, F flips all, S switches skin, C switches character`, {
            fontFamily: 'Arial, sans-serif', fontSize: '15px', fontStyle: 'bold', color: '#1e3a5f',
          })
          .setOrigin(0.5, 0),
      );
      sprites = cast.names.map((name, i) => {
        const cx = (i % cols) * cellW + cellW / 2;
        const cy = top + Math.floor(i / cols) * cellH;
        const groundY = cy + cellH - 22;
        objects.push(this.add.rectangle(cx, groundY, cellW - 16, 3, 0x4caf50));
        const sprite = this.add.sprite(cx, groundY, cast.texture).setOrigin(0.5, 1).setScale(cast.scale).setInteractive();
        sprite.play({ key: cast.key(name, cast.skins[skin]), repeat: -1, repeatDelay: 400 });
        sprite.on('pointerdown', () => sprite.toggleFlipX());
        objects.push(sprite);
        objects.push(this.add.text(cx, groundY + 4, name, { fontFamily: 'monospace', fontSize: '13px', color: '#1e3a5f' }).setOrigin(0.5, 0));
        return sprite;
      });
    };
    build();

    this.input.keyboard?.on('keydown-F', () => sprites.forEach((s) => s.toggleFlipX()));
    this.input.keyboard?.on('keydown-S', () => {
      skin = (skin + 1) % CAST[castIndex].skins.length;
      build();
    });
    this.input.keyboard?.on('keydown-C', () => {
      castIndex = (castIndex + 1) % CAST.length;
      skin = 0;
      build();
    });
  }
}
