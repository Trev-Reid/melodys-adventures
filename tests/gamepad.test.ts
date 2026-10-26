import { describe, expect, it } from 'vitest';
import {
  RETROLINK_MAPPING,
  STANDARD_MAPPING,
  detectNewControl,
  hatDirections,
  mappingFromSetup,
  padName,
  parseVendorProduct,
  presetFor,
  readPad,
  type PadSnapshot,
} from '../src/core/input/gamepad/gamepadMapping';
import { GamepadInputSource } from '../src/core/input/gamepad/GamepadInputSource';
import { InputManager } from '../src/core/input/InputManager';
import { emptyInputState } from '../src/core/input/actions';
import type { InputSource } from '../src/core/input/InputSource';
import { fillPrompts } from '../src/core/input/buttonLabels';

const RETROLINK_ID = 'USB Gamepad (Vendor: 0079 Product: 0011)';
const HAT_NEUTRAL = 1.2857;

/** A fake controller: which buttons are held and the axis values. */
function pad(opts: { id?: string; mapping?: string; pressed?: number[]; axes?: number[]; buttons?: number } = {}): PadSnapshot {
  const count = opts.buttons ?? 12;
  return {
    id: opts.id ?? RETROLINK_ID,
    mapping: opts.mapping ?? '',
    axes: opts.axes ?? [0, 0],
    buttons: Array.from({ length: count }, (_, i) => ({ pressed: (opts.pressed ?? []).includes(i), value: 0 })),
  };
}

describe('recognising controllers', () => {
  it('reads USB ids from Chrome and Firefox', () => {
    expect(parseVendorProduct(RETROLINK_ID)).toEqual({ vendor: '0079', product: '0011' });
    expect(parseVendorProduct('79-11-USB Gamepad')).toEqual({ vendor: '0079', product: '0011' });
    expect(parseVendorProduct('Xbox 360 Controller (XInput STANDARD GAMEPAD)')).toBeNull();
  });

  it('knows the Retrolink by name', () => {
    expect(padName({ id: RETROLINK_ID })).toBe('Retrolink SNES controller');
    expect(padName({ id: 'Xbox 360 Controller (XInput STANDARD GAMEPAD)' })).toBe('Xbox 360 Controller');
  });

  it('uses the Retrolink layout for a Retrolink, and the standard layout when the browser provides it', () => {
    expect(presetFor({ id: RETROLINK_ID, mapping: '' }).controls).toEqual(RETROLINK_MAPPING.controls);
    expect(presetFor({ id: RETROLINK_ID, mapping: 'standard' }).controls).toEqual(STANDARD_MAPPING.controls);
    // An unknown SNES-style pad gets the common (Retrolink) layout too.
    expect(presetFor({ id: 'Some Pad (Vendor: 1234 Product: 5678)', mapping: '' }).controls).toEqual(RETROLINK_MAPPING.controls);
  });
});

describe('Retrolink SNES pad, Mario style', () => {
  const read = (p: PadSnapshot) => readPad(p, RETROLINK_MAPPING);

  it('nothing pressed = nothing happens', () => {
    expect(read(pad({ axes: [-0.0039, -0.0039] }))).toEqual(emptyInputState());
  });

  it('B jumps, Y sprints, A barks, X barks, L/R sprint, Start pauses', () => {
    expect(read(pad({ pressed: [2] })).buttons.jump).toBe(true);
    expect(read(pad({ pressed: [3] })).buttons.sprint).toBe(true);
    expect(read(pad({ pressed: [1] })).buttons.bark).toBe(true);
    expect(read(pad({ pressed: [0] })).buttons.bark).toBe(true);
    expect(read(pad({ pressed: [4] })).buttons.sprint).toBe(true);
    expect(read(pad({ pressed: [5] })).buttons.sprint).toBe(true);
    expect(read(pad({ pressed: [9] })).buttons.pause).toBe(true);
    expect(read(pad({ pressed: [8] })).buttons.pause).toBe(false); // Select does nothing
  });

  it('the D-pad moves (axes 0 and 1)', () => {
    expect(read(pad({ axes: [-1, 0] })).moveX).toBe(-1);
    expect(read(pad({ axes: [1, 0] })).moveX).toBe(1);
    expect(read(pad({ axes: [0, -1] })).moveY).toBe(-1);
    expect(read(pad({ axes: [0, 1] })).moveY).toBe(1);
  });

  it('works when the D-pad is reported as a hat on axis 9', () => {
    const axes = (hat: number) => [0, 0, 0, 0, 0, 0, 0, 0, 0, hat];
    expect(read(pad({ axes: axes(HAT_NEUTRAL) })).moveX).toBe(0);
    expect(read(pad({ axes: axes(5 / 7) })).moveX).toBe(-1); // left
    expect(read(pad({ axes: axes(-3 / 7) })).moveX).toBe(1); // right
    expect(read(pad({ axes: axes(-1) })).moveY).toBe(-1); // up
  });

  it('jump or bark also picks things in menus', () => {
    expect(read(pad({ pressed: [2] })).buttons.confirm).toBe(true);
    expect(read(pad({ pressed: [1] })).buttons.confirm).toBe(true);
  });
});

