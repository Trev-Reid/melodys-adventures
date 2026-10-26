/**
 * The rules every picture in the game is checked against (npm run art:check).
 * The house style is in .claude/skills/melody-art-director/references/; this
 * file is the part of it a computer can check.
 *
 * Each PNG gets the first rule whose `match` fits its path.
 */
import type { ArtRole } from '../../src/assets/placeholderSpecs';

export type AlphaMode = 'cutout' | 'soft' | 'opaque';

export interface AssetRule {
  /** Path from the project folder; * matches any part of one file or folder name. */
  match: string;
  role: ArtRole;
  /**
   * 'cutout': hard edges - every pixel fully see-through or fully solid
   *           (plus at most `glassLevels` flat see-through amounts, for a net or glass).
   * 'soft':   light, shadow and glow effects - any transparency.
   * 'opaque': fills its whole rectangle (ground tiles, the sky).
   */
  alpha: AlphaMode;
  /** One art pixel is this many screen pixels across (the house style is 2). */
  grid: number;
  /** More colours than this is a warning: pixel art uses a few, on purpose. */
  maxColours: number;
  /** Repeats sideways ('x') or both ways ('xy') in the game: check it joins up with itself. */
  tiles?: 'x' | 'xy';
  /** The joins are drawn on purpose (a gap between paving slabs) - don't look for a seam. */
  noSeamCheck?: boolean;
  /** Exact size the game relies on (code places it with fixed offsets). */
  size?: { width?: number; height?: number; why: string };
  /** Flat semi-transparent levels allowed in a cutout (a goal net, a window). */
  glassLevels?: number;
}

/** Garden / UI / sprite rules. Most specific first. */
export const ASSET_RULES: AssetRule[] = [
  // Confirmed v2 art direction: per-file palette budgets only; all physical checks retained.
  { match: 'public/assets/garden/house.png', role: 'prop', alpha: 'cutout', grid: 2, maxColours: 128 },
  { match: 'public/assets/garden/treehouse.png', role: 'prop', alpha: 'cutout', grid: 2, maxColours: 128 },
  { match: 'public/assets/garden/bg-far.png', role: 'background', alpha: 'cutout', grid: 2, maxColours: 96, tiles: 'x' },
  { match: 'public/assets/garden/bg-trees.png', role: 'background', alpha: 'cutout', grid: 2, maxColours: 96, tiles: 'x' },
  { match: 'public/assets/garden/bg-fence.png', role: 'background', alpha: 'cutout', grid: 2, maxColours: 96, tiles: 'x' },
  { match: 'public/assets/garden/big-tree.png', role: 'prop', alpha: 'cutout', grid: 2, maxColours: 64 },
  { match: 'public/assets/garden/big-tree-leaves.png', role: 'prop', alpha: 'cutout', grid: 2, maxColours: 64 },
  { match: 'public/assets/garden/treehouse-leaves.png', role: 'prop', alpha: 'cutout', grid: 2, maxColours: 64 },
  { match: 'public/assets/garden/bush-berries.png', role: 'prop', alpha: 'cutout', grid: 2, maxColours: 64 },
  { match: 'public/assets/garden/bush-hydrangea.png', role: 'prop', alpha: 'cutout', grid: 2, maxColours: 64 },
  { match: 'public/assets/garden/egg-chair.png', role: 'prop', alpha: 'cutout', grid: 2, maxColours: 64 },
  { match: 'public/assets/garden/trampoline.png', role: 'prop', alpha: 'cutout', grid: 2, maxColours: 64 },
  { match: 'public/assets/garden/stump.png', role: 'prop', alpha: 'cutout', grid: 2, maxColours: 64 },
  { match: 'public/assets/garden/tile-stone.png', role: 'tile', alpha: 'opaque', grid: 2, maxColours: 32, tiles: 'xy' },
  { match: 'public/assets/garden/tile-dirt.png', role: 'tile', alpha: 'opaque', grid: 2, maxColours: 32, tiles: 'xy' },
  // Sky: a dithered gradient stretched over the whole screen.
  { match: 'public/assets/garden/bg-sky.png', role: 'background', alpha: 'opaque', grid: 2, maxColours: Infinity },
  // Scenery layers that scroll behind the garden: repeat sideways forever.
  { match: 'public/assets/garden/bg-*.png', role: 'background', alpha: 'cutout', grid: 2, maxColours: 40, tiles: 'x' },
  { match: 'public/assets/garden/cloud-*.png', role: 'background', alpha: 'cutout', grid: 2, maxColours: 8 },
  { match: 'public/assets/garden/bird-far.png', role: 'background', alpha: 'cutout', grid: 2, maxColours: 4 },
  // Ground: fills that repeat both ways, and edges laid along the top.
  { match: 'public/assets/garden/tile-slab.png', role: 'tile', alpha: 'opaque', grid: 2, maxColours: 16, tiles: 'x', noSeamCheck: true },
  { match: 'public/assets/garden/tile-wood.png', role: 'tile', alpha: 'opaque', grid: 2, maxColours: 16, tiles: 'x', noSeamCheck: true },
  {
    match: 'public/assets/garden/tile-grass-top.png', role: 'tile', alpha: 'cutout', grid: 2, maxColours: 16, tiles: 'x',
    size: { height: 36, why: 'LevelBuilder lays it 8px above the ground surface (STYLE_ART offset)' },
  },
  {
    match: 'public/assets/garden/tile-gravel-top.png', role: 'tile', alpha: 'cutout', grid: 2, maxColours: 16, tiles: 'x',
    size: { height: 20, why: 'LevelBuilder lays it 4px above the ground surface (STYLE_ART offset)' },
  },
  {
    match: 'public/assets/garden/tile-grass-cap.png', role: 'tile', alpha: 'cutout', grid: 2, maxColours: 16,
    size: { width: 20, height: 60, why: 'LevelBuilder places it 6px out from the platform end and 10px up' },
  },
  // Light, shadow and air: soft on purpose.
  { match: 'public/assets/garden/fx-*.png', role: 'fx', alpha: 'soft', grid: 2, maxColours: Infinity },
  // Things to collect.
  { match: 'public/assets/garden/bone.png', role: 'item', alpha: 'cutout', grid: 2, maxColours: 16 },
  { match: 'public/assets/garden/football.png', role: 'item', alpha: 'cutout', grid: 2, maxColours: 16 },
  // The goal's net is see-through (one flat level), on purpose.
  { match: 'public/assets/garden/goal.png', role: 'prop', alpha: 'cutout', grid: 2, maxColours: 48, glassLevels: 1 },
  // Everything else in the garden: props and creatures.
  { match: 'public/assets/garden/*.png', role: 'prop', alpha: 'cutout', grid: 2, maxColours: 48 },
  { match: 'public/assets/ui/*.png', role: 'ui', alpha: 'cutout', grid: 2, maxColours: 40 },
  { match: 'public/assets/sprites/*.png', role: 'character', alpha: 'cutout', grid: 2, maxColours: 32 },
];

