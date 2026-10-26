import type { GardenImage } from '@/assets/artAssets';

/**
 * Scenery you can place in a level (Tiled layer "decorations"). Most are just
 * pictures; some have solid parts so Melody can stand on them (the stump), the
 * trampoline bounces her, and some bring the garden to life: leaves that sway
 * and fall, butterflies over the flowers, a robin, a squirrel.
 *
 * Positions are relative to where the decoration is placed: its bottom-centre,
 * in screen pixels (x to the right, y up is negative). "Bottom" is the lowest
 * visible pixel of the picture, so empty space below it doesn't matter.
 * If you replace a picture, check its solid parts still line up (e.g. the
 * trampoline's mat): y is how far the surface is above the bottom.
 */
export type DecorationKind =
  | 'house' | 'trampoline' | 'stump' | 'treehouse' | 'bigTree' | 'goal' | 'football' | 'eggChair'
  | 'potPurple' | 'potPink' | 'bush' | 'bushHydrangea' | 'bushBerries' | 'planter' | 'drain' | 'squirrel'
  | 'flowers' | 'fern' | 'tallGrass' | 'washingLine' | 'birdBath' | 'gnome' | 'robin' | 'butterflies';

/** Little animals that live in the garden (see gameplay/ambient/AmbientLife.ts). */
export type CritterKind = 'butterfly' | 'robin' | 'squirrel';

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

export interface DecorationPart {
  /** A picture the same size as the main one, lined up with it. */
  image: GardenImage;
  /** Drawn behind the main picture (e.g. leaves behind the treehouse). */
  behind?: boolean;
  /** Sways side to side: how far (px) and how long one sway takes (seconds). */
  sway?: { x: number; seconds: number };
}

export interface DecorationType {
  /** The picture. Leave it out for decorations that are only creatures (a robin). */
  image?: GardenImage;
  /** 'back' = behind Melody (default). 'front' = in front of everything (foreground leaves). */
  layer: 'back' | 'front';
  solids?: DecorationSolid[];
  /** Extra layers drawn with it, e.g. a tree's leaves that sway in the wind. */
  parts?: DecorationPart[];
  /** Soft shadow on the ground under it: its width as a fraction of the picture. Default 0.7; 0 = none. */
  shadow?: number;
  /** Creatures that live here. `perchY`: how high above the bottom they sit (px). */
  critters?: { kind: CritterKind; count: number; perchY?: number };
  /** Leaves drift down from this area now and then (relative to the bottom-centre, px). */
  leaves?: { x: number; y: number; width: number; height: number };
  /** Ladders in the picture that the boy can climb (left edge, top, size). */
  ladders?: { x: number; y: number; width: number; height: number }[];
  /** Kick or throw the football in here and it's a GOAL! */
  ballZone?: { x: number; y: number; width: number; height: number };
}

const SWAY = { x: 2, seconds: 3.2 };

export const DECORATION_TYPES: Record<DecorationKind, DecorationType> = {
  house: { image: 'house', layer: 'back', shadow: 0.95 },
  trampoline: {
    image: 'trampoline',
    layer: 'back',
    shadow: 0.85,
    solids: [{ x: -108, y: -50, width: 216, height: 14, oneWay: true, bounce: { speed: 900, heldSpeed: 1150 } }],
  },
  stump: { image: 'stump', layer: 'back', shadow: 0.9, solids: [{ x: -44, y: -98, width: 88, height: 98 }] },
  treehouse: {
    image: 'treehouse',
    layer: 'back',
    shadow: 0.45,
    parts: [{ image: 'treehouse-leaves', behind: true, sway: SWAY }],
    leaves: { x: -200, y: -540, width: 400, height: 250 },
    solids: [
      { x: -180, y: -262, width: 352, height: 16, oneWay: true },
      // The railing at the far end, so nobody walks off by accident (jump it to get down).
      { x: -182, y: -300, width: 8, height: 38 },
    ],
    // The ladder up to the deck (only the boy can climb it).
    ladders: [{ x: -90, y: -262, width: 42, height: 262 }],
  },
  bigTree: {
    image: 'big-tree',
    layer: 'back',
    shadow: 0.5,
    parts: [{ image: 'big-tree-leaves', sway: SWAY }],
    leaves: { x: -170, y: -480, width: 340, height: 240 },
  },
  goal: { image: 'goal', layer: 'back', shadow: 0.9, ballZone: { x: -96, y: -104, width: 192, height: 104 } },
  football: { image: 'football', layer: 'back', shadow: 1 },
  eggChair: { image: 'egg-chair', layer: 'back', shadow: 0.8 },
  potPurple: { image: 'pot-purple', layer: 'back', critters: { kind: 'butterfly', count: 1, perchY: -60 } },
  potPink: { image: 'pot-pink', layer: 'back' },
  bush: { image: 'bush', layer: 'back' },
  bushHydrangea: { image: 'bush-hydrangea', layer: 'back', critters: { kind: 'butterfly', count: 1, perchY: -80 } },
  bushBerries: { image: 'bush-berries', layer: 'back' },
  planter: { image: 'planter', layer: 'back' },
  drain: { image: 'drain', layer: 'back', shadow: 0 },
  squirrel: { layer: 'back', critters: { kind: 'squirrel', count: 1 } },
  flowers: { image: 'flowers', layer: 'back', shadow: 0, critters: { kind: 'butterfly', count: 1, perchY: -40 } },
  fern: { image: 'fern', layer: 'front', shadow: 0 },
  tallGrass: { image: 'tall-grass', layer: 'back', shadow: 0 },
  washingLine: { image: 'washing-line', layer: 'back', shadow: 0 },
  birdBath: { image: 'bird-bath', layer: 'back', shadow: 0.7, critters: { kind: 'robin', count: 1, perchY: -64 } },
  gnome: { image: 'gnome', layer: 'back', shadow: 0.9 },
  robin: { layer: 'back', critters: { kind: 'robin', count: 1 } },
  butterflies: { layer: 'back', critters: { kind: 'butterfly', count: 3, perchY: -50 } },
};
