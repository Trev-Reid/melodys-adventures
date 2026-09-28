import Phaser from 'phaser';
import { SCENES } from './keys';
import { createPlaceholderTextures } from '@/assets/placeholders';
import { MELODY_SHEET, createMelodyAnimations } from '@/characters/melody/melodyAnimations';
import { DEFAULT_LEVEL_KEY, getLevel } from '@/levels';
import { DISPLAY } from '@/config/display';
import type { LevelSceneData } from './LevelScene';

/**
 * Loads everything the game needs (Melody's sprite sheet; generated
 * placeholders for the rest), then starts the first level.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENES.boot);
  }

  preload(): void {
    for (const { texture, path } of MELODY_SHEET.skins) {
      this.load.spritesheet(texture, path, {
        frameWidth: MELODY_SHEET.frameWidth,
        frameHeight: MELODY_SHEET.frameHeight,
        spacing: MELODY_SHEET.spacing,
      });
    }
  }

  create(): void {
    // Pixel art: keep hard edges when scaled.
    for (const { texture } of MELODY_SHEET.skins) {
      this.textures.get(texture).setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
    createMelodyAnimations(this);
    createPlaceholderTextures(this);
    // http://localhost:5173/?gallery shows every animation instead of the game.
    if (new URLSearchParams(window.location.search).has('gallery')) {
      this.scene.start(SCENES.gallery);
      return;
    }

    // http://localhost:5173/?level=my-level plays src/levels/maps/my-level.tmj
    const requested = new URLSearchParams(window.location.search).get('level');
    const levelKey = requested ? requested.replace(/^.*[\\/]/, '').replace(/\.tmj$/, '') : DEFAULT_LEVEL_KEY;
    try {
      getLevel(levelKey);
    } catch (e) {
      this.showError(e as Error);
      return;
    }
    const data: LevelSceneData = { levelKey };
    this.scene.start(SCENES.level, data);
  }

  /** A level that won't load shows what's wrong instead of a blank screen. */
  private showError(error: Error): void {
    this.cameras.main.setBackgroundColor('#2b1d3a');
    this.add
      .text(24, 24, `Oops - the level can't be loaded.\n\n${error.message}\n\nFix the map in Tiled, save, and the game will reload.`, {
        fontFamily: 'monospace',
        fontSize: '15px',
        color: '#ffe8a3',
        wordWrap: { width: DISPLAY.width - 48 },
        lineSpacing: 4,
      });
  }
}
