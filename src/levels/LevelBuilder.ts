import Phaser from 'phaser';
import {
  DEFAULT_PLATFORM_HEIGHT,
  type DecorationDefinition,
  type LevelDefinition,
  type PlatformDefinition,
  type PlatformStyle,
} from './LevelDefinition';
import { Sign } from '@/entities/Sign';
import type { InputDevice } from '@/core/input/buttonLabels';
import { GARDEN_SHEETS, gardenAnimKey, gardenKey, type GardenImage } from '@/assets/artAssets';
import { DECORATION_TYPES, type CritterKind, type DecorationSolid } from '@/config/decorations';
import { GardenBackground } from './GardenBackground';
import { TEXTURES } from '@/assets/keys';
import { Collectible } from '@/entities/collectibles/Collectible';
import { Obstacle } from '@/entities/obstacles/Obstacle';
import { ScentTrail } from '@/entities/scent/ScentTrail';
import { PointOfInterest } from '@/entities/scent/PointOfInterest';
import { BarkTarget } from '@/entities/bark/BarkTarget';
import { Gate } from '@/entities/teamwork/Gate';
import { Lever } from '@/entities/teamwork/Lever';
import { Lift } from '@/entities/teamwork/Lift';
import { Football } from '@/entities/teamwork/Football';
import type { Rect } from '@/gameplay/teamwork/teamworkRules';

export interface BuiltLevel {
  definition: LevelDefinition;
  /** Everything characters should collide with. */
  solids: Phaser.GameObjects.GameObject[];
  collectibles: Collectible[];
  obstacles: Obstacle[];
  scentTrails: ScentTrail[];
  pointsOfInterest: PointOfInterest[];
  barkTargets: BarkTarget[];
  /** Hint signs (they show keyboard or controller buttons). */
  signs: Sign[];
  /** Scenery layers that need updating as the camera moves (garden levels). */
  background?: GardenBackground;
  /** Solid things that bounce Melody (trampolines), with their bounce speeds. */
  bouncers: { body: Phaser.GameObjects.Zone; bounce: NonNullable<DecorationSolid['bounce']> }[];
  /** Where garden creatures live (butterflies, robins, the squirrel). */
  critters: CritterSpawn[];
  /** Areas leaves fall from (under tree canopies), and where the ground is below them. */
  leafAreas: LeafArea[];
  /** The boy's things: gates, levers, lifts, ladders, the football; and teamwork areas. */
  teamwork: TeamworkParts;
}

export interface TeamworkParts {
  gates: Gate[];
  levers: Lever[];
  lifts: Lift[];
  /** Ladders the boy can climb (drawn ones, and ones in pictures like the treehouse's). */
  ladders: Rect[];
  football?: Football;
  /** Places a left-behind character can't just pop into. */
  teamAreas: Rect[];
  /** Goal nets: get the football in for a GOAL! */
  ballZones: Rect[];
}

export interface CritterSpawn {
  kind: CritterKind;
  x: number;
  /** Where it stands or perches (its feet), or the middle of where it flies about. */
  y: number;
}

export interface LeafArea {
  x: number;
  y: number;
  width: number;
  height: number;
  /** Leaves fade out when they reach this height (the ground under the tree). */
  groundY: number;
}

/** Depths: background scenery < decorations < signs < platforms < shadows < items < Melody (10) < front scenery. */
const DEPTH = { decorationBack: -6, platform: 0, platformShade: 0.5, platformTop: 1, shadow: 1.5, decorationFront: 40 };

