import { emptyInputState, type RawInputState } from '../actions';

/**
 * Turning a USB controller's buttons into game actions.
 *
 * Browsers report a controller as a list of numbered buttons and axes. What
 * each number means depends on the controller: Xbox-style pads usually come
 * with the browser's "standard" layout, but many cheap SNES pads don't, so
 * button 0 might be X on one pad and B on another. A GamepadMapping says which
 * button/axis does what. There are ready-made mappings for common pads, and
 * the Controller Setup screen (Start > Set up controller) records your own.
 *
 * Everything here is plain logic with no Phaser or browser calls, so it is
 * unit tested in tests/gamepad.test.ts.
 */

export type HatDirection = 'up' | 'down' | 'left' | 'right';

/** One physical control: a button, one direction of an axis, or one direction of a D-pad "hat". */
export type PadControl =
  | { type: 'button'; index: number }
  | { type: 'axis'; index: number; direction: 1 | -1 }
  | { type: 'hat'; index: number; direction: HatDirection };

/** What a controller can do in the game. */
export const PAD_ACTIONS = ['left', 'right', 'up', 'down', 'jump', 'sprint', 'bark', 'pause', 'switchCharacter'] as const;
export type PadAction = (typeof PAD_ACTIONS)[number];

export interface GamepadMapping {
  /** Shown on screen, e.g. "Retrolink SNES controller". */
  name: string;
  controls: Record<PadAction, PadControl[]>;
}

/** The parts of a browser Gamepad we use (tests pass in fake ones). */
export interface PadSnapshot {
  id: string;
  /** 'standard' when the browser has already arranged it like an Xbox pad. */
  mapping: string;
  connected?: boolean;
  axes: readonly number[];
  buttons: readonly { pressed: boolean; value?: number }[];
}

/** How far an axis must be pushed to count (D-pads report -1 / 0 / 1). */
export const AXIS_THRESHOLD = 0.5;

const btn = (index: number): PadControl => ({ type: 'button', index });
const axis = (index: number, direction: 1 | -1): PadControl => ({ type: 'axis', index, direction });
const hat = (direction: HatDirection, index = 9): PadControl => ({ type: 'hat', index, direction });

/**
 * Pads the browser reports in the "standard" layout. Face buttons are numbered
 * by position, so on a SNES-style pad: 0 = B (bottom), 1 = A (right),
 * 2 = Y (left), 3 = X (top), 4/5 = L/R, 8 = Select, 9 = Start, 12-15 = D-pad.
 * Mario style: B jumps, hold Y (or L/R) to sprint, A or X barks, Start pauses,
 * Select swaps between Melody and the boy.
 */
export const STANDARD_MAPPING: GamepadMapping = {
  name: 'controller',
  controls: {
    left: [btn(14), axis(0, -1)],
    right: [btn(15), axis(0, 1)],
    up: [btn(12), axis(1, -1)],
    down: [btn(13), axis(1, 1)],
    jump: [btn(0)],
    sprint: [btn(2), btn(4), btn(5)],
    bark: [btn(1), btn(3)],
    pause: [btn(9)],
    switchCharacter: [btn(8)],
  },
};

/**
 * Retrolink / Retro-bit SNES USB pads (and most unbranded ones - they share
 * the same "DragonRise" chip, USB id 0079:0011). Buttons: 0 = X, 1 = A,
 * 2 = B, 3 = Y, 4 = L, 5 = R, 8 = Select, 9 = Start. The D-pad is axes 0 and 1
 * (some report it as a hat on axis 9 instead, so both are listed).
 */
export const RETROLINK_MAPPING: GamepadMapping = {
  name: 'Retrolink SNES controller',
  controls: {
    left: [axis(0, -1), hat('left')],
    right: [axis(0, 1), hat('right')],
    up: [axis(1, -1), hat('up')],
    down: [axis(1, 1), hat('down')],
    jump: [btn(2)],
    sprint: [btn(3), btn(4), btn(5)],
    bark: [btn(1), btn(0)],
    pause: [btn(9)],
    switchCharacter: [btn(8)],
  },
};

