import { BUTTON_ACTIONS, emptyInputState, type ButtonAction, type RawInputState } from './actions';
import type { InputSource } from './InputSource';

/** Axis values smaller than this are treated as zero (stick drift). */
const AXIS_DEADZONE = 0.2;

/**
 * Merges any number of input sources into one per-frame view of player intent,
 * and derives edge events (just pressed / just released).
 *
 * Call update() exactly once per frame, before gameplay reads input.
 * This class is engine-agnostic so it can be unit tested without Phaser.
 */
export class InputManager {
  private readonly sources: InputSource[] = [];
  private current: RawInputState = emptyInputState();
  private previous: RawInputState = emptyInputState();

  addSource(source: InputSource): void {
    this.sources.push(source);
  }

  removeSource(id: string): void {
    const index = this.sources.findIndex((s) => s.id === id);
    if (index >= 0) this.sources.splice(index, 1)[0].destroy?.();
  }

  update(): void {
    this.previous = this.current;
    const merged = emptyInputState();

    for (const source of this.sources) {
      const state = source.read();
      // Strongest axis wins, so a gamepad and keyboard can both be plugged in.
      if (Math.abs(state.moveX) > Math.abs(merged.moveX)) merged.moveX = state.moveX;
      if (Math.abs(state.moveY) > Math.abs(merged.moveY)) merged.moveY = state.moveY;
      for (const action of BUTTON_ACTIONS) {
        merged.buttons[action] ||= state.buttons[action];
      }
    }

    merged.moveX = applyDeadzone(merged.moveX);
    merged.moveY = applyDeadzone(merged.moveY);
    this.current = merged;
  }

  /** Horizontal intent, -1..1. */
  get moveX(): number {
    return this.current.moveX;
  }

  get moveY(): number {
    return this.current.moveY;
  }

  isDown(action: ButtonAction): boolean {
    return this.current.buttons[action];
  }

  justPressed(action: ButtonAction): boolean {
    return this.current.buttons[action] && !this.previous.buttons[action];
  }

  justReleased(action: ButtonAction): boolean {
    return !this.current.buttons[action] && this.previous.buttons[action];
  }

  destroy(): void {
    for (const source of this.sources) source.destroy?.();
    this.sources.length = 0;
  }
}

function applyDeadzone(value: number): number {
  const clamped = Math.max(-1, Math.min(1, value));
  return Math.abs(clamped) < AXIS_DEADZONE ? 0 : clamped;
}