describe('standard-layout pads', () => {
  const read = (p: PadSnapshot) => readPad(p, STANDARD_MAPPING);
  it('bottom button jumps, left sprints, right barks, Start pauses, D-pad and stick move', () => {
    expect(read(pad({ mapping: 'standard', pressed: [0], buttons: 17 })).buttons.jump).toBe(true);
    expect(read(pad({ mapping: 'standard', pressed: [2], buttons: 17 })).buttons.sprint).toBe(true);
    expect(read(pad({ mapping: 'standard', pressed: [1], buttons: 17 })).buttons.bark).toBe(true);
    expect(read(pad({ mapping: 'standard', pressed: [9], buttons: 17 })).buttons.pause).toBe(true);
    expect(read(pad({ mapping: 'standard', pressed: [14], buttons: 17 })).moveX).toBe(-1);
    expect(read(pad({ mapping: 'standard', axes: [0.9, 0, 0, 0], buttons: 17 })).moveX).toBe(1);
  });
});

describe('D-pad hats', () => {
  it('decodes the 8 directions and ignores resting values', () => {
    expect(hatDirections(-1)).toEqual(['up']);
    expect(hatDirections(-3 / 7)).toEqual(['right']);
    expect(hatDirections(1 / 7)).toEqual(['down']);
    expect(hatDirections(5 / 7)).toEqual(['left']);
    expect(hatDirections(1)).toEqual(['up', 'left']);
    expect(hatDirections(HAT_NEUTRAL)).toEqual([]);
    expect(hatDirections(0)).toEqual([]); // a normal axis at rest
    expect(hatDirections(undefined)).toEqual([]);
  });
});

describe('controller setup', () => {
  const rest = pad({ axes: [0, 0, 0, 0, 0, 0, 0, 0, 0, HAT_NEUTRAL] });

  it('notices a newly pressed button', () => {
    expect(detectNewControl(rest, pad({ pressed: [2], axes: [...rest.axes] }))).toEqual({ type: 'button', index: 2 });
  });

  it('notices an axis being pushed', () => {
    const now = pad({ axes: [-1, 0, 0, 0, 0, 0, 0, 0, 0, HAT_NEUTRAL] });
    expect(detectNewControl(rest, now)).toEqual({ type: 'axis', index: 0, direction: -1 });
  });

  it('notices a hat direction', () => {
    const now = pad({ axes: [0, 0, 0, 0, 0, 0, 0, 0, 0, 5 / 7] });
    expect(detectNewControl(rest, now)).toEqual({ type: 'hat', index: 9, direction: 'left' });
  });

  it('ignores things that were already held, and an unchanged pad', () => {
    const held = pad({ pressed: [4], axes: [...rest.axes] });
    expect(detectNewControl(held, held)).toBeNull();
    expect(detectNewControl(rest, rest)).toBeNull();
  });

  it('builds a working mapping from what was pressed', () => {
    const m = mappingFromSetup('My pad', {
      left: { type: 'axis', index: 0, direction: -1 },
      jump: { type: 'button', index: 7 },
    });
    expect(readPad(pad({ pressed: [7] }), m).buttons.jump).toBe(true);
    expect(readPad(pad({ axes: [-1, 0] }), m).moveX).toBe(-1);
    expect(readPad(pad({ pressed: [2] }), m).buttons.jump).toBe(false);
  });
});

describe('GamepadInputSource + InputManager', () => {
  it('any connected controller can play', () => {
    const source = new GamepadInputSource(() => [pad(), pad({ id: 'Second (Vendor: 0079 Product: 0011)', pressed: [2] })]);
    expect(source.read().buttons.jump).toBe(true);
  });

  it('menus get one step per D-pad press, and settle() swallows held buttons', () => {
    let state = pad();
    const input = new InputManager();
    input.addSource(new GamepadInputSource(() => [state]));
    input.update();
    state = pad({ axes: [0, 1] });
    input.update();
    expect(input.justMovedY()).toBe(1);
    input.update();
    expect(input.justMovedY()).toBe(0); // still held: no repeat

    state = pad({ pressed: [2] });
    input.settle();
    expect(input.isDown('jump')).toBe(true);
    expect(input.justPressed('jump')).toBe(false);
  });

  it('remembers which device was used last', () => {
    let keyboardDown = false;
    const keyboard: InputSource = {
      id: 'keyboard',
      read: () => ({ ...emptyInputState(), moveX: keyboardDown ? 1 : 0 }),
    };
    let state = pad();
    const input = new InputManager();
    input.addSource(keyboard);
    input.addSource(new GamepadInputSource(() => [state]));
    input.update();
    expect(input.lastActiveSource).toBeUndefined();
    state = pad({ pressed: [2] });
    input.update();
    expect(input.lastActiveSource).toBe('gamepad');
    state = pad();
    keyboardDown = true;
    input.update();
    expect(input.lastActiveSource).toBe('keyboard');
  });
});

describe('signs', () => {
  it('show the right button names', () => {
    expect(fillPrompts('Hold {jump} to bounce!', 'keyboard')).toBe('Hold SPACE to bounce!');
    expect(fillPrompts('Hold {jump} to bounce!', 'gamepad')).toBe('Hold B to bounce!');
    expect(fillPrompts('Press {bark} to bark', 'gamepad')).toBe('Press A to bark');
    expect(fillPrompts('{nothing} stays', 'gamepad')).toBe('{nothing} stays');
  });
});
