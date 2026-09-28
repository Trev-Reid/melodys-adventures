/**
 * Rules for what Melody's nose can perceive. Pure functions (unit tested).
 * Like strength, these only ask about capabilities - never about power-ups.
 */
import type { Capability } from '@/config/powerUps';
import type { DetectableSpec, ScentTrailDefinition } from '@/levels/LevelDefinition';
import { DEFAULT_REVEAL_RADIUS } from '@/config/scents';

type Can = (capability: Capability) => boolean;

/** Should this trail be showing right now? */
export function isTrailVisible(trail: ScentTrailDefinition, can: Can): boolean {
  if (trail.active === false) return false;
  if (trail.visibleNormally) return true;
  return (trail.visibleWithSuperSniff ?? true) && can('superSniff');
}

/** Is a hidden object close enough, with the right senses, to be revealed? */
export function shouldReveal(spec: DetectableSpec, can: Can, distance: number): boolean {
  if ((spec.requiresSuperSniff ?? true) && !can('superSniff')) return false;
  return distance <= (spec.revealRadius ?? DEFAULT_REVEAL_RADIUS);
}
