/**
 * The vocabulary of player intent.
 *
 * Gameplay code asks "is jump pressed?" or "how far left/right is the player
 * pushing?" - never "is the space bar down?". Input sources (keyboard now,
 * gamepad later) translate physical controls into these actions.
 *
 * To add a new action (e.g. 'sniff', 'sprint', 'switchCharacter'):
 *   1. add it to BUTTON_ACTIONS below,
 *   2. bind it in config/controls.ts (and later the gamepad bindings),
 *   3. read it via InputManager.justPressed('sniff') etc.
 */
export const BUTTON_ACTIONS = ['jump', 'sprint', 'toggleDebug', 'restart', 'mute'] as const;
export type ButtonAction = (typeof BUTTON_ACTIONS)[number];

/** Instantaneous state reported by one input source. */
export interface RawInputState {
  /** Horizontal axis, -1 (full left) .. 1 (full right). Analogue-ready. */
  moveX: number;
  /** Vertical axis, -1 (up) .. 1 (down). Unused for now; reserved for climbing/looking. */
  moveY: number;
  buttons: Record<ButtonAction, boolean>;
}

export function emptyButtons(): Record<ButtonAction, boolean> {
  const buttons = {} as Record<ButtonAction, boolean>;
  for (const action of BUTTON_ACTIONS) buttons[action] = false;
  return buttons;
}

export function emptyInputState(): RawInputState {
  return { moveX: 0, moveY: 0, buttons: emptyButtons() };
}
