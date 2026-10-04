/**
 * Drawn art (not generated placeholders). Images live in public/assets/ and
 * are made by tools/art/make_garden.py. BootScene loads every name listed here.
 */
export const GARDEN_IMAGES = [
  'bg-sky', 'cloud-1', 'cloud-2', 'bg-far', 'bg-trees', 'bg-fence',
  'tile-dirt', 'tile-stone', 'tile-grass-top', 'tile-gravel-top', 'tile-wood', 'tile-slab',
  'bone',
  'house', 'trampoline', 'stump', 'treehouse', 'big-tree', 'goal', 'football', 'egg-chair',
  'pot-purple', 'pot-pink', 'bush', 'bush-hydrangea', 'bush-berries', 'planter', 'drain', 'squirrel',
  'flowers', 'fern',
] as const;
export type GardenImage = (typeof GARDEN_IMAGES)[number];

export const UI_IMAGES = [
  'heart-full', 'heart-empty', 'badge-sprint', 'badge-strength', 'badge-sniff', 'badge-bark', 'portrait-melody',
] as const;
export type UiImage = (typeof UI_IMAGES)[number];

/** Texture key for a garden image (prefixed so it can't clash with placeholder keys). */
export const gardenKey = (name: GardenImage): string => `garden-${name}`;
export const uiKey = (name: UiImage): string => `ui-${name}`;

export const gardenPath = (name: GardenImage): string => `assets/garden/${name}.png`;
export const uiPath = (name: UiImage): string => `assets/ui/${name}.png`;
