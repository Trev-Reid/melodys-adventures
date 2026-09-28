import Phaser from 'phaser';
import { DISPLAY } from '@/config/display';
import { BootScene } from '@/scenes/BootScene';
import { LevelScene } from '@/scenes/LevelScene';
import { HudScene } from '@/scenes/HudScene';
import { DebugScene } from '@/scenes/DebugScene';
import { AnimationGalleryScene } from '@/scenes/AnimationGalleryScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  width: DISPLAY.width,
  height: DISPLAY.height,
  backgroundColor: DISPLAY.backgroundColor,
  // Draw sprites on whole pixels: keeps pixel art crisp and stops edge shimmer.
  roundPixels: true,
  scale: {
    // Keep the 16:9 virtual resolution and fit it to any window size.
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: {
      // Gravity is per-character (see config/movement.ts), not global.
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  input: {
    // Ready for controller support later.
    gamepad: true,
  },
  scene: [BootScene, LevelScene, HudScene, DebugScene, AnimationGalleryScene],
};

export const game = new Phaser.Game(config);
