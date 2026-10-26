import type { MovementIntent } from '@/movement/PlatformerMovement';
import type { Capability } from '@/config/powerUps';
import type { Character } from '../Character';

/**
 * Everything a character is being asked to do this frame.
 * Extends the basic movement intent with ability buttons.
 * New abilities (sniff, bark, carry...) add a field here.
 */
export interface CharacterIntent extends MovementIntent {
  /** -1 (up) .. 1 (down): climbing ladders. */
  moveY: number;
  sprintHeld: boolean;
  /** The action button: Melody barks... */
  barkPressed: boolean;
  /** ...and the boy uses things (open, pull, throw, "Sit!"). Same button. */
  usePressed: boolean;
}

/** Velocities an ability sets directly when it takes over movement. */
export interface MovementOverride {
  vx: number;
  vy: number;
  gravityY: number;
}

export const IDLE_INTENT: CharacterIntent = {
  moveX: 0,
  moveY: 0,
  jumpPressed: false,
  jumpHeld: false,
  sprintHeld: false,
  barkPressed: false,
  usePressed: false,
};

/**
 * A self-contained power a character has (sprinting now; sniffing, digging,
 * the squirrel toy later). Abilities run every frame *before* movement, so
 * they can adjust `character.movement.modifiers`.
 */
export interface Ability {
  readonly name: string;
  update(character: Character, intent: CharacterIntent, dtSeconds: number): void;
  /** Called on respawn / level restart. */
  reset(): void;
  /** Capabilities this ability is providing right now (e.g. 'sprint' while sprinting). */
  capabilities?(): Capability[];
  /**
   * Take over movement this frame (e.g. climbing a ladder): return the body's
   * velocity and gravity, or undefined to move normally.
   */
  overrideMovement?(character: Character, intent: CharacterIntent, dtSeconds: number): MovementOverride | undefined;
  /** Pass through platforms you can jump up through (e.g. climbing down a ladder through a deck). */
  passesThroughOneWay?(): boolean;
  /** One line for the debug overlay. */
  debugText?(): string;
  destroy?(): void;
}