/** Buffalo Classic USB Gamepad (0583:2060): 0 = B, 1 = A, 2 = Y, 3 = X, 4 = L, 5 = R, 6 = Select, 7 = Start. */
export const BUFFALO_MAPPING: GamepadMapping = {
  name: 'Buffalo SNES controller',
  controls: {
    left: [axis(0, -1), hat('left')],
    right: [axis(0, 1), hat('right')],
    up: [axis(1, -1), hat('up')],
    down: [axis(1, 1), hat('down')],
    jump: [btn(0)],
    sprint: [btn(2), btn(4), btn(5)],
    bark: [btn(1), btn(3)],
    pause: [btn(7)],
    switchCharacter: [btn(6)],
  },
};

/** Known controllers by USB vendor:product id (lowercase hex). */
const KNOWN_PADS: Record<string, { name: string; mapping: GamepadMapping }> = {
  '0079:0011': { name: 'Retrolink SNES controller', mapping: RETROLINK_MAPPING },
  '0583:2060': { name: 'Buffalo SNES controller', mapping: BUFFALO_MAPPING },
};
const KNOWN_VENDORS: Record<string, string> = {
  '0079': 'USB controller',
  '2dc8': '8BitDo controller',
  '045e': 'Xbox controller',
  '054c': 'PlayStation controller',
  '057e': 'Nintendo controller',
  '0f0d': 'Hori controller',
  '0e6f': 'PDP controller',
};

/** The USB vendor and product ids inside a browser gamepad id, if it has them. */
export function parseVendorProduct(id: string): { vendor: string; product: string } | null {
  const chrome = /Vendor:\s*([0-9a-f]{1,4})\s+Product:\s*([0-9a-f]{1,4})/i.exec(id);
  const firefox = /^([0-9a-f]{1,4})-([0-9a-f]{1,4})-/i.exec(id);
  const m = chrome ?? firefox;
  if (!m) return null;
  return { vendor: m[1].toLowerCase().padStart(4, '0'), product: m[2].toLowerCase().padStart(4, '0') };
}

