import Phaser from 'phaser';
import { BUTTON_ACTIONS, emptyButtons, type RawInputState } from './actions';
import type { InputSource } from './InputSource';
import type { KeyboardBindings } from '@/config/controls';

type Key = Phaser.Input.Keyboard.Key;

/** Reads the keyboard using the bindings in config/controls.ts. */
export class KeyboardInputSource implements InputSource {
  readonly id = 'keyboard';
  private readonly left: Key[];
  private readonly right: Key[];
  private readonly buttons: Record<string, Key[]> = {};

  constructor(keyboard: Phaser.Input.Keyboard.KeyboardPlugin, bindings: KeyboardBindings) {
    const toKeys = (names: string[]): Key[] =>
      names.map((name) => {
        const code = Phaser.Input.Keyboard.KeyCodes[name as keyof typeof Phaser.Input.Keyboard.KeyCodes];
        if (code === undefined) throw new Error(`Unknown key name in controls config: "${name}"`);
        // enableCapture=true stops the browser scrolling on arrows/space.
        return keyboard.addKey(code, true);
      });

    this.left = toKeys(bindings.left);
    this.right = toKeys(bindings.right);
    for (const action of BUTTON_ACTIONS) this.buttons[action] = toKeys(bindings.buttons[action]);
  }

  read(): RawInputState {
    const anyDown = (keys: Key[]) => keys.some((k) => k.isDown);
    const buttons = emptyButtons();
    for (const action of BUTTON_ACTIONS) buttons[action] = anyDown(this.buttons[action]);

    return {
      moveX: (anyDown(this.right) ? 1 : 0) - (anyDown(this.left) ? 1 : 0),
      moveY: 0,
      buttons,
    };
  }
}
