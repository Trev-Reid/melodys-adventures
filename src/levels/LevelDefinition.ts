import type { ObstacleKind } from '@/config/obstacles';
import type { ScentType } from '@/config/scents';
import type { BarkTargetKind } from '@/config/barkTargets';
import type { DecorationKind } from '@/config/decorations';

/**
 * Levels are plain data. The LevelBuilder turns this into game objects, so new
 * levels (the house, the garden, the park...) are mostly new data files.
 *
 * Levels are made in Tiled (src/levels/maps/*.tmj) and converted into this
 * format by levels/tiled/loadTiledLevel.ts - the rest of the game only ever
 * sees a LevelDefinition.
 */
export type PlatformKind = 'ground' | 'platform';

/**
 * How a platform looks. 'classic' is the original Playground look; the rest
 * are the garden art: grass on soil, grass on a stone wall, a gravel path,
 * wooden boards, stone slabs. Unset = the level theme's default.
 */
export type PlatformStyle = 'classic' | 'grass' | 'stone' | 'gravel' | 'wood' | 'slab';
export const PLATFORM_STYLES: PlatformStyle[] = ['classic', 'grass', 'stone', 'gravel', 'wood', 'slab'];

/** The overall look of a level: sky and background scenery, default platform style. */
export type LevelTheme = 'playground' | 'garden';
export const LEVEL_THEMES: LevelTheme[] = ['playground', 'garden'];

/** A piece of scenery (house, bush, trampoline...); see config/decorations.ts. */
export interface DecorationDefinition {
  kind: DecorationKind;
  /** Bottom-centre (where it stands), in world pixels. */
  x: number;
  y: number;
  /** Mirror it left-to-right. */
  flipX?: boolean;
  /** Override the type's layer: 'back' (behind Melody) or 'front'. */
  layer?: 'back' | 'front';
  /** Draw it bigger or smaller (solid parts scale too). */
  scale?: number;
}

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
  style?: PlatformStyle;
}

export type CollectibleKind = 'bone' | 'sausage' | 'superSausage' | 'sniffTreat' | 'squirrelToy' | 'barkBiscuit' | 'ball';

/**
 * Makes something hidden until Melody's nose finds it. Reusable for bones,
 * toys, secret entrances, footprints, buried items, switches...
 */
export interface DetectableSpec {
  /** Needs the 'superSniff' capability to find (default true). */
  requiresSuperSniff?: boolean;
  /** How close she must be (px). Default in config/scents.ts. */
  revealRadius?: number;
  /**
   * What reveals it: 'superSniff' (default - sniffing nearby), or 'event'
   * (only something else in the level, e.g. a bark target it's linked to).
   */
  revealedBy?: 'superSniff' | 'event';
}

/** Something that reacts to a bark (see config/barkTargets.ts). */
export interface BarkTargetDefinition {
  kind: BarkTargetKind;
  id?: string;
  /** Its base (where it stands on the ground), in world pixels. */
  x: number;
  y: number;
  /** Name of a hidden item it reveals when it reacts (the fallen ball, a sausage under the leaves...). */
  reveals?: string;
  /** Override the type's default. */
  requiresSuperBark?: boolean;
  /** ballInTree: how tall the tree is. */
  height?: number;
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
  /** Stuck up high (in a tree): knock it down with the boy's football. */
  stuck?: boolean;
  /** Centre of the item, in world pixels. */
  x: number;
  y: number;
}

/**
 * The boy's things and teamwork helpers (see config/teamwork.ts):
 * - gate: only the boy can open it (in a hedge too tall to jump).
 * - lever: the boy pulls it to work a gate or a lift (`target`).
 * - lift: a basket on a rope that goes up `travel` px and back.
 * - ladder: only the boy can climb it.
 * - football: the boy throws it; Melody fetches it.
 * - teamArea: somewhere the other character can't just pop into when left
 *   behind - they have to get there themselves (the treehouse).
 */
export type InteractableKind = 'gate' | 'lever' | 'lift' | 'ladder' | 'football' | 'teamArea';
export const INTERACTABLE_KINDS: InteractableKind[] = ['gate', 'lever', 'lift', 'ladder', 'football', 'teamArea'];

export interface InteractableDefinition {
  kind: InteractableKind;
  /** Name, so a lever can say which gate or lift it works. */
  id?: string;
  /** gate, lever, lift, football: bottom-centre. ladder, teamArea: top-left corner. */
  x: number;
  y: number;
  /** ladder, teamArea: size. */
  width?: number;
  height?: number;
  /** lever: name of the gate or lift it works. */
  target?: string;
  /** lift: how far up it goes (px). */
  travel?: number;
  /** gate: starts open. */
  startsOpen?: boolean;
  /** lift: starts at the top. */
  startsUp?: boolean;
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
  /** Look of the level (default 'playground'). */
  theme?: LevelTheme;
  /** Scenery: houses, trees, bushes, the trampoline... */
  decorations?: DecorationDefinition[];
  platforms: PlatformDefinition[];
  /** Things to pick up. Collecting every goal item completes the level. */
  collectibles?: CollectibleDefinition[];
  /** Heavy crates, breakable barriers... */
  obstacles?: ObstacleDefinition[];
  /** Smells only Melody can follow. */
  scentTrails?: ScentTrailDefinition[];
  /** Things to discover. */
  pointsOfInterest?: PointOfInterestDefinition[];
  /** Things that react to a bark. */
  barkTargets?: BarkTargetDefinition[];
  /** Gates, levers, lifts, ladders, the football, teamwork areas. */
  interactables?: InteractableDefinition[];
  signs?: SignDefinition[];
  /** Development aids such as distance markers. */
  showDistanceMarkers?: boolean;
}

export const DEFAULT_PLATFORM_HEIGHT = 24;
