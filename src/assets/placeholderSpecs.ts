import { TEXTURES } from './keys';

/**
 * Everything still drawn by code (placeholders.ts), and what real art must
 * be like to replace it without changing how the game plays.
 *
 * To replace one: save a PNG named after its key (e.g. item-sausage.png) in
 * src/assets/replacements/. The game loads it instead of drawing the
 * placeholder - no code changes. `npm run art:check` checks it against the
 * size and rules below. (Obstacles - crates, barriers, blocks - are listed
 * by obstacleReplacementKey(): their size is in config/obstacles.ts.)
 *
 * See docs/ART-PIPELINE.md, "Replacing a placeholder".
 */
export type ArtRole = 'background' | 'tile' | 'prop' | 'character' | 'item' | 'fx' | 'ui';

export interface PlaceholderSpec {
  /** The placeholder's size (screen px) - the size the game was tuned with. */
  width: number;
  height: number;
  /**
   * How closely real art must match that size:
   * 'exact' - the game's physics uses the picture's size, so it must match.
   * 'about' - within `tolerance` px either way (pick-up boxes follow the picture; a few px doesn't change the feel).
   * 'free'  - any size (it's stretched, repeated or purely decoration).
   */
  fit: 'exact' | 'about' | 'free';
  tolerance?: number;
  /** Pictures that must all be the same size as each other (frames of one character). */
  group?: string;
  role: ArtRole;
  /** Where the game holds it: its middle, or its feet (bottom centre - so nothing may hang below the feet). */
  anchor: 'centre' | 'feet' | 'top-left';
  /** 'cutout': hard edges on a see-through background. 'soft': glows and light. 'opaque': fills a whole tile. */
  alpha: 'cutout' | 'soft' | 'opaque';
  /** The game colours it in at runtime (setTint), so draw it white/grey. */
  tinted?: boolean;
  /** What it is, and anything to watch out for. */
  what: string;
}

export const PLACEHOLDER_SPECS: Record<string, PlaceholderSpec> = {
  [TEXTURES.groundTile]: {
    width: 32, height: 32, fit: 'free', role: 'tile', anchor: 'top-left', alpha: 'opaque',
    what: 'Earth for plain (non-garden) ground. Repeats in both directions, so the edges must join up.',
  },
  [TEXTURES.grassTop]: {
    width: 32, height: 10, fit: 'about', tolerance: 0, role: 'tile', anchor: 'top-left', alpha: 'cutout',
    what: 'Grass strip along the top of plain ground. Drawn 10px tall, repeated sideways - any width, exactly 10 high.',
  },
  [TEXTURES.platformTile]: {
    width: 32, height: 32, fit: 'free', role: 'tile', anchor: 'top-left', alpha: 'opaque',
    what: 'Plain wooden platform. Repeats in both directions.',
  },
  [TEXTURES.sausage]: {
    width: 30, height: 16, fit: 'about', tolerance: 4, role: 'item', anchor: 'centre', alpha: 'cutout',
    what: 'A sausage to collect. Its pick-up box is the picture plus 6px all round.',
  },
  [TEXTURES.superSausage]: {
    width: 42, height: 22, fit: 'about', tolerance: 4, role: 'item', anchor: 'centre', alpha: 'cutout',
    what: 'The golden Super Sausage (SUPER STRENGTH). Bigger and shinier than a sausage.',
  },
  [TEXTURES.glow]: {
    width: 64, height: 64, fit: 'free', role: 'fx', anchor: 'centre', alpha: 'soft', tinted: true,
    what: 'Soft round glow behind power-ups and scent clouds. White - the game colours it.',
  },
  [TEXTURES.sniffTreat]: {
    width: 36, height: 22, fit: 'about', tolerance: 4, role: 'item', anchor: 'centre', alpha: 'cutout',
    what: 'The sniff treat (SUPER SNIFF).',
  },
  [TEXTURES.squirrelToy]: {
    width: 40, height: 36, fit: 'about', tolerance: 4, role: 'item', anchor: 'centre', alpha: 'cutout',
    what: "Melody's squirrel toy - a special find.",
  },
  [TEXTURES.scentSquirrel]: {
    width: 16, height: 18, fit: 'about', tolerance: 4, role: 'ui', anchor: 'centre', alpha: 'cutout',
    what: 'Little squirrel icon floating in a scent trail.',
  },
  [TEXTURES.scentSausage]: {
    width: 18, height: 15, fit: 'about', tolerance: 4, role: 'ui', anchor: 'centre', alpha: 'cutout',
    what: 'Little sausage icon floating in a scent trail.',
  },
  [TEXTURES.scentCat]: {
    width: 17, height: 16, fit: 'about', tolerance: 4, role: 'ui', anchor: 'centre', alpha: 'cutout',
    what: 'Little cat icon floating in a scent trail.',
  },
  [TEXTURES.pawPrints]: {
    width: 58, height: 20, fit: 'about', tolerance: 6, role: 'item', anchor: 'feet', alpha: 'cutout',
    what: 'Paw prints on the ground that Melody can sniff out. Sits on the ground (bottom row = ground).',
  },
  [TEXTURES.barkBiscuit]: {
    width: 28, height: 28, fit: 'about', tolerance: 4, role: 'item', anchor: 'centre', alpha: 'cutout',
    what: 'The bark biscuit (SUPER BARK).',
  },
  [TEXTURES.ball]: {
    width: 22, height: 22, fit: 'about', tolerance: 4, role: 'item', anchor: 'centre', alpha: 'cutout',
    what: "Melody's ball (stuck up trees until she barks it down).",
  },
  [TEXTURES.cat]: {
    width: 52, height: 48, fit: 'about', tolerance: 8, role: 'character', anchor: 'feet', alpha: 'cutout',
    what: "The neighbour's cat that blocks the way until Melody barks. Feet on the bottom row, facing left.",
  },
  [TEXTURES.leaf]: {
    width: 10, height: 6, fit: 'free', role: 'fx', anchor: 'centre', alpha: 'cutout',
    what: 'A leaf flying out of a leaf pile Melody barked at.',
  },
  [TEXTURES.debris]: {
    width: 6, height: 4, fit: 'free', role: 'fx', anchor: 'centre', alpha: 'cutout', tinted: true,
    what: 'Bits flying off a smashed crate or block. White - the game colours it.',
  },
  [TEXTURES.confetti]: {
    width: 8, height: 5, fit: 'free', role: 'fx', anchor: 'centre', alpha: 'cutout', tinted: true,
    what: 'Confetti when a level is finished. White - the game colours it.',
  },
  [TEXTURES.hill]: {
    width: 400, height: 200, fit: 'free', role: 'background', anchor: 'feet', alpha: 'cutout',
    what: 'Distant hill behind plain (non-garden) levels.',
  },
  [TEXTURES.cloud]: {
    width: 110, height: 56, fit: 'free', role: 'background', anchor: 'centre', alpha: 'cutout',
    what: 'Cloud behind plain (non-garden) levels.',
  },
};

/** Texture key of an obstacle (heavy crate, wooden barrier...): replace it with src/assets/replacements/<key>.png. */
export const obstacleReplacementKey = (kind: string): string => `obstacle-${kind}`;