/** Turns a LevelDefinition into Phaser objects inside a scene. */
export function buildLevel(scene: Phaser.Scene, level: LevelDefinition, device: InputDevice = 'keyboard'): BuiltLevel {
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
    return style === 'classic' ? addPlatform(scene, p) : addStyledPlatform(scene, p, style, level.platforms);
  });

  const bouncers: BuiltLevel['bouncers'] = [];
  const life = { critters: [] as CritterSpawn[], leafAreas: [] as LeafArea[], ladders: [] as Rect[], ballZones: [] as Rect[] };
  for (const dec of level.decorations ?? []) {
    for (const solid of addDecoration(scene, dec, life)) {
      if (solid.bounce) bouncers.push({ body: solid.body, bounce: solid.bounce });
      else solids.push(solid.body);
    }
  }

  if (level.showDistanceMarkers) addDistanceMarkers(scene, level);

  const signs = (level.signs ?? []).map((def) => new Sign(scene, def, device));

  const collectibles = (level.collectibles ?? []).map((def) => new Collectible(scene, def));

  const obstacles = (level.obstacles ?? []).map((def) => new Obstacle(scene, def));

  const scentTrails = (level.scentTrails ?? []).map((def) => new ScentTrail(scene, def));
  const pointsOfInterest = (level.pointsOfInterest ?? []).map((def) => new PointOfInterest(scene, def));

  const barkTargets = (level.barkTargets ?? []).map((def) => new BarkTarget(scene, def));

  const teamwork = buildTeamwork(scene, level, life);
  for (const gate of teamwork.gates) solids.push(gate.door, gate.hedge);

  return {
    definition: level,
    solids,
    collectibles,
    obstacles,
    scentTrails,
    pointsOfInterest,
    barkTargets,
    signs,
    background,
    bouncers,
    critters: life.critters,
    leafAreas: life.leafAreas,
    teamwork,
  };
}

/** Gates, levers, lifts, ladders, the football and teamwork areas. */
function buildTeamwork(scene: Phaser.Scene, level: LevelDefinition, life: { ladders: Rect[]; ballZones: Rect[] }): TeamworkParts {
  const parts: TeamworkParts = { gates: [], levers: [], lifts: [], ladders: [...life.ladders], teamAreas: [], ballZones: life.ballZones };
  for (const def of level.interactables ?? []) {
    switch (def.kind) {
      case 'gate':
        parts.gates.push(new Gate(scene, def));
        break;
      case 'lever':
        parts.levers.push(new Lever(scene, def));
        break;
      case 'lift':
        parts.lifts.push(new Lift(scene, def));
        break;
      case 'ladder': {
        const rect = { x: def.x, y: def.y, width: def.width ?? 40, height: def.height ?? 200 };
        drawLadder(scene, rect);
        parts.ladders.push(rect);
        break;
      }
      case 'football':
        parts.football ??= new Football(scene, def.x, def.y);
        break;
      case 'teamArea':
        parts.teamAreas.push({ x: def.x, y: def.y, width: def.width ?? 0, height: def.height ?? 0 });
        break;
    }
  }
  return parts;
}

/** A wooden ladder (for ladders placed in Tiled; pictures like the treehouse draw their own). */
function drawLadder(scene: Phaser.Scene, r: Rect): void {
  const g = scene.add.graphics().setDepth(-4);
  const rail = 6;
  g.fillStyle(0x2b1d14).fillRect(r.x - 1, r.y, rail + 2, r.height).fillRect(r.x + r.width - rail - 1, r.y, rail + 2, r.height);
  for (let y = r.y + 14; y < r.y + r.height - 4; y += 24) g.fillStyle(0x2b1d14).fillRect(r.x, y - 1, r.width, 8);
  g.fillStyle(0x8c5a30).fillRect(r.x, r.y, rail, r.height).fillRect(r.x + r.width - rail, r.y, rail, r.height);
  g.fillStyle(0xab7442).fillRect(r.x, r.y, 2, r.height).fillRect(r.x + r.width - rail, r.y, 2, r.height);
  for (let y = r.y + 14; y < r.y + r.height - 4; y += 24) {
    g.fillStyle(0xab7442).fillRect(r.x + rail, y, r.width - rail * 2, 6);
    g.fillStyle(0xc99559).fillRect(r.x + rail, y, r.width - rail * 2, 2);
  }
}

