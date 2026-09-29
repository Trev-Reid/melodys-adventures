/**
 * Keyboard bindings. Values are Phaser key names (see Phaser.Input.Keyboard.KeyCodes).
 * Gameplay code never refers to keys directly - only to GameActions.
 */
import type { ButtonAction } from '@/core/input/actions';

export interface KeyboardBindings {
  left: string[];
  right: string[];
  buttons: Record<ButtonAction, string[]>;
}

export const KEYBOARD_BINDINGS: KeyboardBindings = {
  left: ['LEFT', 'A'],
  right: ['RIGHT', 'D'],
  buttons: {
    jump: ['SPACE', 'UP', 'W'],
    sprint: ['SHIFT', 'X'],
    bark: ['B'],
    toggleDebug: ['F3', 'BACKTICK'],
    restart: ['R'],
    mute: ['M'],
  },
};
