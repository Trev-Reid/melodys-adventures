import Phaser from 'phaser';
import { SCENES } from './keys';
import { DISPLAY } from '@/config/display';
import { sfx } from '@/core/audio/Sfx';
import { createPlayerInput } from '@/core/input/createPlayerInput';
import type { InputManager } from '@/core/input/InputManager';
import { connectedPads } from '@/core/input/gamepad/GamepadInputSource';
import {
  SETUP_STEPS,
  describeControl,
  detectNewControl,
  mappingFromSetup,
  padName,
  type PadAction,
  type PadControl,
  type PadSnapshot,
} from '@/core/input/gamepad/gamepadMapping';
import { saveCustomMapping } from '@/core/input/gamepad/gamepadSettings';

type Phase = 'noPad' | 'letGo' | 'asking' | 'gotIt' | 'done';

/** How long (ms) everything must be let go before the next question. */
const RELEASE_MS = 150;

/** Where each part of the drawn controller is, relative to its centre. */
const PAD_PARTS: Record<string, { x: number; y: number; r: number }> = {
  left: { x: -128, y: 0, r: 15 },
  right: { x: -76, y: 0, r: 15 },
  up: { x: -102, y: -26, r: 15 },
  down: { x: -102, y: 26, r: 15 },
  B: { x: 102, y: 28, r: 19 },
  A: { x: 140, y: -2, r: 19 },
  Y: { x: 64, y: -2, r: 19 },
  X: { x: 102, y: -32, r: 19 },
  START: { x: 20, y: 12, r: 18 },
  SELECT: { x: -30, y: 12, r: 18 },
};

/** Copy a pad's state (some browsers update Gamepad objects in place). */
function snapshot(pad: PadSnapshot): PadSnapshot {
  return {
    id: pad.id,
    mapping: pad.mapping,
    axes: [...pad.axes],
    buttons: pad.buttons.map((b) => ({ pressed: b.pressed, value: b.value })),
  };
}

/**
 * Controller Setup: shows a SNES pad, lights up each control in turn and
 * records whatever you press. Saved per controller in this browser.
 * Opened from the pause menu. Esc cancels.
 */
export class ControllerSetupScene extends Phaser.Scene {
  private input$!: InputManager;
  private phase: Phase = 'noPad';
  private step = 0;
  private padId?: string;
  private rest?: PadSnapshot;
  private picked: Partial<Record<PadAction, PadControl>> = {};
  /**
   * When everything was let go (real time, ms), before asking for the next
   * control. Real time rather than game time so a slow computer can't make
   * the wait drag on or rush through.
   */
  private releasedAt?: number;
  private clock = 0;
  private padGfx!: Phaser.GameObjects.Graphics;
  private glow!: Phaser.GameObjects.Graphics;
  private prompt!: Phaser.GameObjects.Text;
  private detail!: Phaser.GameObjects.Text;
  private progress!: Phaser.GameObjects.Text;

  constructor() {
    super(SCENES.controllerSetup);
  }

