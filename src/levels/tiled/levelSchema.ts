/**
 * How a level is laid out in Tiled - the single source of truth used by the
 * map loader, the Playground converter and the Tiled project file generator.
 *
 * A level is a Tiled map with only object layers. Each object's Class says
 * what it is; its custom properties hold the details.
 */
import { COLLECTIBLE_TYPES } from '@/entities/collectibles/collectibleTypes';
import { OBSTACLE_TYPES } from '@/config/obstacles';
import { SCENT_TYPES } from '@/config/scents';
import { DEFAULT_REVEAL_RADIUS } from '@/config/scents';
import { BARK_TARGET_TYPES, DEFAULT_TREE_HEIGHT } from '@/config/barkTargets';
import { DECORATION_TYPES } from '@/config/decorations';
import { LEVEL_THEMES, PLATFORM_STYLES } from '../LevelDefinition';

/** Grid size of level maps (also Tiled's snap grid). Maps are width x height in these units. */
export const MAP_TILE = 8;

export const LAYERS = {
  platforms: 'platforms',
  obstacles: 'obstacles',
  signs: 'signs',
  collectibles: 'collectibles',
  scentTrails: 'scentTrails',
  pointsOfInterest: 'pointsOfInterest',
  barkTargets: 'barkTargets',
  decorations: 'decorations',
  markers: 'markers',
} as const;

export const PLATFORM_CLASSES = ['ground', 'platform'] as const;
export const COLLECTIBLE_CLASSES = Object.keys(COLLECTIBLE_TYPES) as (keyof typeof COLLECTIBLE_TYPES)[];
export const OBSTACLE_CLASSES = Object.keys(OBSTACLE_TYPES) as (keyof typeof OBSTACLE_TYPES)[];
export const SCENT_CLASSES = Object.keys(SCENT_TYPES) as (keyof typeof SCENT_TYPES)[];
export const POI_MARKERS = ['pawPrints', 'none'] as const;
export const BARK_TARGET_CLASSES = Object.keys(BARK_TARGET_TYPES) as (keyof typeof BARK_TARGET_TYPES)[];
export const REVEALED_BY = ['superSniff', 'event'] as const;
export const DECORATION_CLASSES = Object.keys(DECORATION_TYPES) as (keyof typeof DECORATION_TYPES)[];
export const DECORATION_LAYERS = ['back', 'front'] as const;
export { LEVEL_THEMES, PLATFORM_STYLES };

export const CLASS = {
  sign: 'sign',
  scentTrail: 'scentTrail',
  pointOfInterest: 'pointOfInterest',
  spawn: 'spawn',
} as const;

/** Defaults used when a property isn't set on an object. */
export const DEFAULTS = {
  oneWay: false,
  hidden: false,
  requiresSuperSniff: true,
  revealRadius: DEFAULT_REVEAL_RADIUS,
  visibleNormally: false,
  visibleWithSuperSniff: true,
  active: true,
  marker: 'pawPrints',
  revealedBy: 'superSniff',
  treeHeight: DEFAULT_TREE_HEIGHT,
  skyColor: '#87ceeb',
  theme: 'playground',
  scale: 1,
  showDistanceMarkers: false,
} as const;

/** Colours for each class in Tiled, so objects are easy to tell apart. */
export const CLASS_COLORS: Record<string, string> = {
  ground: '#7a4e2d',
  platform: '#c28e56',
  sausage: '#e0453a',
  superSausage: '#ff9d2e',
  sniffTreat: '#9b6bd6',
  squirrelToy: '#9a5a2e',
  heavyCrate: '#4a4f57',
  woodenBarrier: '#b07a42',
  fence: '#d8d0bc',
  crackedBlock: '#d2a46a',
  stoneBlock: '#8a9098',
  sign: '#e9c690',
  scentTrail: '#b98cff',
  pointOfInterest: '#6fd3ff',
  spawn: '#2ecc71',
  barkBiscuit: '#4fc3f7',
  ball: '#c6e03a',
  ballInTree: '#3f8f3a',
  leafPile: '#d9822b',
  cat: '#e08a3c',
  bone: '#f6d873',
  house: '#f3efe4',
  trampoline: '#2c86d8',
  stump: '#8a6240',
  treehouse: '#ab7442',
  bigTree: '#427f2c',
  bush: '#5b9c37',
  fern: '#1f4420',
};
