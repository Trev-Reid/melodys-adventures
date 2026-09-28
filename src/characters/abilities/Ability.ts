import type { MovementIntent } from '@/movement/PlatformerMovement';
import type { Capability } from '@/config/powerUps';
import type { Character } from '../Character';

/**
 * Everything a character is being asked to do this frame.
 * Extends the basic movement intent with ability buttons.
 * New abilities (sniff, bark, carry...) add a field here.
 */
export interface CharacterIntent extends MovementIntent {
  sprintHeld: boolean;
}

export const IDLE_INTENT: CharacterIntent = {
  moveX: 0,
  jumpPressed: false,
  jumpHeld: false,
  sprintHeld: false,
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
  /** One line for the debug overlay. */
  debugText?(): string;
  destroy?(): void;
}
