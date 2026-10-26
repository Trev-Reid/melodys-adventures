import Phaser from 'phaser';
import { DISPLAY } from '@/config/display';
import { BootScene } from '@/scenes/BootScene';
import { LevelScene } from '@/scenes/LevelScene';
import { HudScene } from '@/scenes/HudScene';
import { DebugScene } from '@/scenes/DebugScene';
import { AnimationGalleryScene } from '@/scenes/AnimationGalleryScene';
import { PauseScene } from '@/scenes/PauseScene';
import { ControllerSetupScene } from '@/scenes/ControllerSetupScene';

/** ?review=<shot>: screenshots for art review must come out the same every time (src/review). */
const reviewing = new URLSearchParams(window.location.search).has('review');

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  ...(reviewing ? { seed: ['melody-review'] } : {}),
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
    // Controllers are read directly (core/input/gamepad), not by Phaser's plugin.
    gamepad: false,
  },
  scene: [BootScene, LevelScene, HudScene, DebugScene, AnimationGalleryScene, PauseScene, ControllerSetupScene],
};

export const game = new Phaser.Game(config);
