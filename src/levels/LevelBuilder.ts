import Phaser from 'phaser';
import {
  DEFAULT_PLATFORM_HEIGHT,
  type DecorationDefinition,
  type LevelDefinition,
  type PlatformDefinition,
  type PlatformStyle,
  type SignDefinition,
} from './LevelDefinition';
import { gardenKey, type GardenImage } from '@/assets/artAssets';
import { DECORATION_TYPES, type DecorationSolid } from '@/config/decorations';
import { GardenBackground } from './GardenBackground';
import { TEXTURES } from '@/assets/keys';
import { Collectible } from '@/entities/collectibles/Collectible';
import { Obstacle } from '@/entities/obstacles/Obstacle';
import { ScentTrail } from '@/entities/scent/ScentTrail';
import { PointOfInterest } from '@/entities/scent/PointOfInterest';
import { BarkTarget } from '@/entities/bark/BarkTarget';

export interface BuiltLevel {
  definition: LevelDefinition;
  /** Everything characters should collide with. */
  solids: Phaser.GameObjects.GameObject[];
  collectibles: Collectible[];
  obstacles: Obstacle[];
  scentTrails: ScentTrail[];
  pointsOfInterest: PointOfInterest[];
  barkTargets: BarkTarget[];
  /** Scenery layers that need updating as the camera moves (garden levels). */
  background?: GardenBackground;
  /** Solid things that bounce Melody (trampolines), with their bounce speeds. */
  bouncers: { body: Phaser.GameObjects.Zone; bounce: NonNullable<DecorationSolid['bounce']> }[];
}

/** Depths: background scenery < decorations < signs < platforms < items < Melody (10) < front scenery. */
const DEPTH = { decorationBack: -6, platform: 0, platformTop: 1, decorationFront: 40 };

/** Turns a LevelDefinition into Phaser objects inside a scene. */
export function buildLevel(scene: Phaser.Scene, level: LevelDefinition): BuiltLevel {
  scene.cameras.main.setBackgroundColor(level.skyColor);
  scene.physics.world.setBounds(0, 0, level.width, level.height);

  const garden = level.theme === 'garden';
  let background: GardenBackground | undefined;
  if (garden) background = new GardenBackground(scene, level.height);
  else addBackground(scene, level);

  const defaultStyle = (p: PlatformDefinition): PlatformStyle =>
    p.style ?? (garden ? (p.kind === 'ground' ? 'grass' : 'wood') : 'classic');
  const solids: Phaser.GameObjects.GameObject[] = level.platforms.map((p) => {
    const style = defaultStyle(p);
    return style === 'classic' ? addPlatform(scene, p) : addStyledPlatform(scene, p, style);
  });

  const bouncers: BuiltLevel['bouncers'] = [];
  for (const dec of level.decorations ?? []) {
    for (const solid of addDecoration(scene, dec)) {
      if (solid.bounce) bouncers.push({ body: solid.body, bounce: solid.bounce });
      else solids.push(solid.body);
    }
  }

  if (level.showDistanceMarkers) addDistanceMarkers(scene, level);

  for (const sign of level.signs ?? []) addSign(scene, sign);

  const collectibles = (level.collectibles ?? []).map((def) => new Collectible(scene, def));

  const obstacles = (level.obstacles ?? []).map((def) => new Obstacle(scene, def));

  const scentTrails = (level.scentTrails ?? []).map((def) => new ScentTrail(scene, def));
  const pointsOfInterest = (level.pointsOfInterest ?? []).map((def) => new PointOfInterest(scene, def));

  const barkTargets = (level.barkTargets ?? []).map((def) => new BarkTarget(scene, def));

  return { definition: level, solids, collectibles, obstacles, scentTrails, pointsOfInterest, barkTargets, background, bouncers };
}

/** What each platform style is made of: a fill that repeats, and an edge laid along the top. */
const STYLE_ART: Record<Exclude<PlatformStyle, 'classic'>, { fill: GardenImage; top?: { image: GardenImage; offset: number } }> = {
  grass: { fill: 'tile-dirt', top: { image: 'tile-grass-top', offset: 8 } },
  stone: { fill: 'tile-stone', top: { image: 'tile-grass-top', offset: 8 } },
  gravel: { fill: 'tile-stone', top: { image: 'tile-gravel-top', offset: 4 } },
  wood: { fill: 'tile-wood' },
  slab: { fill: 'tile-slab' },
};

function addStyledPlatform(scene: Phaser.Scene, p: PlatformDefinition, style: Exclude<PlatformStyle, 'classic'>) {
  const height = p.height ?? DEFAULT_PLATFORM_HEIGHT;
  const art = STYLE_ART[style];
  const sprite = scene.add.tileSprite(p.x, p.y, p.width, height, gardenKey(art.fill)).setOrigin(0, 0).setDepth(DEPTH.platform);
  // Thin boards and slabs: line the texture up with the top so the lit edge shows.
  sprite.tilePositionY = 0;
  scene.physics.add.existing(sprite, true);
  if (art.top) {
    const tex = scene.textures.get(gardenKey(art.top.image)).getSourceImage();
    scene.add
      .tileSprite(p.x, p.y - art.top.offset, p.width, tex.height, gardenKey(art.top.image))
      .setOrigin(0, 0)
      .setDepth(DEPTH.platformTop);
  }
  if (p.oneWay) {
    const body = sprite.body as Phaser.Physics.Arcade.StaticBody;
    body.checkCollision.down = false;
    body.checkCollision.left = false;
    body.checkCollision.right = false;
  }
  return sprite;
}

/** Draws a piece of scenery and creates its solid parts (if any). */
function addDecoration(scene: Phaser.Scene, dec: DecorationDefinition) {
  const type = DECORATION_TYPES[dec.kind];
  const scale = dec.scale ?? 1;
  const layer = dec.layer ?? type.layer;
  scene.add
    .image(dec.x, dec.y, gardenKey(type.image))
    .setOrigin(0.5, 1)
    .setScale(scale)
    .setFlipX(!!dec.flipX)
    .setDepth(layer === 'front' ? DEPTH.decorationFront : DEPTH.decorationBack);

  return (type.solids ?? []).map((s) => {
    const left = dec.flipX ? -(s.x + s.width) : s.x;
    const zone = scene.add.zone(dec.x + left * scale, dec.y + s.y * scale, s.width * scale, s.height * scale).setOrigin(0, 0);
    scene.physics.add.existing(zone, true);
    if (s.oneWay) {
      const body = zone.body as Phaser.Physics.Arcade.StaticBody;
      body.checkCollision.down = false;
      body.checkCollision.left = false;
      body.checkCollision.right = false;
    }
    return { body: zone, bounce: s.bounce };
  });
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
