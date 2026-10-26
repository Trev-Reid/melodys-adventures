/**
 * The garden's wildlife (gameplay/ambient/AmbientLife.ts): how close Melody can
 * get before they're off, and how long until they come back. Just numbers -
 * change them, save, and the game reloads.
 */
export const AMBIENT = {
  /** px. Running at them (faster than walking) scares them from a bit further away. */
  butterflyScareDistance: 60,
  robinScareDistance: 120,
  squirrelScareDistance: 140,
  /** Seconds before a robin / the squirrel comes back (if Melody isn't right there). */
  robinAwaySeconds: 10,
  squirrelAwaySeconds: 9,
  /** A leaf falls from each tree about this often (seconds). */
  leafEverySeconds: 2.5,
  /** Butterflies come in these colours (the art is white, tinted). */
  butterflyColours: [0xffffff, 0xffe066, 0x8fd3ff, 0xffa64d, 0xd8b4ff],
  /** Falling leaves: mostly green, a few turning. */
  leafColours: [0xffffff, 0xffffff, 0xe8f0a0, 0xf2c070],
};
