import Phaser from 'phaser';
import { SCENES } from './keys';

export interface DebugSceneData {
  title: string;
  /** Called every frame to get the text to show. */
  lines: () => string[];
}

/**
 * A HUD-style overlay that runs on top of the level scene. Being its own
 * scene keeps it unaffected by camera movement/zoom, and any scene can feed
 * it lines of text.
 */
export class DebugScene extends Phaser.Scene {
  private text?: Phaser.GameObjects.Text;
  private data$?: DebugSceneData;
  private visible = true;

  constructor() {
    super(SCENES.debug);
  }

  create(data: DebugSceneData): void {
    this.data$ = data;
    this.text = this.add
      .text(8, 8, '', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#ffffff',
        backgroundColor: 'rgba(0,0,0,0.55)',
        padding: { x: 8, y: 6 },
      })
      .setDepth(1000);
    this.text.setVisible(this.visible);
  }

  setOverlayVisible(visible: boolean): void {
    this.visible = visible;
    this.text?.setVisible(visible);
  }

  override update(): void {
    if (!this.text || !this.data$ || !this.visible) return;
    this.text.setText([
      `${this.data$.title}   [F3 / \` toggles debug]`,
      ...this.data$.lines(),
      '',
      '←/→ or A/D move · Space/↑/W jump · Shift sprint · B bark · R respawn · M mute',
    ]);
  }
}
