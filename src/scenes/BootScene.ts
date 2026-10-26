import Phaser from 'phaser';
import { SCENES } from './keys';
import { createPlaceholderTextures } from '@/assets/placeholders';
import { MELODY_SHEET, createMelodyAnimations } from '@/characters/melody/melodyAnimations';
import { BOY_SHEET, createBoyAnimations } from '@/characters/boy/boyAnimations';
import { DEFAULT_LEVEL_KEY, getLevel } from '@/levels';
import { DISPLAY } from '@/config/display';
import { AUDIO } from '@/config/audio';
import { sfx, type SoundName } from '@/core/audio/Sfx';
import { GARDEN_IMAGES, GARDEN_SHEETS, UI_IMAGES, gardenAnimKey, gardenKey, gardenPath, isSheet, uiKey, uiPath } from '@/assets/artAssets';
import { REPLACEMENT_ART, replacementWarnings } from '@/assets/artReplacements';
import { requestedShot, startReview, type ReviewShot } from '@/review/review';

/** Any recorded sounds in src/assets/audio (e.g. bark.mp3) - see the README there. */
const SOUND_FILES = import.meta.glob<string>('../assets/audio/*.{mp3,ogg,wav,m4a}', {
  eager: true,
  query: '?url',
  import: 'default',
});
import type { LevelSceneData } from './LevelScene';

/**
 * Loads everything the game needs (Melody's sprite sheet, the garden art,
 * any replacement art in src/assets/replacements; generated placeholders for
 * the rest), then starts the first level.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENES.boot);
  }

  preload(): void {
    for (const [path, url] of Object.entries(SOUND_FILES)) {
      const name = path.replace(/^.*\//, '').replace(/\.[^.]+$/, '');
      this.load.audio(`sample-${name}`, url);
    }
    for (const name of GARDEN_IMAGES) {
      const sheet = GARDEN_SHEETS[name];
      if (sheet) this.load.spritesheet(gardenKey(name), gardenPath(name), { frameWidth: sheet.frameWidth, frameHeight: sheet.frameHeight });
      else this.load.image(gardenKey(name), gardenPath(name));
    }
    for (const name of UI_IMAGES) this.load.image(uiKey(name), uiPath(name));
    // Real art for placeholders: loaded first, so placeholders.ts skips drawing those.
    for (const { key, url } of REPLACEMENT_ART) this.load.image(key, url);
    for (const { texture, path } of MELODY_SHEET.skins) {
      this.load.spritesheet(texture, path, {
        frameWidth: MELODY_SHEET.frameWidth,
        frameHeight: MELODY_SHEET.frameHeight,
        spacing: MELODY_SHEET.spacing,
      });
    }
    for (const { texture, path } of BOY_SHEET.skins) {
      this.load.spritesheet(texture, path, { frameWidth: BOY_SHEET.frameWidth, frameHeight: BOY_SHEET.frameHeight, spacing: BOY_SHEET.spacing });
    }
  }

  create(): void {
    // Pixel art: keep hard edges when scaled.
    for (const { texture } of [...MELODY_SHEET.skins, ...BOY_SHEET.skins]) {
      this.textures.get(texture).setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
    for (const key of [...GARDEN_IMAGES.map(gardenKey), ...UI_IMAGES.map(uiKey), ...REPLACEMENT_ART.map((r) => r.key)]) {
      this.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
    }
    if (import.meta.env.DEV && REPLACEMENT_ART.length) {
      console.info(`Own art instead of placeholders: ${REPLACEMENT_ART.map((r) => r.key).join(', ')}`);
      const size = (key: string) => {
        const src = this.textures.exists(key) ? this.textures.get(key).getSourceImage() : undefined;
        return src ? { width: src.width, height: src.height } : undefined;
      };
      for (const w of replacementWarnings(size)) console.warn(w);
    }
    // Animated garden pictures (swaying flowers, flapping washing, the robin...).
    for (const name of GARDEN_IMAGES) {
      if (!isSheet(name) || this.anims.exists(gardenAnimKey(name))) continue;
      const sheet = GARDEN_SHEETS[name];
      this.anims.create({
        key: gardenAnimKey(name),
        frames: this.anims.generateFrameNumbers(gardenKey(name), { start: 0, end: sheet.frames - 1 }),
        frameRate: sheet.fps,
        repeat: -1,
        yoyo: sheet.yoyo,
      });
    }
    createMelodyAnimations(this);
    createBoyAnimations(this);
    this.registerRecordedSounds();
    createPlaceholderTextures(this);
    // http://localhost:5173/?gallery shows every animation instead of the game.
    if (new URLSearchParams(window.location.search).has('gallery')) {
      this.scene.start(SCENES.gallery);
      return;
    }

    // http://localhost:5173/?review=garden-house sets up a screen for art review (src/review/shots.json).
    let shot: ReviewShot | undefined;
    try {
      shot = requestedShot();
    } catch (e) {
      this.showError(e as Error);
      window.__review = { shot: '', ready: false, error: (e as Error).message, advance: () => undefined, capture: async () => '' };
      return;
    }

    // http://localhost:5173/?level=my-level plays src/levels/maps/my-level.tmj
    const requested = shot?.level ?? new URLSearchParams(window.location.search).get('level');
    const levelKey = requested ? requested.replace(/^.*[\\/]/, '').replace(/\.tmj$/, '') : DEFAULT_LEVEL_KEY;
    try {
      getLevel(levelKey);
    } catch (e) {
      this.showError(e as Error);
      return;
    }
    const data: LevelSceneData = { levelKey };
    // From here a review shot runs frame by frame, the same way every time.
    if (shot) startReview(this.game, shot);
    this.scene.start(SCENES.level, data);
  }

  /** Recorded sounds replace the synthesized ones of the same name. */
  private registerRecordedSounds(): void {
    for (const path of Object.keys(SOUND_FILES)) {
      const name = path.replace(/^.*\//, '').replace(/\.[^.]+$/, '') as SoundName;
      const key = `sample-${name}`;
      if (!this.cache.audio.exists(key)) continue;
      sfx.useSample(name, () => this.sound.play(key, { volume: AUDIO.volume * 2 }));
      if (name === 'bark') {
        // SUPER BARK: the same bark, louder and deeper.
        sfx.useSample('superBark', () => this.sound.play(key, { volume: Math.min(1, AUDIO.volume * 3), rate: 0.8 }));
      }
    }
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
