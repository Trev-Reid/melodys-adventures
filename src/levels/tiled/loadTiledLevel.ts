import type {
  CollectibleDefinition,
  CollectibleKind,
  DetectableSpec,
  LevelDefinition,
  ObstacleDefinition,
  PlatformDefinition,
  PointOfInterestDefinition,
  ScentTrailDefinition,
  SignDefinition,
} from '../LevelDefinition';
import type { ObstacleKind } from '@/config/obstacles';
import type { ScentType } from '@/config/scents';
import type { TiledMap, TiledObject, TiledObjectLayer, TiledProperty } from './tiledFormat';
import {
  CLASS,
  COLLECTIBLE_CLASSES,
  DEFAULTS,
  LAYERS,
  OBSTACLE_CLASSES,
  PLATFORM_CLASSES,
  POI_MARKERS,
  SCENT_CLASSES,
} from './levelSchema';

/** Thrown when a map has mistakes. `problems` lists each one in plain words. */
export class TiledLevelError extends Error {
  constructor(
    readonly levelKey: string,
    readonly problems: string[],
  ) {
    super(`Level "${levelKey}" has ${problems.length} problem(s):\n- ${problems.join('\n- ')}`);
    this.name = 'TiledLevelError';
  }
}

/**
 * Turn a Tiled map (.tmj JSON) into a LevelDefinition.
 * Collects every problem it finds (unknown classes, missing text...) and
 * reports them all at once, so a broken map is quick to fix.
 */
