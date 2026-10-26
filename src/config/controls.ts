/**
 * Keyboard bindings. Values are Phaser key names (see Phaser.Input.Keyboard.KeyCodes).
 * Gameplay code never refers to keys directly - only to GameActions.
 * Controller buttons are in core/input/gamepad/gamepadMapping.ts.
 */
import type { ButtonAction } from '@/core/input/actions';

export interface KeyboardBindings {
  left: string[];
  right: string[];
  /** Up/down are for menus (up also jumps in the game). */
  up: string[];
  down: string[];
  buttons: Record<ButtonAction, string[]>;
}

export const KEYBOARD_BINDINGS: KeyboardBindings = {
  left: ['LEFT', 'A'],
  right: ['RIGHT', 'D'],
  up: ['UP', 'W'],
  down: ['DOWN', 'S'],
  buttons: {
    jump: ['SPACE', 'UP', 'W'],
    sprint: ['SHIFT', 'X'],
    bark: ['B'],
    /** The boy's action (open, pull, throw...): the same key as bark, or E. */
    use: ['B', 'E'],
    /** Swap between Melody and the boy. */
    switchCharacter: ['TAB', 'C'],
    pause: ['ESC', 'P'],
    confirm: ['ENTER', 'SPACE'],
    toggleDebug: ['F3', 'BACKTICK'],
    restart: ['R'],
    mute: ['M'],
  },
};