  create(): void {
    this.phase = 'noPad';
    this.step = 0;
    this.picked = {};
    this.rest = undefined;
    this.input$ = createPlayerInput(this);
    this.input$.settle();
    const { width: W, height: H } = DISPLAY;

    this.add.rectangle(0, 0, W, H, 0x14231a, 0.94).setOrigin(0, 0);
    const text = (y: number, size: number, color = '#ffffff') =>
      this.add
        .text(W / 2, y, '', {
          fontFamily: 'Arial, sans-serif',
          fontSize: `${size}px`,
          fontStyle: 'bold',
          color,
          stroke: '#1b2a1f',
          strokeThickness: Math.round(size / 5),
          align: 'center',
        })
        .setOrigin(0.5, 0.5);

    text(48, 30).setText('Controller setup');
    this.progress = text(84, 15, '#cde8b5');
    this.padGfx = this.add.graphics();
    this.drawPad(W / 2, 230);
    this.glow = this.add.graphics();
    this.prompt = text(372, 26, '#ffe066');
    this.detail = text(412, 17, '#ffffff');
    text(H - 30, 13, '#9fbf96').setText('Esc on the keyboard to cancel');

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.input$.destroy());
  }

  override update(_time: number, deltaMs: number): void {
    this.clock += deltaMs / 1000;
    this.input$.update();
    if (this.input$.justPressed('pause') && this.input$.lastActiveSource === 'keyboard') {
      this.finish(false);
      return;
    }

    const pads = connectedPads();
    const pad = (this.padId && pads.find((p) => p.id === this.padId)) || pads[0];

    switch (this.phase) {
      case 'noPad':
        this.show('Plug in your controller', 'then press any button on it', '');
        if (pad) {
          this.padId = pad.id;
          this.phase = 'letGo';
        }
        break;

      case 'letGo':
        if (!pad) return this.reset();
        this.show('Let go of all the buttons...', padName(pad), '');
        // Remember how the pad looks when nothing is pressed.
        if (pad.buttons.every((b) => !b.pressed)) {
          this.rest = snapshot(pad);
          this.phase = 'asking';
        }
        break;

      case 'asking': {
        if (!pad || !this.rest) return this.reset();
        const s = SETUP_STEPS[this.step];
        this.show(s.prompt, s.suggest.length === 1 ? `We suggest ${s.suggest}` : '', `${this.step + 1} of ${SETUP_STEPS.length}`);
        const control = detectNewControl(this.rest, snapshot(pad));
        if (control) {
          this.picked[s.action] = control;
          this.detail.setText(`Got it! (${describeControl(control)})`);
          sfx.play('menuSelect');
          this.phase = 'gotIt';
          this.releasedAt = undefined;
        }
        break;
      }

      case 'gotIt':
        if (!pad || !this.rest) return this.reset();
        // Wait until everything has been let go for a moment before asking for the next one.
        if (detectNewControl(this.rest, snapshot(pad))) {
          this.releasedAt = undefined;
          break;
        }
        this.releasedAt ??= performance.now();
        if (performance.now() - this.releasedAt > RELEASE_MS) {
          this.step++;
          if (this.step >= SETUP_STEPS.length) {
            saveCustomMapping(pad.id, mappingFromSetup(padName(pad), this.picked));
            this.phase = 'done';
            this.show('All set!', `Saved for your ${padName(pad)}`, '');
            sfx.play('celebrate');
            this.time.delayedCall(1600, () => this.finish(true));
          } else {
            this.phase = 'asking';
          }
        }
        break;

      case 'done':
        break;
    }
    this.drawGlow();
  }

  private reset(): void {
    this.phase = 'noPad';
    this.step = 0;
    this.picked = {};
    this.padId = undefined;
  }

  private show(prompt: string, detail: string, progress: string): void {
    if (this.prompt.text !== prompt) this.prompt.setText(prompt);
    if (this.phase !== 'gotIt' && this.detail.text !== detail) this.detail.setText(detail);
    this.progress.setText(progress);
  }

  private finish(_saved: boolean): void {
    this.scene.wake(SCENES.pause);
    this.scene.stop();
  }

  /** Pulsing ring around the part of the controller we're asking for. */
  private drawGlow(): void {
    const g = this.glow.clear();
    if (this.phase !== 'asking') return;
    const part = PAD_PARTS[SETUP_STEPS[this.step].suggest];
    if (!part) return;
    const pulse = 0.5 + 0.5 * Math.sin(this.clock * 7);
    const cx = DISPLAY.width / 2 + part.x;
    const cy = 230 + part.y;
    g.fillStyle(0xffe066, 0.12 + 0.12 * pulse).fillCircle(cx, cy, part.r + 10 + pulse * 4);
    g.lineStyle(4, 0xffe066, 0.95).strokeCircle(cx, cy, part.r + 6 + pulse * 3);
  }

  /** A SNES-style controller (PAL colours: A red, B yellow, X blue, Y green). */
  private drawPad(cx: number, cy: number): void {
    const g = this.padGfx;
    const body = 0xc9c9d3;
    const dark = 0x2b2b33;
    // shoulder buttons
    g.fillStyle(0x9b9ba8).fillRoundedRect(cx - 190, cy - 92, 120, 30, 14).fillRoundedRect(cx + 70, cy - 92, 120, 30, 14);
    // body: two rounded ends joined in the middle
    g.fillStyle(0x7d7d8a).fillCircle(cx - 104, cy + 4, 96).fillCircle(cx + 104, cy + 4, 96).fillRect(cx - 104, cy - 92, 208, 192);
    g.fillStyle(body).fillCircle(cx - 104, cy, 92).fillCircle(cx + 104, cy, 92).fillRect(cx - 104, cy - 92, 208, 184);
    g.fillStyle(0xe2e2ea).fillRect(cx - 104, cy - 88, 208, 6);
    // D-pad
    g.fillStyle(0xa9a9b5).fillCircle(cx - 102, cy, 52);
    g.fillStyle(dark).fillRoundedRect(cx - 145, cy - 16, 86, 32, 5).fillRoundedRect(cx - 118, cy - 43, 32, 86, 5);
    g.fillStyle(0x45454f).fillCircle(cx - 102, cy, 8);
    // Select / Start
    g.fillStyle(0x8a8a96);
    for (const x of [cx - 30, cx + 20]) g.fillRoundedRect(x - 18, cy + 4, 36, 14, 7);
    // face buttons on a darker dish
    g.fillStyle(0xa9a9b5).fillCircle(cx + 102, cy - 2, 70);
    const face: [string, number][] = [['X', 0x3d6fd8], ['A', 0xd83d3d], ['B', 0xe8c23a], ['Y', 0x3dab4e]];
    for (const [name, colour] of face) {
      const p = PAD_PARTS[name];
      g.fillStyle(0x000000, 0.25).fillCircle(cx + p.x + 2, cy + p.y + 3, p.r);
      g.fillStyle(colour).fillCircle(cx + p.x, cy + p.y, p.r);
      g.fillStyle(0xffffff, 0.3).fillCircle(cx + p.x - 5, cy + p.y - 6, p.r * 0.35);
      this.add
        .text(cx + p.x, cy + p.y, name, { fontFamily: 'Arial, sans-serif', fontSize: '18px', fontStyle: 'bold', color: '#ffffff', stroke: '#00000055', strokeThickness: 3 })
        .setOrigin(0.5);
    }
    const small = { fontFamily: 'Arial, sans-serif', fontSize: '10px', fontStyle: 'bold', color: '#55555f' };
    this.add.text(cx - 30, cy + 26, 'SELECT', small).setOrigin(0.5, 0);
    this.add.text(cx + 20, cy + 26, 'START', small).setOrigin(0.5, 0);
    this.add.text(cx - 130, cy - 86, 'L', { ...small, fontSize: '14px' }).setOrigin(0.5, 0);
    this.add.text(cx + 130, cy - 86, 'R', { ...small, fontSize: '14px' }).setOrigin(0.5, 0);
  }
}
