import type Phaser from 'phaser';
import { TEXTURES } from '@/assets/keys';
import sheet from './boySheet.json';

/**
 * The boy's sprite sheets. Frame size, animations, skins and where his hands
 * hold the football in each frame come from boySheet.json, which
 * tools/sprites/make_boy.py writes alongside the PNGs. Every skin has the
 * same layout: 'carry' is him holding the football in both hands.
 */
export type BoySkin = keyof typeof sheet.variants;
export type BoyAnim = keyof typeof sheet.animations;

const SKIN_TEXTURES: Record<BoySkin, string> = {
  normal: TEXTURES.boy,
  carry: TEXTURES.boyCarry,
};

export const BOY_SHEET = {
  frameWidth: sheet.frameWidth,
  frameHeight: sheet.frameHeight,
  spacing: sheet.spacing,
  skins: (Object.keys(sheet.variants) as BoySkin[]).map((skin) => ({
    skin,
    texture: SKIN_TEXTURES[skin],
    path: sheet.variants[skin],
  })),
} as const;

export const BOY_ANIM_NAMES = Object.keys(sheet.animations) as BoyAnim[];

export const boyAnimKey = (anim: BoyAnim, skin: BoySkin = 'normal') => (skin === 'normal' ? `boy-${anim}` : `boy-${skin}-${anim}`);

/** The first sheet frame of an animation (to hold a pose, e.g. on the ladder). */
export const boyFrames = (anim: BoyAnim): number[] => sheet.animations[anim].frames;

/**
 * Where the held football goes in a sheet frame: px from his feet (the
 * frame's bottom-centre), x forwards, y up is negative.
 */
export function ballAnchor(skin: BoySkin, frame: number): { x: number; y: number } {
  const a = sheet.ball[skin][frame] ?? sheet.ball[skin][0];
  return { x: a[0], y: a[1] };
}

/** Register all of the boy's animations, for every skin (once, in BootScene). */
export function createBoyAnimations(scene: Phaser.Scene): void {
  for (const { skin, texture } of BOY_SHEET.skins) {
    for (const name of BOY_ANIM_NAMES) {
      const def = sheet.animations[name];
      const key = boyAnimKey(name, skin);
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
