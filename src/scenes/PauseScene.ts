import Phaser from 'phaser';
import { SCENES } from './keys';
import { DISPLAY } from '@/config/display';
import { createPlayerInput } from '@/core/input/createPlayerInput';
import type { InputManager } from '@/core/input/InputManager';
import { connectedPads } from '@/core/input/gamepad/GamepadInputSource';
import { clearCustomMapping, hasCustomMapping } from '@/core/input/gamepad/gamepadSettings';
import { LEVELS, levelKeys } from '@/levels';
import { sfx } from '@/core/audio/Sfx';
import { gardenKey } from '@/assets/artAssets';
import type { LevelSceneData } from './LevelScene';

export interface PauseSceneData {
  levelKey: string;
}

type ItemId = 'resume' | 'restart' | 'level' | 'sound' | 'controller' | 'resetController';

const PANEL = { width: 460, height: 360 };
const ITEM_GAP = 42;

const TITLE_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: 'Arial, sans-serif',
  fontSize: '34px',
  fontStyle: 'bold',
  color: '#ffffff',
  stroke: '#4a2c14',
  strokeThickness: 6,
};
const ITEM_STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: 'Arial, sans-serif',
  fontSize: '22px',
  fontStyle: 'bold',
  color: '#4a2c14',
};

/**
 * The pause menu (Start on a controller, Esc or P on the keyboard). Choose
 * with the D-pad / arrow keys, pick with B, A, Enter or Space.
 */
export class PauseScene extends Phaser.Scene {
  private input$!: InputManager;
  private levelKey!: string;
  private levels: string[] = [];
  private levelChoice = 0;
  private items: { id: ItemId; text: Phaser.GameObjects.Text }[] = [];
  private selected = 0;
  private cursor!: Phaser.GameObjects.Image;
  private highlight!: Phaser.GameObjects.Graphics;

  constructor() {
    super(SCENES.pause);
  }

  create(data: PauseSceneData): void {
    this.levelKey = data.levelKey;
    this.levels = levelKeys().filter((k) => LEVELS[k]);
    this.levelChoice = Math.max(0, this.levels.indexOf(data.levelKey));
    this.selected = 0;
    this.input$ = createPlayerInput(this);
    this.input$.settle();

    const { width: W, height: H } = DISPLAY;
    this.add.rectangle(0, 0, W, H, 0x0f1a14, 0.55).setOrigin(0, 0);

    const left = (W - PANEL.width) / 2;
    const top = (H - PANEL.height) / 2;
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.3).fillRoundedRect(left + 6, top + 8, PANEL.width, PANEL.height, 18);
    g.fillStyle(0x6d4320).fillRoundedRect(left - 4, top - 4, PANEL.width + 8, PANEL.height + 8, 20);
    g.fillStyle(0xe9c690).fillRoundedRect(left, top, PANEL.width, PANEL.height, 16);
    g.fillStyle(0xf6dcae).fillRoundedRect(left + 6, top + 6, PANEL.width - 12, 8, 4);

    this.add.text(W / 2, top - 6, 'Paused', TITLE_STYLE).setOrigin(0.5, 0.5);
    this.highlight = this.add.graphics();
    this.cursor = this.add.image(0, 0, gardenKey('bone')).setScale(1.2);

    const ids: ItemId[] = ['resume', 'restart', 'level', 'sound', 'controller'];
    if (connectedPads().some((p) => hasCustomMapping(p.id))) ids.push('resetController');
    this.items = ids.map((id, i) => ({
      id,
      text: this.add.text(W / 2, top + 56 + i * ITEM_GAP, '', ITEM_STYLE).setOrigin(0.5, 0.5),
    }));

    this.add
      .text(W / 2, top + PANEL.height - 22, 'D-pad or arrows to choose  ·  B / A / Enter to pick  ·  Start / Esc to play', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '12px',
        color: '#6d4320',
      })
      .setOrigin(0.5, 0.5);

    this.refresh();
    this.events.on(Phaser.Scenes.Events.WAKE, () => {
      this.input$.settle();
      this.refresh();
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.input$.destroy());
  }

  override update(): void {
    const input = this.input$;
    input.update();
    if (input.justPressed('pause')) {
      this.resume();
      return;
    }
    const dy = input.justMovedY();
    if (dy) {
      this.selected = (this.selected + dy + this.items.length) % this.items.length;
      sfx.play('menuMove');
      this.refresh();
    }
    const dx = input.justMovedX();
    if (dx && this.items[this.selected].id === 'level' && this.levels.length > 1) {
      this.levelChoice = (this.levelChoice + dx + this.levels.length) % this.levels.length;
      sfx.play('menuMove');
      this.refresh();
    }
    if (input.justPressed('confirm')) this.choose(this.items[this.selected].id);
  }

  private label(id: ItemId): string {
    switch (id) {
      case 'resume':
        return 'Keep playing';
      case 'restart':
        return 'Start this level again';
      case 'level': {
        const key = this.levels[this.levelChoice];
        return `Level:   ${LEVELS[key]?.name ?? key}`;
      }
      case 'sound':
        return `Sound: ${sfx.muted ? 'off' : 'on'}`;
      case 'controller':
        return 'Set up controller';
      case 'resetController':
        return 'Use standard controller buttons';
    }
  }

  private refresh(): void {
    this.items.forEach((item, i) => item.text.setText(this.label(item.id)).setColor(i === this.selected ? '#2b1608' : '#7a5230'));
    const item = this.items[this.selected];
    const b = item.text.getBounds();
    const arrows = item.id === 'level' && this.levels.length > 1;
    const padLeft = arrows ? 92 : 68;
    const padRight = arrows ? 44 : 24;
    const g = this.highlight.clear();
    g.fillStyle(0xfff3c4, 1).fillRoundedRect(b.x - padLeft, b.y - 6, b.width + padLeft + padRight, b.height + 12, 10);
    g.lineStyle(2, 0xc9953f, 1).strokeRoundedRect(b.x - padLeft, b.y - 6, b.width + padLeft + padRight, b.height + 12, 10);
    if (arrows) {
      // little arrows: left/right changes the level
      const y = b.centerY;
      g.fillStyle(0xc9953f, 1);
      g.fillTriangle(b.x - 30, y, b.x - 20, y - 7, b.x - 20, y + 7);
      g.fillTriangle(b.right + 30, y, b.right + 20, y - 7, b.right + 20, y + 7);
    }
    this.cursor.setPosition(b.x - padLeft + 30, b.centerY);
  }

  private choose(id: ItemId): void {
    sfx.play('menuSelect');
    switch (id) {
      case 'resume':
        this.resume();
        return;
      case 'restart':
        this.startLevel(this.levelKey);
        return;
      case 'level':
        this.startLevel(this.levels[this.levelChoice] ?? this.levelKey);
        return;
      case 'sound':
        sfx.toggleMute();
        this.refresh();
        return;
      case 'controller':
        // Hide the menu while the setup screen is up; it wakes us when done.
        this.scene.launch(SCENES.controllerSetup);
        this.scene.sleep();
        return;
      case 'resetController':
        for (const pad of connectedPads()) clearCustomMapping(pad.id);
        this.items = this.items.filter((i) => {
          if (i.id === 'resetController') i.text.destroy();
          return i.id !== 'resetController';
        });
        this.selected = 0;
        this.refresh();
        return;
    }
  }

  private resume(): void {
    this.scene.resume(SCENES.level);
    this.scene.stop();
  }

  private startLevel(levelKey: string): void {
    const level = this.scene.get(SCENES.level);
    this.scene.stop();
    level.scene.restart({ levelKey } satisfies LevelSceneData);
  }
}
