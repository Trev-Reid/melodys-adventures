import type { Capability } from '@/config/powerUps';
import type { ObstacleType } from '@/config/obstacles';

/**
 * The rules for strength interactions, as pure functions (unit tested).
 * Game objects ask these questions; they never check for specific power-ups.
 */
type Can = (capability: Capability) => boolean;

export function canPush(can: Can, type: ObstacleType): boolean {
  return !!type.pushable && (!type.requiresStrength || can('strength'));
}

export type ImpactResult =
  | 'tooWeak'     // not strong enough - it's just a wall
  | 'needsRunUp'  // strong enough, but too slow
  | 'hit'         // counts as a hit (may break it if enough hits)
  | 'smash';      // SUPER CHARGE - breaks instantly, keep running

export function resolveImpact(can: Can, type: ObstacleType, impactSpeed: number): ImpactResult {
  if (!type.breakable) return 'tooWeak';
  if (type.requiresStrength && !can('strength')) return 'tooWeak';
  if (can('smash')) return 'smash';
  if (impactSpeed < type.breakable.minImpactSpeed) return 'needsRunUp';
  return 'hit';
}

/** Speed at which the character is moving *into* the obstacle. */
export function impactSpeed(
  character: { vx: number; vy: number; left: number; right: number; bottom: number },
  obstacle: { left: number; right: number; top: number },
): number {
  const fromLeft = character.right <= obstacle.left + 12 && character.vx > 0;
  const fromRight = character.left >= obstacle.right - 12 && character.vx < 0;
  const fromAbove = character.bottom <= obstacle.top + 12 && character.vy > 0;
  let speed = 0;
  if (fromLeft || fromRight) speed = Math.abs(character.vx);
  if (fromAbove) speed = Math.max(speed, character.vy);
  return speed;
}