export function levelFromTiled(map: TiledMap, key: string): LevelDefinition {
  const problems: string[] = [];
  const where = (layer: string, o: TiledObject) =>
    `${layer}: object${o.name ? ` "${o.name}"` : ''} #${o.id} at (${Math.round(o.x)}, ${Math.round(o.y)})`;
  const classOf = (o: TiledObject) => (o.type || o.class || '').trim();
  const mapProps = props(map.properties);

  const layers = new Map<string, TiledObjectLayer>();
  for (const layer of map.layers) {
    if (layer.type === 'objectgroup') layers.set(layer.name, layer as TiledObjectLayer);
  }
  const objects = (name: string) => layers.get(name)?.objects.filter((o) => o.visible !== false) ?? [];
  for (const name of layers.keys()) {
    if (!(Object.values(LAYERS) as string[]).includes(name)) {
      problems.push(`Unknown layer "${name}". Layers should be: ${Object.values(LAYERS).join(', ')}.`);
    }
  }

  const expectClass = <T extends string>(layer: string, o: TiledObject, allowed: readonly T[]): T | undefined => {
    const cls = classOf(o);
    if ((allowed as readonly string[]).includes(cls)) return cls as T;
    problems.push(
      cls
        ? `${where(layer, o)} has Class "${cls}", which isn't allowed here. Use one of: ${allowed.join(', ')}.`
        : `${where(layer, o)} has no Class. Set it to one of: ${allowed.join(', ')}.`,
    );
    return undefined;
  };

  const hiddenSpec = (p: PropertyReader): DetectableSpec | undefined => {
    if (!p.bool('hidden', DEFAULTS.hidden)) return undefined;
    const spec: DetectableSpec = { requiresSuperSniff: p.bool('requiresSuperSniff', DEFAULTS.requiresSuperSniff) };
    if (p.has('revealRadius')) spec.revealRadius = p.number('revealRadius', DEFAULTS.revealRadius);
    return spec;
  };

  // --- Platforms -----------------------------------------------------------
  const platforms: PlatformDefinition[] = [];
  for (const o of objects(LAYERS.platforms)) {
    const kind = expectClass(LAYERS.platforms, o, PLATFORM_CLASSES);
    if (!kind) continue;
    if (!(o.width > 0 && o.height > 0)) {
      problems.push(`${where(LAYERS.platforms, o)} must be a rectangle with a size.`);
      continue;
    }
    const p = props(o.properties);
    const platform: PlatformDefinition = { kind, x: o.x, y: o.y, width: o.width, height: o.height };
    if (p.bool('oneWay', DEFAULTS.oneWay)) platform.oneWay = true;
    platforms.push(platform);
  }
  if (platforms.length === 0) problems.push('The "platforms" layer is empty - Melody needs something to stand on.');

  // --- Obstacles (top-left corner; size comes from the obstacle type) -----------
  const obstacles: ObstacleDefinition[] = [];
  for (const o of objects(LAYERS.obstacles)) {
    const type = expectClass<ObstacleKind>(LAYERS.obstacles, o, OBSTACLE_CLASSES);
    if (type) obstacles.push({ type, x: o.x, y: o.y });
  }

  // --- Signs -----------------------------------------------------------------
  const signs: SignDefinition[] = [];
  for (const o of objects(LAYERS.signs)) {
    if (!expectClass(LAYERS.signs, o, [CLASS.sign])) continue;
    const text = props(o.properties).string('text', '');
    if (!text.trim()) problems.push(`${where(LAYERS.signs, o)} has no text.`);
    signs.push({ x: o.x, y: o.y, text });
  }

  // --- Collectibles (point = centre of the item) -------------------------------
  const collectibles: CollectibleDefinition[] = [];
  for (const o of objects(LAYERS.collectibles)) {
    const kind = expectClass<CollectibleKind>(LAYERS.collectibles, o, COLLECTIBLE_CLASSES);
    if (!kind) continue;
    const c: CollectibleDefinition = { kind, x: o.x, y: o.y };
    if (o.name) c.id = o.name;
    const hidden = hiddenSpec(props(o.properties));
    if (hidden) c.hidden = hidden;
    collectibles.push(c);
  }

  // --- Points of interest ---------------------------------------------------
  const pointsOfInterest: PointOfInterestDefinition[] = [];
  for (const o of objects(LAYERS.pointsOfInterest)) {
    if (!expectClass(LAYERS.pointsOfInterest, o, [CLASS.pointOfInterest])) continue;
    const p = props(o.properties);
    if (!o.name) problems.push(`${where(LAYERS.pointsOfInterest, o)} needs a Name (its id).`);
    const text = p.string('text', '');
    if (!text.trim()) problems.push(`${where(LAYERS.pointsOfInterest, o)} has no text.`);
    const marker = p.string('marker', DEFAULTS.marker);
    if (!(POI_MARKERS as readonly string[]).includes(marker)) {
      problems.push(`${where(LAYERS.pointsOfInterest, o)} has marker "${marker}". Use one of: ${POI_MARKERS.join(', ')}.`);
    }
    const poi: PointOfInterestDefinition = { id: o.name, x: o.x, y: o.y, text, marker: marker as PointOfInterestDefinition['marker'] };
    const hidden = hiddenSpec(p);
    if (hidden) poi.hidden = hidden;
    pointsOfInterest.push(poi);
  }

  // --- Scent trails (polylines, drawn from start to where they lead) -----------
  const scentTrails: ScentTrailDefinition[] = [];
  for (const o of objects(LAYERS.scentTrails)) {
    if (!expectClass(LAYERS.scentTrails, o, [CLASS.scentTrail])) continue;
    if (!o.polyline || o.polyline.length < 2) {
      problems.push(`${where(LAYERS.scentTrails, o)} must be a polyline with at least 2 points (use the Insert Polyline tool).`);
      continue;
    }
    if (!o.name) problems.push(`${where(LAYERS.scentTrails, o)} needs a Name (its id).`);
    const p = props(o.properties);
    const scentType = p.string('scentType', '');
    if (!(SCENT_CLASSES as string[]).includes(scentType)) {
      problems.push(`${where(LAYERS.scentTrails, o)} has scentType "${scentType}". Use one of: ${SCENT_CLASSES.join(', ')}.`);
      continue;
    }
    const trail: ScentTrailDefinition = {
      id: o.name,
      scentType: scentType as ScentType,
      points: o.polyline.map((pt) => ({ x: o.x + pt.x, y: o.y + pt.y })),
    };
    const targetId = p.string('targetId', '');
    if (targetId) trail.targetId = targetId;
    if (p.has('visibleNormally')) trail.visibleNormally = p.bool('visibleNormally', DEFAULTS.visibleNormally);
    if (p.has('visibleWithSuperSniff')) trail.visibleWithSuperSniff = p.bool('visibleWithSuperSniff', DEFAULTS.visibleWithSuperSniff);
    if (p.has('active')) trail.active = p.bool('active', DEFAULTS.active);
    const color = p.color('color');
    if (color !== undefined) trail.color = color;
    scentTrails.push(trail);
  }

  // --- Spawn -------------------------------------------------------------------
  const spawns = objects(LAYERS.markers).filter((o) => classOf(o) === CLASS.spawn || o.name === CLASS.spawn);
  if (spawns.length !== 1) {
    problems.push(`The "markers" layer needs exactly one point with Class "spawn" (found ${spawns.length}).`);
  }
  const spawn = spawns[0] ? { x: spawns[0].x, y: spawns[0].y } : { x: 0, y: 0 };

  // --- Cross-checks --------------------------------------------------------------
  const ids = new Map<string, number>();
  for (const id of [...collectibles.map((c) => c.id), ...pointsOfInterest.map((p) => p.id), ...scentTrails.map((t) => t.id)]) {
    if (id) ids.set(id, (ids.get(id) ?? 0) + 1);
  }
  for (const [id, count] of ids) if (count > 1) problems.push(`The name "${id}" is used ${count} times - names must be unique.`);
  for (const t of scentTrails) {
    if (t.targetId && !ids.has(t.targetId)) {
      problems.push(`Scent trail "${t.id}" leads to "${t.targetId}", but nothing has that name.`);
    }
  }

  if (problems.length) throw new TiledLevelError(key, problems);

  const level: LevelDefinition = {
    key,
    name: mapProps.string('name', key),
    width: map.width * map.tilewidth,
    height: map.height * map.tileheight,
    spawn,
    skyColor: mapProps.colorString('skyColor', DEFAULTS.skyColor),
    showDistanceMarkers: mapProps.bool('showDistanceMarkers', DEFAULTS.showDistanceMarkers),
    platforms,
    signs,
    collectibles,
    obstacles,
    scentTrails,
    pointsOfInterest,
  };
  return level;
}

