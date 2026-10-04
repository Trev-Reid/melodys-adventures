import type { GardenImage } from '@/assets/artAssets';

/**
 * Scenery you can place in a level (Tiled layer "decorations"). Most are just
 * pictures; some have solid parts so Melody can stand on them (the stump), and
 * the trampoline bounces her.
 *
 * Positions are relative to where the decoration is placed: its bottom-centre,
 * in screen pixels (x to the right, y up is negative).
 */
export type DecorationKind =
  | 'house' | 'trampoline' | 'stump' | 'treehouse' | 'bigTree' | 'goal' | 'football' | 'eggChair'
  | 'potPurple' | 'potPink' | 'bush' | 'bushHydrangea' | 'bushBerries' | 'planter' | 'drain' | 'squirrel'
  | 'flowers' | 'fern';

export interface DecorationSolid {
  /** Left edge and top edge, relative to the decoration's bottom-centre. */
  x: number;
  y: number;
  width: number;
  height: number;
  /** Can be jumped up through from below (like a platform). */
  oneWay?: boolean;
  /** Bounces her up on landing: speed in px/s (her jump is 620), and when jump is held. */
  bounce?: { speed: number; heldSpeed: number };
}

export interface DecorationType {
  image: GardenImage;
  /** 'back' = behind Melody (default). 'front' = in front of everything (foreground leaves). */
  layer: 'back' | 'front';
  solids?: DecorationSolid[];
}

export const DECORATION_TYPES: Record<DecorationKind, DecorationType> = {
  house: { image: 'house', layer: 'back' },
  trampoline: {
    image: 'trampoline',
    layer: 'back',
    solids: [{ x: -108, y: -66, width: 216, height: 14, oneWay: true, bounce: { speed: 900, heldSpeed: 1150 } }],
  },
  stump: { image: 'stump', layer: 'back', solids: [{ x: -44, y: -98, width: 88, height: 98 }] },
  treehouse: {
    image: 'treehouse',
    layer: 'back',
    solids: [{ x: -180, y: -262, width: 352, height: 16, oneWay: true }],
  },
  bigTree: { image: 'big-tree', layer: 'back' },
  goal: { image: 'goal', layer: 'back' },
  football: { image: 'football', layer: 'back' },
  eggChair: { image: 'egg-chair', layer: 'back' },
  potPurple: { image: 'pot-purple', layer: 'back' },
  potPink: { image: 'pot-pink', layer: 'back' },
  bush: { image: 'bush', layer: 'back' },
  bushHydrangea: { image: 'bush-hydrangea', layer: 'back' },
  bushBerries: { image: 'bush-berries', layer: 'back' },
  planter: { image: 'planter', layer: 'back' },
  drain: { image: 'drain', layer: 'back' },
  squirrel: { image: 'squirrel', layer: 'back' },
  flowers: { image: 'flowers', layer: 'back' },
  fern: { image: 'fern', layer: 'front' },
};
