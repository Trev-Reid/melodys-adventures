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
  /** Id of the source (e.g. 'keyboard', 'gamepad') that was used most recently. */
  private lastActive?: string;

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
      if (isActive(state)) this.lastActive = source.id;
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

  /** The source the player touched most recently ('keyboard', 'gamepad'...), if any yet. */
  get lastActiveSource(): string | undefined {
    return this.lastActive;
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

  /** -1 / 1 on the frame up/down (D-pad, arrows) is first pushed, else 0. For menus. */
  justMovedY(): number {
    const now = Math.sign(this.current.moveY);
    return now !== Math.sign(this.previous.moveY) ? now : 0;
  }

  /** -1 / 1 on the frame left/right is first pushed, else 0. For menus. */
  justMovedX(): number {
    const now = Math.sign(this.current.moveX);
    return now !== Math.sign(this.previous.moveX) ? now : 0;
  }

  /**
   * Read the devices and treat whatever is held now as already held, so
   * nothing counts as "just pressed". Use after a pause or menu, so the
   * button that closed the menu doesn't also make Melody jump.
   */
  settle(): void {
    this.update();
    this.previous = this.current;
  }

  destroy(): void {
    for (const source of this.sources) source.destroy?.();
    this.sources.length = 0;
  }
}

function isActive(state: RawInputState): boolean {
  return Math.abs(state.moveX) >= AXIS_DEADZONE || Math.abs(state.moveY) >= AXIS_DEADZONE || BUTTON_ACTIONS.some((a) => state.buttons[a]);
}

function applyDeadzone(value: number): number {
  const clamped = Math.max(-1, Math.min(1, value));
  return Math.abs(clamped) < AXIS_DEADZONE ? 0 : clamped;
}
