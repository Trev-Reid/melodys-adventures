import Phaser from 'phaser';
import type { SignDefinition } from '@/levels/LevelDefinition';
import { fillPrompts, type InputDevice } from '@/core/input/buttonLabels';

const POST_HEIGHT = 26;

/**
 * A little wooden sign with a hint on it. Text can contain {jump}, {bark}...
 * which show the button for whatever the player is using (keyboard or controller).
 */
export class Sign {
  private readonly text: Phaser.GameObjects.Text;
  private readonly board: Phaser.GameObjects.Graphics;
  private device?: InputDevice;

  constructor(
    scene: Phaser.Scene,
    private readonly def: SignDefinition,
    device: InputDevice,
  ) {
    this.board = scene.add.graphics().setDepth(-4);
    this.text = scene.add
      .text(def.x, 0, '', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '15px',
        fontStyle: 'bold',
        color: '#4a2c14',
        align: 'center',
        wordWrap: { width: 180 },
      })
      .setOrigin(0.5, 0)
      .setDepth(-3);
    this.showFor(device);
  }

  /** Re-draw the sign for this input device (only if it changed). */
  showFor(device: InputDevice): void {
    if (device === this.device) return;
    this.device = device;
    const { x, y } = this.def;
    this.text.setText(fillPrompts(this.def.text, device));

    const boardW = this.text.width + 20;
    const boardH = this.text.height + 12;
    const boardTop = y - POST_HEIGHT - boardH;
    this.text.setY(boardTop + 6);

    const g = this.board.clear();
    // soft shadow on the ground, post, then the board
    g.fillStyle(0x000000, 0.18).fillEllipse(x, y + 1, 26, 6);
    g.fillStyle(0x8d5a2b).fillRect(x - 3, y - POST_HEIGHT - 2, 6, POST_HEIGHT + 2);
    g.fillStyle(0x6b4220).fillRect(x + 1, y - POST_HEIGHT - 2, 2, POST_HEIGHT + 2);
    g.fillStyle(0x000000, 0.15).fillRoundedRect(x - boardW / 2 + 1, boardTop + 3, boardW + 4, boardH + 4, 6);
    g.fillStyle(0x6d4320).fillRoundedRect(x - boardW / 2 - 2, boardTop - 2, boardW + 4, boardH + 4, 6);
    g.fillStyle(0xe9c690).fillRoundedRect(x - boardW / 2, boardTop, boardW, boardH, 5);
    g.fillStyle(0xf6dcae).fillRoundedRect(x - boardW / 2 + 2, boardTop + 2, boardW - 4, 3, 2);
  }
}
