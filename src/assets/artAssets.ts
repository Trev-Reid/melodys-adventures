import GARDEN_SHEETS_JSON from './gardenSheets.json';

/**
 * Drawn art (not generated placeholders). Images live in public/assets/ and
 * are made by tools/art/make_garden.py. BootScene loads every name listed here.
 */
export const GARDEN_IMAGES = [
  'bg-sky', 'cloud-1', 'cloud-2', 'bg-far', 'bg-trees', 'bg-fence',
  'tile-dirt', 'tile-stone', 'tile-grass-top', 'tile-grass-cap', 'tile-gravel-top', 'tile-wood', 'tile-slab',
  'fx-shadow', 'fx-shade-top', 'fx-sunrays', 'fx-mote', 'fx-vignette',
  'bone',
  'house', 'trampoline', 'stump', 'treehouse', 'treehouse-leaves', 'big-tree', 'big-tree-leaves', 'goal', 'football',
  'egg-chair', 'pot-purple', 'pot-pink', 'bush', 'bush-hydrangea', 'bush-berries', 'planter', 'drain', 'gnome',
  'fern',
  // teamwork things: the hedge the garden door is in, the basket lift
  'hedge-arch', 'basket', 'basket-back', 'pulley',
  // animated (strips of frames - sizes in gardenSheets.json)
  'flowers', 'tall-grass', 'washing-line', 'bird-bath', 'squirrel', 'robin', 'butterfly', 'leaf', 'bird-far',
  // two-state pictures (frame 0 / frame 1, not animated): the garden door, the lever
  'gate', 'lever',
] as const;
export type GardenImage = (typeof GARDEN_IMAGES)[number];

/** Animated garden pictures: frame size (screen px), frame count and default speed. */
export interface SheetInfo {
  frameWidth: number;
  frameHeight: number;
  frames: number;
  fps: number;
  /** Play forwards then backwards (swaying), rather than looping. */
  yoyo: boolean;
}
export const GARDEN_SHEETS = GARDEN_SHEETS_JSON as Record<string, SheetInfo>;

export function isSheet(name: GardenImage): boolean {
  return name in GARDEN_SHEETS;
}

/** Animation key for an animated garden picture (created in BootScene). */
export const gardenAnimKey = (name: GardenImage): string => `garden-anim-${name}`;

export const UI_IMAGES = [
  'heart-full', 'heart-empty', 'badge-sprint', 'badge-strength', 'badge-sniff', 'badge-bark', 'portrait-melody',
] as const;
export type UiImage = (typeof UI_IMAGES)[number];

/** Texture key for a garden image (prefixed so it can't clash with placeholder keys). */
export const gardenKey = (name: GardenImage): string => `garden-${name}`;
export const uiKey = (name: UiImage): string => `ui-${name}`;

export const gardenPath = (name: GardenImage): string => `assets/garden/${name}.png`;
export const uiPath = (name: UiImage): string => `assets/ui/${name}.png`;
