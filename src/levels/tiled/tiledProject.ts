/**
 * Builds the Tiled project file (melodys-adventures.tiled-project). It tells
 * Tiled about our object Classes - their colours and properties with sensible
 * defaults - so when you set an object's Class to "sausage" or "scentTrail"
 * Tiled shows the right fields to fill in.
 *
 * Regenerate after adding a collectible/obstacle/scent type:  npm run tiled:project
 */
import {
  BARK_TARGET_CLASSES,
  CLASS,
  CLASS_COLORS,
  COLLECTIBLE_CLASSES,
  DECORATION_CLASSES,
  DECORATION_LAYERS,
  LEVEL_THEMES,
  PLATFORM_STYLES,
  DEFAULTS,
  OBSTACLE_CLASSES,
  PLATFORM_CLASSES,
  POI_MARKERS,
  REVEALED_BY,
  SCENT_CLASSES,
} from './levelSchema';

type Member = { name: string; type: string; value: string | number | boolean; propertyType?: string };

export function tiledProject(): object {
  let id = 1;
  const argb = (hex: string) => `#ff${hex.replace('#', '')}`;
  const cls = (name: string, members: Member[] = []) => ({
    id: id++,
    name,
    type: 'class',
    useAs: ['object'],
    color: argb(CLASS_COLORS[name] ?? '#a0a0a4'),
    drawFill: true,
    members,
  });
  const hidden: Member[] = [
    { name: 'hidden', type: 'bool', value: DEFAULTS.hidden },
    { name: 'requiresSuperSniff', type: 'bool', value: DEFAULTS.requiresSuperSniff },
    { name: 'revealRadius', type: 'int', value: DEFAULTS.revealRadius },
    { name: 'revealedBy', type: 'string', propertyType: 'RevealedBy', value: DEFAULTS.revealedBy },
  ];

  return {
    automappingRulesFile: '',
    commands: [],
    compatibilityVersion: 1100,
    extensionsPath: 'extensions',
    folders: ['src/levels/maps'],
    properties: [],
    propertyTypes: [
      { id: id++, name: 'ScentType', type: 'enum', storageType: 'string', values: SCENT_CLASSES, valuesAsFlags: false },
      { id: id++, name: 'PoiMarker', type: 'enum', storageType: 'string', values: POI_MARKERS, valuesAsFlags: false },
      { id: id++, name: 'RevealedBy', type: 'enum', storageType: 'string', values: REVEALED_BY, valuesAsFlags: false },
      { id: id++, name: 'PlatformStyle', type: 'enum', storageType: 'string', values: PLATFORM_STYLES, valuesAsFlags: false },
      { id: id++, name: 'DecorationLayer', type: 'enum', storageType: 'string', values: DECORATION_LAYERS, valuesAsFlags: false },
      { id: id++, name: 'LevelTheme', type: 'enum', storageType: 'string', values: LEVEL_THEMES, valuesAsFlags: false },
      ...PLATFORM_CLASSES.map((c) =>
        cls(c, [
          { name: 'oneWay', type: 'bool', value: DEFAULTS.oneWay },
          { name: 'style', type: 'string', propertyType: 'PlatformStyle', value: '' },
        ]),
      ),
      ...COLLECTIBLE_CLASSES.map((c) => cls(c, hidden)),
      ...OBSTACLE_CLASSES.map((c) => cls(c)),
      cls(CLASS.sign, [{ name: 'text', type: 'string', value: '' }]),
      cls(CLASS.scentTrail, [
        { name: 'scentType', type: 'string', propertyType: 'ScentType', value: SCENT_CLASSES[0] },
        { name: 'targetId', type: 'string', value: '' },
        { name: 'visibleNormally', type: 'bool', value: DEFAULTS.visibleNormally },
        { name: 'visibleWithSuperSniff', type: 'bool', value: DEFAULTS.visibleWithSuperSniff },
        { name: 'active', type: 'bool', value: DEFAULTS.active },
      ]),
      cls(CLASS.pointOfInterest, [
        { name: 'text', type: 'string', value: '' },
        { name: 'marker', type: 'string', propertyType: 'PoiMarker', value: DEFAULTS.marker },
        ...hidden,
      ]),
      ...BARK_TARGET_CLASSES.map((c) =>
        cls(c, [
          { name: 'reveals', type: 'string', value: '' },
          { name: 'requiresSuperBark', type: 'bool', value: true },
          ...(c === 'ballInTree' ? [{ name: 'height', type: 'int', value: DEFAULTS.treeHeight }] : []),
        ]),
      ),
      ...DECORATION_CLASSES.map((c) =>
        cls(c, [
          { name: 'flipX', type: 'bool', value: false },
          { name: 'layer', type: 'string', propertyType: 'DecorationLayer', value: '' },
          { name: 'scale', type: 'float', value: DEFAULTS.scale },
        ]),
      ),
      cls(CLASS.spawn),
    ],
  };
}
