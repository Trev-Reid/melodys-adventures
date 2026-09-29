/**
 * Things that react to a bark - all data. Place them in Tiled (layer
 * "barkTargets"); what they do comes from here.
 */
export type BarkTargetKind = 'ballInTree' | 'leafPile' | 'cat';
export type BarkReaction = 'fall' | 'scatter' | 'flee';

export interface BarkTargetType {
  reaction: BarkReaction;
  /** Needs a SUPER BARK (default). An ordinary woof just gets a "not loud enough" wobble. */
  requiresSuperBark: boolean;
  /** Blocks Melody's way until it's barked at (e.g. the cat sitting on a ledge). */
  solid?: { width: number; height: number };
  /** Said when an ordinary woof isn't enough. */
  tooQuietText: string;
}

export const BARK_TARGET_TYPES: Record<BarkTargetKind, BarkTargetType> = {
  ballInTree: { reaction: 'fall', requiresSuperBark: true, tooQuietText: 'Not loud enough!' },
  leafPile: { reaction: 'scatter', requiresSuperBark: true, tooQuietText: 'Not loud enough!' },
  cat: { reaction: 'flee', requiresSuperBark: true, solid: { width: 50, height: 46 }, tooQuietText: 'Hiss!' },
};

/** Default height of a ballInTree's tree (px from its base). */
export const DEFAULT_TREE_HEIGHT = 230;
