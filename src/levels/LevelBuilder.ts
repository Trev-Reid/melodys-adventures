import Phaser from 'phaser';
import {
  DEFAULT_PLATFORM_HEIGHT,
  type LevelDefinition,
  type PlatformDefinition,
  type SignDefinition,
} from './LevelDefinition';
import { TEXTURES } from '@/assets/keys';
import { Collectible } from '@/entities/collectibles/Collectible';
import { Obstacle } from '@/entities/obstacles/Obstacle';
import { ScentTrail } from '@/entities/scent/ScentTrail';
import { PointOfInterest } from '@/entities/scent/PointOfInterest';

export interface BuiltLevel {
  definition: LevelDefinition;
  /** Everything characters should collide with. */
  solids: Phaser.GameObjects.GameObject[];
  collectibles: Collectible[];
  obstacles: Obstacle[];
  scentTrails: ScentTrail[];
  pointsOfInterest: PointOfInterest[];
}

/** Turns a LevelDefinition into Phaser objects inside a scene. */
export function buildLevel(scene: Phaser.Scene, level: LevelDefinition): BuiltLevel {
  scene.cameras.main.setBackgroundColor(level.skyColor);
  scene.physics.world.setBounds(0, 0, level.width, level.height);

  addBackground(scene, level);

  const solids = level.platforms.map((p) => addPlatform(scene, p));

  if (level.showDistanceMarkers) addDistanceMarkers(scene, level);

  for (const sign of level.signs ?? []) addSign(scene, sign);

  const collectibles = (level.collectibles ?? []).map((def) => new Collectible(scene, def));

  const obstacles = (level.obstacles ?? []).map((def) => new Obstacle(scene, def));

  const scentTrails = (level.scentTrails ?? []).map((def) => new ScentTrail(scene, def));
  const pointsOfInterest = (level.pointsOfInterest ?? []).map((def) => new PointOfInterest(scene, def));

  return { definition: level, solids, collectibles, obstacles, scentTrails, pointsOfInterest };
}

function addPlatform(scene: Phaser.Scene, p: PlatformDefinition): Phaser.GameObjects.TileSprite {
  const height = p.height ?? DEFAULT_PLATFORM_HEIGHT;
  const texture = p.kind === 'ground' ? TEXTURES.groundTile : TEXTURES.platformTile;

  const sprite = scene.add.tileSprite(p.x, p.y, p.width, height, texture).setOrigin(0, 0);
  scene.physics.add.existing(sprite, true);

  if (p.kind === 'ground') {
    // Decorative grass edge (no physics) so tall blocks don't repeat it.
    scene.add.tileSprite(p.x, p.y, p.width, 10, TEXTURES.grassTop).setOrigin(0, 0);
  }

  if (p.oneWay) {
    const body = sprite.body as Phaser.Physics.Arcade.StaticBody;
    body.checkCollision.down = false;
    body.checkCollision.left = false;
    body.checkCollision.right = false;
    sprite.setAlpha(0.85);
  }
  return sprite;
}

function addBackground(scene: Phaser.Scene, level: LevelDefinition): void {
  // Distant hills and clouds scroll slower than the world (parallax).
  for (let x = -200; x < level.width; x += 520) {
    scene.add.image(x, level.height - 40, TEXTURES.hill).setOrigin(0, 1).setScrollFactor(0.4, 1).setDepth(-20);
  }
  const rng = new Phaser.Math.RandomDataGenerator([level.key]);
  for (let x = 0; x < level.width; x += 380) {
    scene.add
      .image(x + rng.between(0, 200), rng.between(60, level.height - 500), TEXTURES.cloud)
      .setScrollFactor(0.2, 0.6)
      .setDepth(-30);
  }
}

function addDistanceMarkers(scene: Phaser.Scene, level: LevelDefinition): void {
  const style = { fontFamily: 'monospace', fontSize: '12px', color: '#2d4a22' };
  const groundTop = level.height - 64;
  for (let x = 0; x <= level.width; x += 256) {
    scene.add.rectangle(x, groundTop, 2, 16, 0x2d4a22, 0.5).setOrigin(0.5, 1).setDepth(-5);
    scene.add.text(x + 4, groundTop - 28, `${x}`, style).setDepth(-5).setAlpha(0.7);
  }
}

function addSign(scene: Phaser.Scene, sign: SignDefinition): void {
  const text = scene.add
    .text(sign.x, 0, sign.text, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '15px',
      fontStyle: 'bold',
      color: '#4a2c14',
      align: 'center',
      wordWrap: { width: 180 },
    })
    .setOrigin(0.5, 0)
    .setDepth(-3);

  const postHeight = 26;
  const boardW = text.width + 20;
  const boardH = text.height + 12;
  const boardTop = sign.y - postHeight - boardH;
  text.setY(boardTop + 6);

  const g = scene.add.graphics().setDepth(-4);
  g.fillStyle(0x8d5a2b).fillRect(sign.x - 3, sign.y - postHeight - 2, 6, postHeight + 2);
  g.fillStyle(0x6d4320).fillRoundedRect(sign.x - boardW / 2 - 2, boardTop - 2, boardW + 4, boardH + 4, 6);
  g.fillStyle(0xe9c690).fillRoundedRect(sign.x - boardW / 2, boardTop, boardW, boardH, 5);
}