/** Colour budget, by role, for pictures with no rule of their own (replacements, files checked with --as). */
export const ROLE_DEFAULTS: Record<ArtRole, Omit<AssetRule, 'match' | 'role'>> = {
  background: { alpha: 'cutout', grid: 2, maxColours: 40 },
  tile: { alpha: 'opaque', grid: 2, maxColours: 16 },
  prop: { alpha: 'cutout', grid: 2, maxColours: 48 },
  character: { alpha: 'cutout', grid: 2, maxColours: 32 },
  item: { alpha: 'cutout', grid: 2, maxColours: 16 },
  fx: { alpha: 'soft', grid: 2, maxColours: Infinity },
  ui: { alpha: 'cutout', grid: 2, maxColours: 40 },
};

/** Check ids, so a waiver can switch off particular checks for one file. */
export type CheckId =
  | 'decode' | 'profile' | 'size' | 'grid' | 'alpha' | 'background' | 'colours' | 'seam' | 'sheet' | 'feet'
  | 'parts' | 'solids' | 'missing' | 'unused' | 'replacement' | 'filesize' | 'scale';

export interface Waiver {
  file: string;
  checks: CheckId[];
  /** Why it's allowed - shown in every report so it isn't forgotten. */
  reason: string;
}

/**
 * Pictures allowed to break particular rules, and why. Keep this list short:
 * every entry is a picture that doesn't match the rest of the game yet.
 */
export const WAIVERS: Waiver[] = [];

/** Limits that apply to everything. */
export const LIMITS = {
  /** Biggest picture side that works on every computer and tablet (px). */
  maxSide: 4096,
  /** Bigger than this is a warning: it slows loading and uses graphics memory. */
  warnSide: 2048,
  /** File size warning (bytes). */
  warnBytes: 1_000_000,
  /** Off-grid share above this is an error (a little is a warning). */
  gridError: 0.02,
  /** Colours vs merged colours above this (with more than mergeMinColours colours) = noisy, blurry or painted art. */
  noiseRatio: 3,
  noiseMinColours: 32,
  /** A seam whose join is this many times stronger than the picture's normal edges. */
  seamRatio: 3,
  /** A decoration's solid surface should have art under at least this share of its width. */
  solidCoverage: 0.6,
};

/** Character sheets: which animations have every frame standing on the ground. */
export const GROUNDED_ANIMATIONS = ['idle', 'walk', 'sniff', 'alert', 'happy', 'scared', 'sit', 'sit_idle', 'lie_down', 'sleep', 'bark', 'wake', 'land'];