/** What each platform style is made of: a fill that repeats, and an edge laid along the top. */
const STYLE_ART: Record<Exclude<PlatformStyle, 'classic'>, { fill: GardenImage; top?: { image: GardenImage; offset: number } }> = {
  grass: { fill: 'tile-dirt', top: { image: 'tile-grass-top', offset: 8 } },
  stone: { fill: 'tile-stone', top: { image: 'tile-grass-top', offset: 8 } },
  gravel: { fill: 'tile-stone', top: { image: 'tile-gravel-top', offset: 4 } },
  wood: { fill: 'tile-wood' },
  slab: { fill: 'tile-slab' },
};

function addStyledPlatform(
  scene: Phaser.Scene,
  p: PlatformDefinition,
  style: Exclude<PlatformStyle, 'classic'>,
  all: PlatformDefinition[],
) {
  const height = p.height ?? DEFAULT_PLATFORM_HEIGHT;
  const art = STYLE_ART[style];
  const sprite = scene.add.tileSprite(p.x, p.y, p.width, height, gardenKey(art.fill)).setOrigin(0, 0).setDepth(DEPTH.platform);
  // Thin boards and slabs: line the texture up with the top so the lit edge shows.
  sprite.tilePositionY = 0;
  scene.physics.add.existing(sprite, true);
  if (art.top) {
    const tex = scene.textures.get(gardenKey(art.top.image)).getSourceImage();
    // Shade under the grass overhang, so the top edge reads as a ledge.
    if (height > 30) {
      scene.add
        .tileSprite(p.x, p.y, p.width, Math.min(28, height), gardenKey('fx-shade-top'))
        .setOrigin(0, 0)
        .setDepth(DEPTH.platformShade);
    }
    scene.add
      .tileSprite(p.x, p.y - art.top.offset, p.width, tex.height, gardenKey(art.top.image))
      .setOrigin(0, 0)
      .setDepth(DEPTH.platformTop);
    // Rounded grass ends, unless the ground carries on (or a wall rises) next to it.
    if (style === 'grass' || style === 'stone') {
      const cap = scene.textures.get(gardenKey('tile-grass-cap')).getSourceImage();
      if (!hasNeighbour(p, all, 'left')) {
        scene.add.image(p.x - 6, p.y - 10, gardenKey('tile-grass-cap')).setOrigin(0, 0).setDepth(DEPTH.platformTop);
      }
      if (!hasNeighbour(p, all, 'right')) {
        scene.add
          .image(p.x + p.width + 6 - cap.width, p.y - 10, gardenKey('tile-grass-cap'))
          .setOrigin(0, 0)
          .setFlipX(true)
          .setDepth(DEPTH.platformTop);
      }
    }
  }
  if (p.oneWay) {
    const body = sprite.body as Phaser.Physics.Arcade.StaticBody;
    body.checkCollision.down = false;
    body.checkCollision.left = false;
    body.checkCollision.right = false;
  }
  return sprite;
}

/** Is there more ground (at the same height or higher) right next to this side of the platform? */
function hasNeighbour(p: PlatformDefinition, all: PlatformDefinition[], side: 'left' | 'right'): boolean {
  const edge = side === 'left' ? p.x : p.x + p.width;
  return all.some((o) => {
    if (o === p || o.oneWay) return false;
    const oh = o.height ?? DEFAULT_PLATFORM_HEIGHT;
    const touches = side === 'left' ? Math.abs(o.x + o.width - edge) <= 4 : Math.abs(o.x - edge) <= 4;
    return touches && o.y <= p.y + 4 && o.y + oh > p.y + 4;
  });
}

/**
 * How many see-through rows a picture has below its lowest visible pixel.
 * Decorations stand on that pixel, so art with empty space at the bottom
 * (common with AI-made pictures) still sits on the ground.
 */
const emptyRowsBelow = new Map<string, number>();
function measureEmptyRowsBelow(scene: Phaser.Scene, key: string, width: number, height: number): number {
  const cached = emptyRowsBelow.get(key);
  if (cached !== undefined) return cached;
  let empty = 0;
  rows: for (let y = height - 1; y >= 0; y--) {
    for (let x = 0; x < width; x++) {
      if ((scene.textures.getPixelAlpha(x, y, key) ?? 0) > 20) break rows;
    }
    empty++;
  }
  emptyRowsBelow.set(key, empty);
  return empty;
}

