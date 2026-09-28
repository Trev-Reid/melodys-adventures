import { describe, expect, it } from 'vitest';
import { InputManager } from '../src/core/input/InputManager';
import { emptyInputState, type RawInputState } from '../src/core/input/actions';
import type { InputSource } from '../src/core/input/InputSource';

class FakeSource implements InputSource {
  state: RawInputState = emptyInputState();
  constructor(readonly id: string) {}
  read() {
    return this.state;
  }
}

describe('InputManager', () => {
  it('detects presses and releases as single-frame edges', () => {
    const src = new FakeSource('fake');
    const input = new InputManager();
    input.addSource(src);

    src.state = { ...emptyInputState(), buttons: { ...emptyInputState().buttons, jump: true } };
    input.update();
    expect(input.justPressed('jump')).toBe(true);
    input.update();
    expect(input.justPressed('jump')).toBe(false);
    expect(input.isDown('jump')).toBe(true);

    src.state = emptyInputState();
    input.update();
    expect(input.justReleased('jump')).toBe(true);
  });

  it('merges sources: strongest axis wins, buttons are OR-ed', () => {
    const keyboard = new FakeSource('keyboard');
    const pad = new FakeSource('pad');
    const input = new InputManager();
    input.addSource(keyboard);
    input.addSource(pad);

    keyboard.state = { ...emptyInputState(), moveX: -1 };
    pad.state = { ...emptyInputState(), moveX: 0.5, buttons: { ...emptyInputState().buttons, jump: true } };
    input.update();
    expect(input.moveX).toBe(-1);
    expect(input.isDown('jump')).toBe(true);
  });

  it('ignores tiny analogue stick drift', () => {
    const pad = new FakeSource('pad');
    const input = new InputManager();
    input.addSource(pad);
    pad.state = { ...emptyInputState(), moveX: 0.1 };
    input.update();
    expect(input.moveX).toBe(0);
  });
});
