import type Phaser from 'phaser';
import { TEXTURES } from '@/assets/keys';
import sheet from './melodySheet.json';

/**
 * Melody's sprite sheets. Frame size, animation list and the available
 * "skins" (normal, buff...) come from melodySheet.json, which
 * tools/sprites/make_melody.py writes alongside the PNGs - so regenerating
 * the art can never leave them out of sync. Every skin has the same layout.
 */
export type MelodySkin = keyof typeof sheet.variants;
export type MelodyAnim = keyof typeof sheet.animations;

const SKIN_TEXTURES: Record<MelodySkin, string> = {
  normal: TEXTURES.melody,
  buff: TEXTURES.melodyBuff,
};

export const MELODY_SHEET = {
  frameWidth: sheet.frameWidth,
  frameHeight: sheet.frameHeight,
  spacing: sheet.spacing,
  skins: (Object.keys(sheet.variants) as MelodySkin[]).map((skin) => ({
    skin,
    texture: SKIN_TEXTURES[skin],
    path: sheet.variants[skin],
  })),
} as const;

export const MELODY_ANIM_NAMES = Object.keys(sheet.animations) as MelodyAnim[];

export function isMelodySkin(skin: string | undefined): skin is MelodySkin {
  return !!skin && skin in sheet.variants;
}

export const melodyAnimKey = (anim: MelodyAnim, skin: MelodySkin = 'normal') =>
  skin === 'normal' ? `melody-${anim}` : `melody-${skin}-${anim}`;

/** Register all of Melody's animations, for every skin (once, in BootScene). */
export function createMelodyAnimations(scene: Phaser.Scene): void {
  for (const { skin, texture } of MELODY_SHEET.skins) {
    for (const name of MELODY_ANIM_NAMES) {
      const def = sheet.animations[name];
      const key = melodyAnimKey(name, skin);
      if (scene.anims.exists(key)) continue;
      scene.anims.create({
        key,
        frames: scene.anims.generateFrameNumbers(texture, { frames: def.frames }),
        frameRate: def.frameRate,
        repeat: def.repeat,
      });
    }
  }
}
