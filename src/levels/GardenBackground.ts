import Phaser from 'phaser';
import { DISPLAY } from '@/config/display';
import { gardenAnimKey, gardenKey, type GardenImage } from '@/assets/artAssets';

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
  { image: 'bg-far', scrollX: 0.12, scrollY: 0.1, bottom: 380, depth: -40 },
  { image: 'bg-trees', scrollX: 0.3, scrollY: 0.25, bottom: 470, depth: -30 },
  { image: 'bg-fence', scrollX: 0.6, scrollY: 0.6, bottom: 492, depth: -20 },
];

/** Sunlight and air: tweak these to change the mood. */
export const GARDEN_LIGHT = {
  /** How bright the sunbeams are (0 = off), and how much they shimmer. */
  sunbeams: 0.55,
  shimmer: 0.15,
  /** Faint beams over the play area too. */
  frontBeams: 0.16,
  /** Specks of pollen drifting in the light. */
  motesPerSecond: 3,
  /** A flock of birds crosses the sky every this-many seconds (roughly). */
  birdsEvery: 18,
  /** How dark the corners of the screen are (0 = off, 1 = full). */
  vignette: 1,
};

/** Sky, sun, clouds, birds and scenery layers for 'garden' levels. Call update() every frame. */
export class GardenBackground {
  private readonly layers: { sprite: Phaser.GameObjects.TileSprite; def: ParallaxLayer }[] = [];
  private readonly clouds: { img: Phaser.GameObjects.Image; x: number; y: number; speed: number }[] = [];
  private readonly beams: Phaser.GameObjects.Image[] = [];
  private readonly birds: { img: Phaser.GameObjects.Sprite; vx: number; y: number; bob: number }[] = [];
  private drift = 0;
  private birdTimer = 4;

  constructor(
    private readonly scene: Phaser.Scene,
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

    // Sunbeams slanting down from the top right: behind the garden, and faintly over it.
    const beam = (depth: number, alpha: number) =>
      scene.add
        .image(DISPLAY.width, 0, gardenKey('fx-sunrays'))
        .setOrigin(1, 0)
        .setScrollFactor(0)
        .setDepth(depth)
        .setAlpha(alpha)
        .setBlendMode(Phaser.BlendModes.ADD);
    if (GARDEN_LIGHT.sunbeams > 0) this.beams.push(beam(-15, GARDEN_LIGHT.sunbeams));
    if (GARDEN_LIGHT.frontBeams > 0) this.beams.push(beam(38, GARDEN_LIGHT.frontBeams));

    // Pollen and dust drifting in the sunlight.
    if (GARDEN_LIGHT.motesPerSecond > 0) {
      scene.add
        .particles(0, 0, gardenKey('fx-mote'), {
          x: { min: DISPLAY.width * 0.3, max: DISPLAY.width },
          y: { min: 40, max: DISPLAY.height - 60 },
          lifespan: { min: 5000, max: 9000 },
          speedX: { min: -10, max: 4 },
          speedY: { min: -9, max: 3 },
          scale: { min: 0.5, max: 1 },
          alpha: { start: 0.9, end: 0 },
          frequency: 1000 / GARDEN_LIGHT.motesPerSecond,
          maxAliveParticles: 40,
          blendMode: Phaser.BlendModes.ADD,
        })
        .setScrollFactor(0)
        .setDepth(36);
    }

    // A very gentle vignette: the corners of the screen slightly darker, like a photo.
    if (GARDEN_LIGHT.vignette > 0) {
      scene.add
        .image(0, 0, gardenKey('fx-vignette'))
        .setOrigin(0, 0)
        .setDisplaySize(DISPLAY.width, DISPLAY.height)
        .setScrollFactor(0)
        .setDepth(45)
        .setAlpha(GARDEN_LIGHT.vignette);
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
    // the light breathes a little
    const shimmer = 1 - GARDEN_LIGHT.shimmer * (0.5 + 0.5 * Math.sin(this.drift * 0.7));
    this.beams.forEach((b, i) => b.setAlpha((i === 0 ? GARDEN_LIGHT.sunbeams : GARDEN_LIGHT.frontBeams) * shimmer));
    this.updateBirds(dt, below);
  }

  /** Now and then a little flock flies across the sky in the distance. */
  private updateBirds(dt: number, below: number): void {
    this.birdTimer -= dt;
    if (this.birdTimer <= 0 && GARDEN_LIGHT.birdsEvery > 0) {
      this.birdTimer = GARDEN_LIGHT.birdsEvery * Phaser.Math.FloatBetween(0.6, 1.4);
      const fromLeft = Math.random() < 0.5;
      const y = Phaser.Math.Between(40, 150);
      const count = Phaser.Math.Between(3, 5);
      for (let i = 0; i < count; i++) {
        const img = this.scene.add
          .sprite(fromLeft ? -20 - i * 18 : DISPLAY.width + 20 + i * 18, 0, gardenKey('bird-far'))
          .setScrollFactor(0)
          .setDepth(-35)
          .setFlipX(!fromLeft);
        img.play({ key: gardenAnimKey('bird-far'), startFrame: i % 2 });
        img.anims.timeScale = Phaser.Math.FloatBetween(0.8, 1.2);
        this.birds.push({ img, vx: (fromLeft ? 1 : -1) * Phaser.Math.Between(38, 52), y: y + (i % 2) * 8 - i * 3, bob: Math.random() * 6 });
      }
    }
    for (let i = this.birds.length - 1; i >= 0; i--) {
      const b = this.birds[i];
      b.img.x += b.vx * dt;
      b.bob += dt;
      b.img.y = b.y + Math.sin(b.bob * 2) * 3 + below * 0.1;
      if (b.img.x < -80 || b.img.x > DISPLAY.width + 80) {
        b.img.destroy();
        this.birds.splice(i, 1);
      }
    }
  }
}
