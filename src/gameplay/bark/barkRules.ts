/**
 * Bark rules as pure functions (unit tested). A bark is a cone of sound in
 * front of Melody; targets inside it react if the bark is loud enough.
 */
export interface BarkShape {
  x: number;
  y: number;
  facing: 1 | -1;
  range: number;
  coneDegrees: number;
}

/** Is the point inside the bark's cone of sound? */
export function barkReaches(bark: BarkShape, target: { x: number; y: number }): boolean {
  const dx = (target.x - bark.x) * bark.facing; // + = in front of her
  const dy = target.y - bark.y;
  const distance = Math.hypot(dx, dy);
  if (distance > bark.range) return false;
  if (distance < 30) return true; // right under her nose
  const angle = Math.abs((Math.atan2(dy, dx) * 180) / Math.PI);
  return angle <= bark.coneDegrees;
}

/**
 * BARK BOOST: the upward speed after barking in mid-air, or null if a boost
 * wouldn't help (she's already rising faster) - then it isn't used up.
 * Negative = upwards.
 */
export function barkBoostVelocity(vy: number, boostSpeed: number): number | null {
  return vy > -boostSpeed ? -boostSpeed : null;
}

/** Highest she can rise (px) from a launch speed, ignoring air time. */
export function riseHeight(speed: number, gravity: number): number {
  return (speed * speed) / (2 * gravity);
}

export type BarkOutcome = 'react' | 'tooQuiet';

export function barkOutcome(requiresSuperBark: boolean, isSuper: boolean): BarkOutcome {
  return !requiresSuperBark || isSuper ? 'react' : 'tooQuiet';
}
