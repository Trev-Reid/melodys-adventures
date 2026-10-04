/**
 * Movement tuning.
 *
 * Every number that affects how a character *feels* lives here, not in the
 * movement code. Tweak a value, save, and Vite reloads the game instantly.
 *
 * Units: pixels, seconds. Speeds are px/s, accelerations are px/s².
 * For scale: the world is 540px tall and Melody is ~48px long.
 */
export interface MovementConfig {
  // --- Horizontal (on the ground) -----------------------------------------
  /** Top running speed. */
  maxSpeed: number;
  /** How quickly she reaches top speed when a direction is held. */
  acceleration: number;
  /** How quickly she stops when no direction is held (braking/friction). */
  deceleration: number;
  /** Acceleration used when pushing *against* current movement (skid/turn). */
  turnAcceleration: number;

  // --- Horizontal (in the air) ---------------------------------------------
  /** 0..1 multiplier on acceleration/turning while airborne. 1 = full control. */
  airControl: number;
  /** Deceleration while airborne with no input (air drag). */
  airDeceleration: number;

  // --- Vertical ------------------------------------------------------------
  /** Upward speed applied at the moment of jumping. */
  jumpVelocity: number;
  /** Downward acceleration while rising. */
  gravity: number;
  /** Gravity multiplier while falling (>1 gives a snappier, less floaty fall). */
  fallGravityMultiplier: number;
  /** Terminal falling speed. */
  maxFallSpeed: number;
  /**
   * Variable jump height: if jump is released while still rising, upward
   * speed is multiplied by this (0..1). 1 disables the feature.
   */
  jumpCutMultiplier: number;

  // --- Forgiveness ("game feel") --------------------------------------------
  /** Grace period after walking off a ledge during which a jump still works. */
  coyoteTimeMs: number;
  /** A jump pressed this long before landing is remembered and performed on landing. */
  jumpBufferMs: number;
}

/** Melody's default movement profile. */
export const MELODY_MOVEMENT: MovementConfig = {
  maxSpeed: 320,
  acceleration: 1800,
  deceleration: 2200,
  turnAcceleration: 3200,

  airControl: 0.75,
  airDeceleration: 400,

  jumpVelocity: 620,
  gravity: 1500,
  fallGravityMultiplier: 1.6,
  maxFallSpeed: 900,
  jumpCutMultiplier: 0.45,

  coyoteTimeMs: 90,
  jumpBufferMs: 120,
};

/**
 * The boy: a bit slower than Melody (nobody's as fast as Melody) and a
 * slightly smaller jump. Same feel otherwise.
 */
export const BOY_MOVEMENT: MovementConfig = {
  ...MELODY_MOVEMENT,
  maxSpeed: 250,
  acceleration: 1500,
  jumpVelocity: 590,
};
