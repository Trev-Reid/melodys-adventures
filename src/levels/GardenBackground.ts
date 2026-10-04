import Phaser from 'phaser';
import { DISPLAY } from '@/config/display';
import { gardenKey, type GardenImage } from '@/assets/artAssets';

/**
 * One background layer: a strip of art that repeats sideways and scrolls
 * slower than the world the further away it is (parallax).
 */
interface ParallaxLayer {
  image: GardenImage;
  /** 0 = fixed to the screen, 1 = moves with the world. */
  scrollX: number;
  scrollY: number;
  /** Where its bottom edge is on screen when the camera is at the bottom of the level. */
  bottom: number;
  depth: number;
}

/** The garden's background, far to near. Tweak `bottom` to raise or lower a layer. */
export const GARDEN_LAYERS: ParallaxLayer[] = [
  { image: 'bg-far', scrollX: 0.12, scrollY: 0.1, bottom: 360, depth: -40 },
  { image: 'bg-trees', scrollX: 0.3, scrollY: 0.25, bottom: 470, depth: -30 },
  { image: 'bg-fence', scrollX: 0.6, scrollY: 0.6, bottom: 490, depth: -20 },
];

/** Sky, drifting clouds and scenery layers for 'garden' levels. Call update() every frame. */
export class GardenBackground {
  private readonly layers: { sprite: Phaser.GameObjects.TileSprite; def: ParallaxLayer }[] = [];
  private readonly clouds: { img: Phaser.GameObjects.Image; x: number; y: number; speed: number }[] = [];
  private drift = 0;

  constructor(
    scene: Phaser.Scene,
    private readonly levelHeight: number,
  ) {
    scene.add
      .image(0, 0, gardenKey('bg-sky'))
      .setOrigin(0, 0)
      .setDisplaySize(DISPLAY.width, DISPLAY.height)
      .setScrollFactor(0)
      .setDepth(-60);

    const rng = new Phaser.Math.RandomDataGenerator(['clouds']);
    for (let i = 0; i < 5; i++) {
      const img = scene.add
        .image(0, 0, gardenKey(i % 2 ? 'cloud-2' : 'cloud-1'))
        .setScrollFactor(0)
        .setDepth(-50);
      this.clouds.push({ img, x: i * 260 + rng.between(0, 120), y: rng.between(30, 150), speed: rng.realInRange(4, 10) });
    }

    for (const def of GARDEN_LAYERS) {
      const tex = scene.textures.get(gardenKey(def.image)).getSourceImage();
      const sprite = scene.add
        .tileSprite(0, 0, DISPLAY.width, tex.height, gardenKey(def.image))
        .setOrigin(0, 1)
        .setScrollFactor(0)
        .setDepth(def.depth);
      this.layers.push({ sprite, def });
    }
  }

  update(camera: Phaser.Cameras.Scene2D.Camera, dt: number): void {
    const maxScrollY = Math.max(0, this.levelHeight - DISPLAY.height);
    const below = maxScrollY - camera.scrollY; // how far the camera is above the bottom
    for (const { sprite, def } of this.layers) {
      sprite.tilePositionX = camera.scrollX * def.scrollX;
      sprite.y = def.bottom + below * def.scrollY;
    }
    this.drift += dt;
    const span = DISPLAY.width + 300;
    for (const c of this.clouds) {
      const x = (((c.x - camera.scrollX * 0.05 - this.drift * c.speed) % span) + span) % span - 150;
      c.img.setPosition(x, c.y + below * 0.05);
    }
  }
}
