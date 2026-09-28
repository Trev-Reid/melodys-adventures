/**
 * Scents - every smell in the world has a type. Trails, hidden objects,
 * characters and places can all carry a scent; Melody's nose is a game system.
 */
import { TEXTURES } from '@/assets/keys';

export type ScentType = 'squirrel' | 'sausage' | 'cat';

export interface ScentTypeDefinition {
  label: string;
  /** Colour of the trail. */
  color: number;
  /** Little icon drifting along the trail, so players can tell scents apart. */
  icon: string;
}

export const SCENT_TYPES: Record<ScentType, ScentTypeDefinition> = {
  squirrel: { label: 'Squirrel', color: 0xffa24c, icon: TEXTURES.scentSquirrel },
  sausage: { label: 'Sausage', color: 0xff5f6d, icon: TEXTURES.scentSausage },
  cat: { label: 'Cat', color: 0xb58cff, icon: TEXTURES.scentCat },
};

/**
 * How scent trails are drawn. Rendering is deliberately swappable - try
 * different values while play-testing.
 */
export const SCENT_TRAIL_STYLE = {
  /** Faint dotted line along the trail. */
  showDots: true,
  dotSpacing: 16,
  /** Scent icons drifting along the trail towards its source/destination. */
  moteSpacing: 110,
  /** Pixels per second the motes travel. */
  moteSpeed: 120,
  /** How much the motes wobble up and down, like drifting smells. */
  wobble: 5,
  fadeSeconds: 0.4,
};

/** Default distance at which SUPER SNIFF reveals a hidden object. */
export const DEFAULT_REVEAL_RADIUS = 240;
