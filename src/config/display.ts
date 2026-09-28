/**
 * Display / resolution settings.
 *
 * The game renders at a fixed "virtual" resolution and Phaser's Scale Manager
 * stretches it (preserving aspect ratio) to fit the browser window. All level
 * and UI coordinates are in these virtual pixels, so layouts never depend on
 * the size of the player's screen.
 */
export const DISPLAY = {
  width: 960,
  height: 540,
  backgroundColor: '#87ceeb',
} as const;
