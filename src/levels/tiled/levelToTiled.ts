import type { LevelDefinition, DetectableSpec } from '../LevelDefinition';
import { DEFAULT_PLATFORM_HEIGHT } from '../LevelDefinition';
import { OBSTACLE_TYPES } from '@/config/obstacles';
import type { TiledMap, TiledObject, TiledObjectLayer, TiledProperty } from './tiledFormat';
import { CLASS, CLASS_COLORS, LAYERS, MAP_TILE } from './levelSchema';

/**
 * Turn a LevelDefinition into a Tiled map. Used to convert levels that were
 * written in code (like the original Playground) into editable maps, and to
 * test that loading and saving round-trip exactly.
 */
export function levelToTiled(level: LevelDefinition): TiledMap {
  let nextId = 1;
  const obj = (o: Partial<TiledObject> & Pick<TiledObject, 'x' | 'y'>): TiledObject => ({
    id: nextId++,
    name: '',
    type: '',
    width: 0,
    height: 0,
    rotation: 0,
    visible: true,
    ...o,
  });
  const hiddenProps = (h?: DetectableSpec): TiledProperty[] => {
    if (!h) return [];
    const out: TiledProperty[] = [{ name: 'hidden', type: 'bool', value: true }];
    if (h.requiresSuperSniff !== undefined) out.push({ name: 'requiresSuperSniff', type: 'bool', value: h.requiresSuperSniff });
    if (h.revealRadius !== undefined) out.push({ name: 'revealRadius', type: 'int', value: h.revealRadius });
    if (h.revealedBy !== undefined) out.push({ name: 'revealedBy', type: 'string', propertytype: 'RevealedBy', value: h.revealedBy });
    return out;
  };
  const withProps = (o: TiledObject, p: TiledProperty[]) => (p.length ? { ...o, properties: p } : o);

  let layerId = 1;
  const layer = (name: string, objects: TiledObject[]): TiledObjectLayer => ({
    id: layerId++,
    name,
    type: 'objectgroup',
    draworder: 'topdown',
    opacity: 1,
    visible: true,
    x: 0,
    y: 0,
    objects,
  });

  const layers: TiledObjectLayer[] = [
    layer(
      LAYERS.platforms,
      level.platforms.map((p) =>
        withProps(
          obj({ type: p.kind, x: p.x, y: p.y, width: p.width, height: p.height ?? DEFAULT_PLATFORM_HEIGHT }),
          p.oneWay ? [{ name: 'oneWay', type: 'bool', value: true }] : [],
        ),
      ),
    ),
    layer(
      LAYERS.obstacles,
      (level.obstacles ?? []).map((o) =>
        obj({ type: o.type, x: o.x, y: o.y, width: OBSTACLE_TYPES[o.type].width, height: OBSTACLE_TYPES[o.type].height }),
      ),
    ),
    layer(
      LAYERS.signs,
      (level.signs ?? []).map((s) =>
        obj({ type: CLASS.sign, x: s.x, y: s.y, point: true, properties: [{ name: 'text', type: 'string', value: s.text }] }),
      ),
    ),
    layer(
      LAYERS.collectibles,
      (level.collectibles ?? []).map((c) =>
        withProps(obj({ type: c.kind, name: c.id ?? '', x: c.x, y: c.y, point: true }), hiddenProps(c.hidden)),
      ),
    ),
    layer(
      LAYERS.scentTrails,
      (level.scentTrails ?? []).map((t) => {
        const [first] = t.points;
        const p: TiledProperty[] = [{ name: 'scentType', type: 'string', propertytype: 'ScentType', value: t.scentType }];
        if (t.targetId) p.push({ name: 'targetId', type: 'string', value: t.targetId });
        if (t.visibleNormally !== undefined) p.push({ name: 'visibleNormally', type: 'bool', value: t.visibleNormally });
        if (t.visibleWithSuperSniff !== undefined) p.push({ name: 'visibleWithSuperSniff', type: 'bool', value: t.visibleWithSuperSniff });
        if (t.active !== undefined) p.push({ name: 'active', type: 'bool', value: t.active });
        if (t.color !== undefined) p.push({ name: 'color', type: 'color', value: `#ff${t.color.toString(16).padStart(6, '0')}` });
        return withProps(
          obj({ type: CLASS.scentTrail, name: t.id, x: first.x, y: first.y, polyline: t.points.map((q) => ({ x: q.x - first.x, y: q.y - first.y })) }),
          p,
        );
      }),
    ),
    layer(
      LAYERS.pointsOfInterest,
      (level.pointsOfInterest ?? []).map((poi) =>
        withProps(obj({ type: CLASS.pointOfInterest, name: poi.id, x: poi.x, y: poi.y, point: true }), [
          { name: 'text', type: 'string', value: poi.text },
          { name: 'marker', type: 'string', propertytype: 'PoiMarker', value: poi.marker },
          ...hiddenProps(poi.hidden),
        ]),
      ),
    ),
    layer(
      LAYERS.barkTargets,
      (level.barkTargets ?? []).map((t) => {
        const p: TiledProperty[] = [];
        if (t.reveals) p.push({ name: 'reveals', type: 'string', value: t.reveals });
        if (t.requiresSuperBark !== undefined) p.push({ name: 'requiresSuperBark', type: 'bool', value: t.requiresSuperBark });
        if (t.height !== undefined) p.push({ name: 'height', type: 'int', value: t.height });
        return withProps(obj({ type: t.kind, name: t.id ?? '', x: t.x, y: t.y, point: true }), p);
      }),
    ),
    layer(LAYERS.markers, [obj({ type: CLASS.spawn, name: 'spawn', x: level.spawn.x, y: level.spawn.y, point: true })]),
  ];
  layers.forEach((l) => (l.color = CLASS_COLORS[l.objects[0]?.type ?? ''] ?? '#a0a0a4'));

  return {
    type: 'map',
    version: '1.10',
    tiledversion: '1.11.0',
    orientation: 'orthogonal',
    renderorder: 'right-down',
    infinite: false,
    width: Math.ceil(level.width / MAP_TILE),
    height: Math.ceil(level.height / MAP_TILE),
    tilewidth: MAP_TILE,
    tileheight: MAP_TILE,
    nextlayerid: layerId,
    nextobjectid: nextId,
    backgroundcolor: level.skyColor,
    layers,
    tilesets: [],
    properties: [
      { name: 'name', type: 'string', value: level.name },
      { name: 'showDistanceMarkers', type: 'bool', value: level.showDistanceMarkers ?? false },
      { name: 'skyColor', type: 'color', value: `#ff${level.skyColor.replace('#', '')}` },
    ],
  };
}