/** Draws a piece of scenery (and its swaying parts and shadow), notes its creatures, and makes its solid parts. */
function addDecoration(
  scene: Phaser.Scene,
  dec: DecorationDefinition,
  life: { critters: CritterSpawn[]; leafAreas: LeafArea[]; ladders: Rect[]; ballZones: Rect[] },
) {
  const type = DECORATION_TYPES[dec.kind];
  const scale = dec.scale ?? 1;
  const layer = dec.layer ?? type.layer;
  const depth = layer === 'front' ? DEPTH.decorationFront : DEPTH.decorationBack;
  const flip = dec.flipX ? -1 : 1;

  if (type.image) {
    const key = gardenKey(type.image);
    const sheet = GARDEN_SHEETS[type.image];
    const src = scene.textures.get(key).getSourceImage();
    const frameW = sheet ? sheet.frameWidth : src.width;
    const frameH = sheet ? sheet.frameHeight : src.height;
    const originY = (frameH - measureEmptyRowsBelow(scene, key, frameW, frameH)) / frameH;
    const place = <T extends Phaser.GameObjects.Image>(obj: T): T => {
      obj.setOrigin(0.5, originY).setScale(scale).setFlipX(!!dec.flipX);
      return obj;
    };

    if (sheet) {
      // Animated (swaying flowers, flapping washing...): start each one at a random point.
      const sprite = place(scene.add.sprite(dec.x, dec.y, key)).setDepth(depth);
      sprite.play({ key: gardenAnimKey(type.image), startFrame: Phaser.Math.Between(0, sheet.frames - 1) });
      sprite.anims.timeScale = Phaser.Math.FloatBetween(0.8, 1.2);
    } else {
      place(scene.add.image(dec.x, dec.y, key)).setDepth(depth);
    }

    for (const part of type.parts ?? []) {
      const img = place(scene.add.image(dec.x, dec.y, gardenKey(part.image))).setDepth(depth + (part.behind ? -0.1 : 0.1));
      if (part.sway) {
        // Leaves sway gently in the wind, each tree in its own time.
        img.x = dec.x - part.sway.x * scale;
        scene.tweens.add({
          targets: img,
          x: dec.x + part.sway.x * scale,
          duration: (part.sway.seconds * 1000) / 2,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
          delay: Phaser.Math.Between(0, part.sway.seconds * 1000),
        });
      }
    }

    const shadow = type.shadow ?? 0.7;
    if (shadow > 0 && layer === 'back') {
      const w = frameW * scale * shadow;
      scene.add
        .image(dec.x, dec.y + 1, gardenKey('fx-shadow'))
        .setDisplaySize(w, Phaser.Math.Clamp(w * 0.09, 8, 22))
        .setAlpha(0.7)
        .setDepth(DEPTH.shadow);
    }
  }

  if (type.critters) {
    for (let i = 0; i < type.critters.count; i++) {
      const spread = type.critters.count > 1 ? (i - (type.critters.count - 1) / 2) * 40 : 0;
      life.critters.push({ kind: type.critters.kind, x: dec.x + spread * scale, y: dec.y + (type.critters.perchY ?? 0) * scale });
    }
  }
  if (type.leaves) {
    const l = type.leaves;
    life.leafAreas.push({
      x: dec.x + (flip > 0 ? l.x : -(l.x + l.width)) * scale,
      y: dec.y + l.y * scale,
      width: l.width * scale,
      height: l.height * scale,
      groundY: dec.y,
    });
  }

  // Areas in the picture: ladders the boy can climb, the goal's net.
  const area = (r: { x: number; y: number; width: number; height: number }): Rect => ({
    x: dec.x + (flip > 0 ? r.x : -(r.x + r.width)) * scale,
    y: dec.y + r.y * scale,
    width: r.width * scale,
    height: r.height * scale,
  });
  for (const l of type.ladders ?? []) life.ladders.push(area(l));
  if (type.ballZone) life.ballZones.push(area(type.ballZone));

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