// --- Property helpers ------------------------------------------------------------

interface PropertyReader {
  has(name: string): boolean;
  string(name: string, fallback: string): string;
  bool(name: string, fallback: boolean): boolean;
  number(name: string, fallback: number): number;
  /** Tiled colour ("#AARRGGBB" or "#RRGGBB") as 0xRRGGBB, or undefined if unset. */
  color(name: string): number | undefined;
  /** Tiled colour as "#rrggbb". */
  colorString(name: string, fallback: string): string;
}

function props(list: TiledProperty[] | undefined): PropertyReader {
  const byName = new Map((list ?? []).map((p) => [p.name, p.value]));
  const rgb = (value: unknown): string | undefined => {
    if (typeof value !== 'string' || !value.startsWith('#')) return undefined;
    const hex = value.slice(1);
    if (hex.length === 8) return hex.slice(2).toLowerCase(); // #AARRGGBB
    if (hex.length === 6) return hex.toLowerCase();
    return undefined;
  };
  return {
    has: (n) => byName.has(n),
    string: (n, f) => (typeof byName.get(n) === 'string' ? (byName.get(n) as string) : f),
    bool: (n, f) => (typeof byName.get(n) === 'boolean' ? (byName.get(n) as boolean) : f),
    number: (n, f) => (typeof byName.get(n) === 'number' ? (byName.get(n) as number) : f),
    color: (n) => {
      const hex = rgb(byName.get(n));
      return hex ? parseInt(hex, 16) : undefined;
    },
    colorString: (n, f) => {
      const hex = rgb(byName.get(n));
      return hex ? `#${hex}` : f;
    },
  };
}
