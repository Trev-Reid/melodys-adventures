import type { ObstacleKind } from '@/config/obstacles';
import type { ScentType } from '@/config/scents';

/**
 * Levels are plain data. The LevelBuilder turns this into game objects, so new
 * levels (the house, the garden, the park...) are mostly new data files.
 *
 * Levels are made in Tiled (src/levels/maps/*.tmj) and converted into this
 * format by levels/tiled/loadTiledLevel.ts - the rest of the game only ever
 * sees a LevelDefinition.
 */
export type PlatformKind = 'ground' | 'platform';

export interface PlatformDefinition {
  /** Top-left corner, in world pixels. */
  x: number;
  y: number;
  width: number;
  /** Defaults to 24 for 'platform', required-ish for 'ground'. */
  height?: number;
  kind: PlatformKind;
  /** Can be jumped up through from below and landed on from above. */
  oneWay?: boolean;
}

export type CollectibleKind = 'sausage' | 'superSausage' | 'sniffTreat' | 'squirrelToy';

/**
 * Makes something hidden until Melody's nose finds it. Reusable for bones,
 * toys, secret entrances, footprints, buried items, switches...
 */
export interface DetectableSpec {
  /** Needs the 'superSniff' capability to find (default true). */
  requiresSuperSniff?: boolean;
  /** How close she must be (px). Default in config/scents.ts. */
  revealRadius?: number;
}

/** A scent trail: data, not drawing. Rendered by entities/scent/ScentTrail. */
export interface ScentTrailDefinition {
  id: string;
  scentType: ScentType;
  /** What the trail leads to (a collectible or point-of-interest id), if anything. */
  targetId?: string;
  /** From where it starts to where it leads (the target end). World pixels. */
  points: { x: number; y: number }[];
  /** Visible without any special senses (default false). */
  visibleNormally?: boolean;
  /** Visible while SUPER SNIFF is active (default true). */
  visibleWithSuperSniff?: boolean;
  /** Override the scent type's colour. */
  color?: number;
  /** Inactive trails never show (default true) - e.g. switch on after an event. */
  active?: boolean;
}

/** A spot in the world with something to discover (text for now). */
export interface PointOfInterestDefinition {
  id: string;
  x: number;
  y: number;
  /** Shown when it's discovered. */
  text: string;
  /** Placeholder marker drawn there. */
  marker: 'pawPrints' | 'none';
  hidden?: DetectableSpec;
}

export interface CollectibleDefinition {
  kind: CollectibleKind;
  /** Optional name, so scent trails and scripts can refer to it. */
  id?: string;
  /** Hidden until sniffed out. */
  hidden?: DetectableSpec;
  /** Centre of the item, in world pixels. */
  x: number;
  y: number;
}

/** Something to push or smash; behaviour comes from config/obstacles.ts. */
export interface ObstacleDefinition {
  type: ObstacleKind;
  /** Top-left corner, in world pixels (size comes from the obstacle type). */
  x: number;
  y: number;
}

/** A little wooden sign with a hint on it (great for teaching controls). */
export interface SignDefinition {
  /** Bottom-centre of the sign post (usually standing on a platform). */
  x: number;
  y: number;
  text: string;
}

export interface LevelDefinition {
  key: string;
  name: string;
  /** World size in pixels - can be larger than the screen in either direction. */
  width: number;
  height: number;
  /** Where Melody starts: x centre, y = where her feet go. */
  spawn: { x: number; y: number };
  skyColor: string;
  platforms: PlatformDefinition[];
  /** Things to pick up. Collecting every goal item completes the level. */
  collectibles?: CollectibleDefinition[];
  /** Heavy crates, breakable barriers... */
  obstacles?: ObstacleDefinition[];
  /** Smells only Melody can follow. */
  scentTrails?: ScentTrailDefinition[];
  /** Things to discover. */
  pointsOfInterest?: PointOfInterestDefinition[];
  signs?: SignDefinition[];
  /** Development aids such as distance markers. */
  showDistanceMarkers?: boolean;
}

export const DEFAULT_PLATFORM_HEIGHT = 24;
