/**
 * Obstacle types - all data. Levels place obstacles by type name; the
 * behaviour comes from these settings, so new puzzles are mostly new entries.
 */
export type ObstacleKind = 'heavyCrate' | 'woodenBarrier' | 'fence';

export interface ObstacleType {
  width: number;
  height: number;
  /** Placeholder look until real art exists. */
  look: 'crate' | 'planks' | 'fence';
  /** Needs the 'strength' capability (SUPER_STRENGTH) to push or break. */
  requiresStrength: boolean;
  /** Can be shoved along the ground. pushForce = how fast (px/s) she can shove it. */
  pushable?: { pushForce: number };
  /** Can be smashed. */
  breakable?: {
    /** Hits needed with plain strength. A SUPER CHARGE always breaks it in one. */
    hitsToBreak: number;
    /** She must hit it at least this fast (px/s) - so it takes a run-up or a jump. */
    minImpactSpeed: number;
  };
  /** What she "says" when she isn't strong enough. */
  tooWeakText: string;
}

export const OBSTACLE_TYPES: Record<ObstacleKind, ObstacleType> = {
  heavyCrate: {
    width: 110,
    height: 110,
    look: 'crate',
    requiresStrength: true,
    pushable: { pushForce: 180 },
    tooWeakText: 'Too heavy!',
  },
  woodenBarrier: {
    width: 44,
    height: 200,
    look: 'planks',
    requiresStrength: true,
    breakable: { hitsToBreak: 2, minImpactSpeed: 160 },
    tooWeakText: 'Too tough!',
  },
  fence: {
    width: 28,
    height: 150,
    look: 'fence',
    requiresStrength: true,
    breakable: { hitsToBreak: 1, minImpactSpeed: 160 },
    tooWeakText: 'Too tough!',
  },
};

/** Bounce-back when she hits something that doesn't break yet. */
export const BONK = { knockbackX: 240, knockbackY: 260, cooldownSeconds: 0.35 };