/** A friendly name for a controller. */
export function padName(pad: Pick<PadSnapshot, 'id'>): string {
  const vp = parseVendorProduct(pad.id);
  if (vp) {
    const known = KNOWN_PADS[`${vp.vendor}:${vp.product}`];
    if (known) return known.name;
    if (KNOWN_VENDORS[vp.vendor]) return KNOWN_VENDORS[vp.vendor];
  }
  // "Xbox 360 Controller (XInput STANDARD GAMEPAD)" -> "Xbox 360 Controller"
  const plain = pad.id.replace(/\(.*$/, '').replace(/^[0-9a-f]{1,4}-[0-9a-f]{1,4}-/i, '').trim();
  return plain || 'controller';
}

/** The ready-made mapping for a controller (before any custom setup). */
export function presetFor(pad: Pick<PadSnapshot, 'id' | 'mapping'>): GamepadMapping {
  const name = padName(pad);
  // The browser has already arranged it by position: use the standard layout.
  if (pad.mapping === 'standard') return { ...STANDARD_MAPPING, name };
  const vp = parseVendorProduct(pad.id);
  const known = vp && KNOWN_PADS[`${vp.vendor}:${vp.product}`];
  if (known) return known.mapping;
  // Unknown non-standard pad: most cheap SNES pads use the Retrolink layout.
  return { ...RETROLINK_MAPPING, name };
}

// --- Reading a pad ----------------------------------------------------------------

const HAT_DIRECTIONS: HatDirection[][] = [
  ['up'],
  ['up', 'right'],
  ['right'],
  ['down', 'right'],
  ['down'],
  ['down', 'left'],
  ['left'],
  ['up', 'left'],
];

/**
 * Some pads (on Windows especially) report the D-pad as one "hat" axis with
 * 8 positions spread from -1 (up) to 1 (up-left), and a value outside -1..1
 * when nothing is pressed. Returns the directions held, or [] for none.
 * A normal axis resting at 0 isn't a hat position, so it reads as [].
 */
export function hatDirections(value: number | undefined): HatDirection[] {
  if (value === undefined || !Number.isFinite(value) || Math.abs(value) > 1.01) return [];
  const k = Math.round((value + 1) * 3.5);
  if (Math.abs(value - (k / 3.5 - 1)) > 0.04) return [];
  return HAT_DIRECTIONS[k] ?? [];
}

export function controlActive(pad: PadSnapshot, control: PadControl): boolean {
  switch (control.type) {
    case 'button': {
      const b = pad.buttons[control.index];
      return !!b && (b.pressed || (b.value ?? 0) > 0.5);
    }
    case 'axis':
      return (pad.axes[control.index] ?? 0) * control.direction > AXIS_THRESHOLD;
    case 'hat':
      return hatDirections(pad.axes[control.index]).includes(control.direction);
  }
}

/** Is any of these controls held? */
export function anyActive(pad: PadSnapshot, controls: readonly PadControl[]): boolean {
  return controls.some((c) => controlActive(pad, c));
}

/** One pad's state as game input. */
export function readPad(pad: PadSnapshot, mapping: GamepadMapping): RawInputState {
  const c = mapping.controls;
  const state = emptyInputState();
  state.moveX = (anyActive(pad, c.right) ? 1 : 0) - (anyActive(pad, c.left) ? 1 : 0);
  state.moveY = (anyActive(pad, c.down) ? 1 : 0) - (anyActive(pad, c.up) ? 1 : 0);
  state.buttons.jump = anyActive(pad, c.jump);
  state.buttons.sprint = anyActive(pad, c.sprint);
  state.buttons.bark = anyActive(pad, c.bark);
  // The boy's action is on the same button as Melody's bark.
  state.buttons.use = state.buttons.bark;
  state.buttons.pause = anyActive(pad, c.pause);
  // (?? []: mappings saved before this button existed don't have it)
  state.buttons.switchCharacter = anyActive(pad, c.switchCharacter ?? []);
  // In menus, either main face button picks the highlighted option.
  state.buttons.confirm = state.buttons.jump || state.buttons.bark;
  return state;
}

// --- Controller setup -----------------------------------------------------------

/**
 * The first control that has changed since `rest` (a snapshot taken while
 * nothing was pressed): a newly pressed button, a D-pad hat direction, or an
 * axis pushed well away from where it rests. null if nothing changed.
 */
export function detectNewControl(rest: PadSnapshot, now: PadSnapshot): PadControl | null {
  for (let i = 0; i < now.buttons.length; i++) {
    const was = rest.buttons[i];
    if (controlActive(now, btn(i)) && !(was && (was.pressed || (was.value ?? 0) > 0.5))) return btn(i);
  }
  for (let i = 0; i < now.axes.length; i++) {
    const before = rest.axes[i] ?? 0;
    const value = now.axes[i];
    // A hat resting outside -1..1 that now points one way.
    if (Math.abs(before) > 1.01) {
      const dirs = hatDirections(value);
      if (dirs.length === 1) return hat(dirs[0], i);
      continue;
    }
    if (Math.abs(value - before) > 0.6 && Math.abs(value) > AXIS_THRESHOLD) return axis(i, value > 0 ? 1 : -1);
  }
  return null;
}

/** Short description for the setup screen, e.g. "button 2" or "D-pad left". */
export function describeControl(control: PadControl): string {
  switch (control.type) {
    case 'button':
      return `button ${control.index}`;
    case 'axis':
      return `axis ${control.index} ${control.direction > 0 ? '+' : '-'}`;
    case 'hat':
      return `D-pad ${control.direction}`;
  }
}

/** The order the setup screen asks for things, with what to show the player. */
export const SETUP_STEPS: { action: PadAction; prompt: string; suggest: string }[] = [
  { action: 'left', prompt: 'Press LEFT on the D-pad', suggest: 'left' },
  { action: 'right', prompt: 'Press RIGHT on the D-pad', suggest: 'right' },
  { action: 'up', prompt: 'Press UP on the D-pad', suggest: 'up' },
  { action: 'down', prompt: 'Press DOWN on the D-pad', suggest: 'down' },
  { action: 'jump', prompt: 'Press the button for JUMP', suggest: 'B' },
  { action: 'sprint', prompt: 'Press the button for SPRINT (hold it to run fast)', suggest: 'Y' },
  { action: 'bark', prompt: 'Press the button for BARK (and the boy\'s action)', suggest: 'A' },
  { action: 'pause', prompt: 'Press START (pause)', suggest: 'START' },
  { action: 'switchCharacter', prompt: 'Press SELECT (swap Melody and the boy)', suggest: 'SELECT' },
];

/** Build a mapping from what the player pressed in setup. */
export function mappingFromSetup(name: string, picked: Partial<Record<PadAction, PadControl>>): GamepadMapping {
  const controls = {} as Record<PadAction, PadControl[]>;
  for (const action of PAD_ACTIONS) controls[action] = picked[action] ? [picked[action]!] : [];
  return { name, controls };
}
