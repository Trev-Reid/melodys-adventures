import { emptyInputState, BUTTON_ACTIONS, type RawInputState } from '../actions';
import type { InputSource } from '../InputSource';
import { padName, readPad, type PadSnapshot } from './gamepadMapping';
import { mappingFor } from './gamepadSettings';

/** Every controller the browser can see right now. */
export function connectedPads(): PadSnapshot[] {
  try {
    const pads = typeof navigator !== 'undefined' && navigator.getGamepads ? navigator.getGamepads() : [];
    return Array.from(pads).filter((p): p is Gamepad => !!p && p.connected !== false);
  } catch {
    return [];
  }
}

/**
 * Reads USB controllers (any number - they all control Melody) using each
 * one's mapping. Browsers only show a controller to a page after one of its
 * buttons has been pressed, so press a button once if it doesn't respond.
 */
export class GamepadInputSource implements InputSource {
  readonly id = 'gamepad';

  constructor(private readonly pads: () => PadSnapshot[] = connectedPads) {}

  read(): RawInputState {
    const merged = emptyInputState();
    for (const pad of this.pads()) {
      const state = readPad(pad, mappingFor(pad));
      if (Math.abs(state.moveX) > Math.abs(merged.moveX)) merged.moveX = state.moveX;
      if (Math.abs(state.moveY) > Math.abs(merged.moveY)) merged.moveY = state.moveY;
      for (const action of BUTTON_ACTIONS) merged.buttons[action] ||= state.buttons[action];
    }
    return merged;
  }
}

/**
 * Tell the listener when a controller is plugged in or unplugged (or first
 * noticed by the browser). Returns a function that stops listening.
 */
export function onGamepadConnection(listener: (e: { connected: boolean; name: string; id: string }) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const on = (e: GamepadEvent) => listener({ connected: true, name: padName(e.gamepad), id: e.gamepad.id });
  const off = (e: GamepadEvent) => listener({ connected: false, name: padName(e.gamepad), id: e.gamepad.id });
  window.addEventListener('gamepadconnected', on);
  window.addEventListener('gamepaddisconnected', off);
  return () => {
    window.removeEventListener('gamepadconnected', on);
    window.removeEventListener('gamepaddisconnected', off);
  };
}
