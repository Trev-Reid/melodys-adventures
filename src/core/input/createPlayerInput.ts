import type Phaser from 'phaser';
import { InputManager } from './InputManager';
import { KeyboardInputSource } from './KeyboardInputSource';
import { GamepadInputSource } from './gamepad/GamepadInputSource';
import { KEYBOARD_BINDINGS } from '@/config/controls';

/** The player's input: keyboard and any USB controllers, merged. */
export function createPlayerInput(scene: Phaser.Scene): InputManager {
  const input = new InputManager();
  input.addSource(new KeyboardInputSource(scene.input.keyboard!, KEYBOARD_BINDINGS));
  input.addSource(new GamepadInputSource());
  return input;
}
