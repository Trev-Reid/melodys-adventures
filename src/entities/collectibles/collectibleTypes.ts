import { TEXTURES } from '@/assets/keys';
import type { SoundName } from '@/core/audio/Sfx';
import type { EffectType } from '@/config/powerUps';
import type { CollectibleKind } from '@/levels/LevelDefinition';

/**
 * What each kind of collectible is. Adding bones, woozies or the squirrel toy
 * means adding a kind to LevelDefinition's CollectibleKind and an entry here.
 */
export interface CollectibleType {
  texture: string;
  /** Plural name used on screen, e.g. "sausages". */
  plural: string;
  /** Does collecting all of these complete the level? */
  countsTowardGoal: boolean;
  sound: SoundName;
  /** Status effect applied when collected (power-ups). */
  effect?: EffectType;
  /** Comes back this many seconds after being collected (so power-ups can be reused). */
  respawnSeconds?: number;
  /** Colour of a pulsing glow behind the item. */
  glow?: number;
  /** Words that pop up when it's collected. */
  pickupText?: string;
  /** A special find: big message, and Melody stops to celebrate. */
  celebrate?: { text: string; anim: string; seconds: number };
}

export const COLLECTIBLE_TYPES: Record<CollectibleKind, CollectibleType> = {
  sausage: {
    texture: TEXTURES.sausage,
    plural: 'sausages',
    countsTowardGoal: true,
    sound: 'collect',
    pickupText: '+1',
  },
  superSausage: {
    texture: TEXTURES.superSausage,
    plural: 'super sausages',
    countsTowardGoal: false,
    sound: 'powerup',
    effect: 'SUPER_STRENGTH',
    respawnSeconds: 10,
    glow: 0xffb347,
  },
  sniffTreat: {
    texture: TEXTURES.sniffTreat,
    plural: 'sniff treats',
    countsTowardGoal: false,
    sound: 'powerup',
    effect: 'SUPER_SNIFF',
    respawnSeconds: 10,
    glow: 0xb98cff,
  },
  squirrelToy: {
    texture: TEXTURES.squirrelToy,
    plural: 'squirrels',
    countsTowardGoal: false,
    sound: 'celebrate',
    celebrate: { text: 'You found Squirrel!', anim: 'happy', seconds: 1.6 },
  },
  barkBiscuit: {
    texture: TEXTURES.barkBiscuit,
    plural: 'bark biscuits',
    countsTowardGoal: false,
    sound: 'powerup',
    effect: 'SUPER_BARK',
    respawnSeconds: 10,
    glow: 0x4fc3f7,
  },
  ball: {
    texture: TEXTURES.ball,
    plural: 'balls',
    countsTowardGoal: false,
    sound: 'celebrate',
    celebrate: { text: 'Got your ball!', anim: 'happy', seconds: 1.2 },
  },
};
