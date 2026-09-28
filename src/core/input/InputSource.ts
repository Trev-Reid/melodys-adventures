import type { RawInputState } from './actions';

/**
 * A device that can report player intent (keyboard, gamepad, touch buttons,
 * a replay file, an automated test...). Sources only report what is held
 * *right now*; the InputManager works out presses/releases.
 */
export interface InputSource {
  readonly id: string;
  read(): RawInputState;
  destroy?(): void;
}
