/**
 * Checks every picture the game loads against the house rules (assetRules.ts), plus
 * replacement art against its placeholder's contract and decoration scales in the
 * Tiled maps. Files nothing loads are only flagged as unused.
 *
 *   npm run art:check                          everything (also runs in npm test)
 *   npm run art:check -- --file new.png --as prop       a new picture, before it goes in
 *   npm run art:check -- --file boy.png --as boy        ...against a placeholder's contract
 *   npm run art:check -- --json                         machine-readable
 *
 * Errors are things that will look broken or change how the game plays
 * (blurry edges, a painted-in background, a crate the wrong size, Melody
 * floating above the ground). Warnings are worth a look. Exit code 1 if
 * there are errors.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodePng, pngInfo, PngError, type PngInfo, type RgbaImage } from './png';
import {
  alphaStats,
  borderReport,
  colourStats,
  coverageNear,
  crop,
  emptyEdges,
  frameRects,
  gridReport,
  gutterAlpha,
  seamReport,
  sheetFits,
  type Rect,
} from './analyze';
import { ASSET_RULES, GROUNDED_ANIMATIONS, LIMITS, ROLE_DEFAULTS, WAIVERS, type AlphaMode, type AssetRule, type CheckId } from './assetRules';
import { GARDEN_IMAGES, GARDEN_SHEETS, UI_IMAGES, gardenPath, uiPath, type GardenImage } from '../../src/assets/artAssets';
import melodySheet from '../../src/characters/melody/melodySheet.json';
import boySheet from '../../src/characters/boy/boySheet.json';

interface CharacterSheet {
  who: string;
  json: string;
  sheet: { frameWidth: number; frameHeight: number; spacing: number; variants: Record<string, string>; animations: Record<string, { frames: number[] }> };
  grounded: string[];
}
import { DECORATION_TYPES } from '../../src/config/decorations';
import { OBSTACLE_TYPES } from '../../src/config/obstacles';
import { PLACEHOLDER_SPECS, obstacleReplacementKey, type ArtRole, type PlaceholderSpec } from '../../src/assets/placeholderSpecs';
import { LAYERS } from '../../src/levels/tiled/levelSchema';
import type { TiledMap, TiledObjectLayer } from '../../src/levels/tiled/tiledFormat';

export type Severity = 'error' | 'warning';

export interface Finding {
  file: string;
  check: CheckId;
  level: Severity;
  message: string;
  /** Set when a waiver allows it (assetRules.ts WAIVERS): the reason. */
  waived?: string;
}

export interface CheckedFile {
  file: string;
  width?: number;
  height?: number;
  role?: ArtRole;
  colours?: number;
  /** Nothing in the game loads it, so its pixels weren't checked. */
  unused?: boolean;
}

export interface ArtReport {
  files: CheckedFile[];
  findings: Finding[];
  errors: number;
  warnings: number;
  waived: number;
}

/** How a picture is checked: a rule from assetRules.ts, or one made for a replacement/new file. */
export interface PictureRule extends Omit<AssetRule, 'match' | 'alpha'> {
  /** 'solid': hard edges like a cutout, but it may fill its whole box (crates, blocks). */
  alpha: AlphaMode | 'solid';
  tinted?: boolean;
}

// ---------------------------------------------------------------------------------
// One picture
// ---------------------------------------------------------------------------------

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const ROLE_NAMES: Record<ArtRole, string> = {
  background: 'backgrounds', tile: 'ground tiles', prop: 'props', character: 'characters', item: 'items', fx: 'effects', ui: 'HUD pictures',
};
const pct = (x: number) => `${Math.round(x * 100)}%`;
const hex = (r: number, g: number, b: number) => `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;

/** The checks that only need the picture itself. */
export function checkPicture(file: string, img: RgbaImage & { info?: PngInfo }, rule: PictureRule, bytes?: number): Finding[] {
  const out: Finding[] = [];
  const add = (check: CheckId, level: Severity, message: string) => out.push({ file, check, level, message });
  const { width, height } = img;
  const profile = img.info?.chunks.filter((c) => c === 'iCCP' || c === 'gAMA' || c === 'cHRM');
  if (profile?.length) {
    add('profile', 'warning', `it carries colour-profile settings (${profile.join(', ')}): browsers may shift its colours a little, so it won't match the palette. Export it without a colour profile.`);
  }

  // Size.
  if (width === 0 || height === 0) {
    add('size', 'error', 'the picture is empty (0 pixels)');
    return out;
  }
  if (Math.max(width, height) > LIMITS.maxSide) add('size', 'error', `${width}x${height} is too big: no side may be over ${LIMITS.maxSide}px (some computers and tablets can't show it). Split it into parts.`);
  else if (Math.max(width, height) > LIMITS.warnSide) add('size', 'warning', `${width}x${height} is big (over ${LIMITS.warnSide}px): fine on a PC, slow on a tablet. Could it be split, or repeat?`);
  if (bytes !== undefined && bytes > LIMITS.warnBytes) add('filesize', 'warning', `the file is ${(bytes / 1e6).toFixed(1)} MB - pixel art is usually tiny. Is it really pixel art, saved as PNG?`);

  // The 2x2 art-pixel grid.
  if (rule.grid > 1) {
    if (width % rule.grid || height % rule.grid) {
      add('grid', 'error', `${width}x${height} isn't a multiple of ${rule.grid}: in this game one art pixel is ${rule.grid}x${rule.grid} screen pixels, so sizes must be even. Draw at half size and export at 200%.`);
    } else {
      const g = gridReport(img, rule.grid);
      if (g.offGrid > 0) {
        const where = g.example ? ` (first one at x ${g.example.x}, y ${g.example.y})` : '';
        const level: Severity = g.ratio > LIMITS.gridError ? 'error' : 'warning';
        add('grid', level, `${pct(g.ratio)} of it has detail finer than an art pixel${where}: it isn't drawn on the ${rule.grid}x${rule.grid} grid, so it will look sharper or blurrier than everything else. Draw at half size, export at 200% with no smoothing.`);
      }
    }
  }

  // Transparency.
  const a = alphaStats(img);
  if (rule.alpha === 'cutout' || rule.alpha === 'solid') {
    const allowed = rule.glassLevels ?? 0;
    if (a.partialLevels.length > allowed) {
      add('alpha', 'error', `${plural(a.partial, 'pixel')} ${a.partial === 1 ? 'is' : 'are'} part see-through (${plural(a.partialLevels.length, 'different amount')}): soft or smoothed ("anti-aliased") edges. Every pixel must be fully solid or fully see-through${allowed ? ` (plus ${allowed} flat see-through level for glass or a net)` : ''}.`);
    }
    if (rule.alpha === 'cutout') {
      const border = borderReport(img);
      if (border.checkerboard) {
        add('background', 'error', 'the edges are a grey-and-white checkerboard: the "transparent" background was painted into the picture (image tools and AI image makers draw one to show transparency). Remove the background and save with real transparency.');
      } else if (a.transparent === 0 && border.dominant >= 0.9) {
        const d = img.data;
        add('background', 'error', `it's filled right to the edges with ${hex(d[0], d[1], d[2])}: the background wasn't removed. Cut-outs need a see-through background.`);
      } else if (a.transparent === 0) {
        add('alpha', 'warning', 'nothing in it is see-through: is the background still there? (Fine if it really is a solid rectangle.)');
      }
    }
  } else if (rule.alpha === 'opaque') {
    if (a.transparent + a.partial > 0) {
      add('alpha', 'error', `${plural(a.transparent + a.partial, 'pixel')} ${a.transparent + a.partial === 1 ? 'is' : 'are'} see-through, but this fills a whole area (ground, sky): gaps would show the sky through it.`);
    }
  }

  // Colours.
  if (rule.maxColours !== Infinity) {
    const c = colourStats(img);
    if (c.colours > rule.maxColours) {
      add('colours', 'warning', `uses ${c.colours} colours (${ROLE_NAMES[rule.role]} in this game use up to ${rule.maxColours}). Fewer, stronger colours read better - see the palette in the style guide.`);
    }
    if (c.colours > LIMITS.noiseMinColours && c.colours / Math.max(1, c.merged) > LIMITS.noiseRatio) {
      add('colours', 'warning', `lots of almost-identical colours (${c.colours} colours, but only ${c.merged} once near-matches are merged): that's blur, painting, JPEG or AI noise, not clean pixel art.`);
    }
  }
  if (rule.tinted) {
    const d = img.data;
    let coloured = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 0 && Math.max(d[i], d[i + 1], d[i + 2]) - Math.min(d[i], d[i + 1], d[i + 2]) > 40) coloured++;
    if (coloured > 0) add('colours', 'warning', `the game colours this in (tint), so draw it in white and greys - ${plural(coloured, 'coloured pixel')} will come out muddy.`);
  }

  // Repeating pictures should join up with themselves.
  if (rule.tiles && !rule.noSeamCheck) {
    for (const axis of rule.tiles === 'xy' ? (['x', 'y'] as const) : (['x'] as const)) {
      const s = seamReport(img, axis);
      if (s.ratio > LIMITS.seamRatio) {
        add('seam', 'warning', `it repeats ${axis === 'x' ? 'sideways' : 'up and down'}, but its ${axis === 'x' ? 'left and right' : 'top and bottom'} edges don't match: there'll be a visible line every ${axis === 'x' ? width : height}px.`);
      }
    }
  }

  // Exact sizes that code relies on.
  if (rule.size) {
    const wrongW = rule.size.width !== undefined && rule.size.width !== width;
    const wrongH = rule.size.height !== undefined && rule.size.height !== height;
    if (wrongW || wrongH) {
      const want = `${rule.size.width ?? 'any'}x${rule.size.height ?? 'any'}`;
      add('size', 'error', `is ${width}x${height} but must be ${want}: ${rule.size.why}.`);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------------
// The whole game
// ---------------------------------------------------------------------------------

const toPosix = (p: string) => p.split('\\').join('/');

function globToRegExp(glob: string): RegExp {
  const escaped = glob.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*');
  return new RegExp(`^${escaped}$`);
}

export function ruleFor(file: string): AssetRule | undefined {
  return ASSET_RULES.find((r) => globToRegExp(r.match).test(file));
}

function listFiles(root: string, dir: string, pattern: RegExp): string[] {
  const abs = join(root, dir);
  if (!existsSync(abs)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(abs, { withFileTypes: true })) {
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) out.push(...listFiles(root, rel, pattern));
    else if (pattern.test(entry.name)) out.push(rel);
  }
  return out.sort();
}

const listPngs = (root: string, dir: string): string[] => listFiles(root, dir, /\.png$/i);

/** Just the size, from a PNG's header (for files that aren't checked further). Nothing if it can't be read. */
function headerSize(abs: string): { width?: number; height?: number } {
  try {
    const { width, height } = pngInfo(readFileSync(abs));
    return { width, height };
  } catch {
    return {};
  }
}

/** Files the game loads (paths from the project folder). */
export function referencedFiles(): string[] {
  return [
    ...GARDEN_IMAGES.map((n) => `public/${gardenPath(n)}`),
    ...UI_IMAGES.map((n) => `public/${uiPath(n)}`),
    ...Object.values(melodySheet.variants).map((p) => `public/${p}`),
    ...Object.values(boySheet.variants).map((p) => `public/${p}`),
  ];
}

export const REPLACEMENTS_DIR = 'src/assets/replacements';

/** Every placeholder that real art can replace: key -> its contract. */
export function replaceableKeys(): Map<string, PlaceholderSpec> {
  const keys = new Map<string, PlaceholderSpec>(Object.entries(PLACEHOLDER_SPECS));
  for (const [kind, t] of Object.entries(OBSTACLE_TYPES)) {
    keys.set(obstacleReplacementKey(kind), {
      width: t.width, height: t.height, fit: 'exact', role: 'prop', anchor: 'centre', alpha: 'cutout',
      what: `Obstacle "${kind}" (config/obstacles.ts). Its physics box is the picture, so it must be exactly ${t.width}x${t.height}.`,
    });
  }
  return keys;
}

interface Loaded {
  img: RgbaImage & { info: PngInfo };
  bytes: number;
}

export function checkProject(root: string = process.cwd()): ArtReport {
  const findings: Finding[] = [];
  const files: CheckedFile[] = [];
  const cache = new Map<string, Loaded | null>();
  const add = (file: string, check: CheckId, level: Severity, message: string) => findings.push({ file, check, level, message });

  const load = (file: string): Loaded | null => {
    if (cache.has(file)) return cache.get(file)!;
    let loaded: Loaded | null = null;
    const abs = join(root, file);
    if (existsSync(abs)) {
      try {
        const bytes = readFileSync(abs);
        loaded = { img: decodePng(bytes), bytes: bytes.length };
      } catch (e) {
        add(file, 'decode', 'error', e instanceof PngError ? `can't be read: ${e.message}` : `can't be read (${(e as Error).message})`);
      }
    }
    cache.set(file, loaded);
    return loaded;
  };

  // 1. Every picture the game loads, on its own. A file nothing loads never appears on screen, so
  //    its pixels aren't checked: it's only flagged as unused (step 2). An old version left in
  //    public/assets can't fail the build that way.
  const referenced = new Set(referencedFiles());
  const onDisk = listPngs(root, 'public/assets');
  for (const file of onDisk) {
    const rule = ruleFor(file);
    if (!referenced.has(file)) {
      files.push({ file, ...headerSize(join(root, file)), role: rule?.role, unused: true });
      continue;
    }
    const loaded = load(file);
    files.push({ file, width: loaded?.img.width, height: loaded?.img.height, role: rule?.role, colours: loaded ? colourStats(loaded.img).colours : undefined });
    if (!loaded) continue;
    if (!rule) {
      add(file, 'unused', 'warning', 'no rule in tools/art/assetRules.ts covers this folder - add one so it gets checked.');
      continue;
    }
    findings.push(...checkPicture(file, loaded.img, rule, loaded.bytes));
  }

  // 2. Everything the game loads is there, and everything there is loaded.
  for (const file of referenced) {
    if (!existsSync(join(root, file))) add(file, 'missing', 'error', 'the game loads this picture but the file is missing (it would show as a black-and-green box).');
  }
  for (const file of onDisk) {
    if (!referenced.has(file)) {
      add(file, 'unused', 'warning', "nothing in the game loads this file, so it never shows and isn't checked - but it's still shipped with the game. Delete it, or keep old versions in art/source/ instead.");
    }
  }

  // 3. Animated garden pictures: the strip divides into its frames.
  const decorationImages = new Set(Object.values(DECORATION_TYPES).map((t) => t.image).filter(Boolean));
  for (const [name, sheet] of Object.entries(GARDEN_SHEETS)) {
    const file = `public/${gardenPath(name as GardenImage)}`;
    const loaded = load(file);
    if (!loaded) continue;
    const { img } = loaded;
    const fitsFrames = img.width === sheet.frameWidth * sheet.frames && img.height === sheet.frameHeight;
    if (!fitsFrames) {
      add(file, 'sheet', 'error', `is ${img.width}x${img.height}, but gardenSheets.json says ${sheet.frames} frames of ${sheet.frameWidth}x${sheet.frameHeight} side by side (${sheet.frameWidth * sheet.frames}x${sheet.frameHeight}).`);
      continue;
    }
    const rects = frameRects(img.width, img.height, sheet.frameWidth, sheet.frameHeight);
    const edges = rects.map((r) => emptyEdges(img, r));
    edges.forEach((e, i) => e.empty && add(file, 'sheet', 'warning', `frame ${i} is empty.`));
    if (decorationImages.has(name as GardenImage) && !edges[0].empty) {
      // The game stands decorations on the lowest pixel of frame 0.
      edges.forEach((e, i) => {
        if (!e.empty && e.bottom < edges[0].bottom) {
          add(file, 'sheet', 'warning', `frame ${i} reaches ${edges[0].bottom - e.bottom}px lower than frame 0: the game stands it on frame 0's lowest pixel, so it will dip into the ground.`);
        }
      });
    }
  }

  // 4. Character sheets (Melody, the boy): frames line up, don't bleed, and feet are on the ground.
  const sheets: CharacterSheet[] = [
    { who: 'her', json: 'melodySheet.json', sheet: melodySheet, grounded: GROUNDED_ANIMATIONS },
    { who: 'his', json: 'boySheet.json', sheet: boySheet, grounded: boySheet.grounded },
  ];
  for (const { who, json, sheet, grounded } of sheets) {
    const { frameWidth: fw, frameHeight: fh, spacing } = sheet;
    const usedFrames = Math.max(...Object.values(sheet.animations).flatMap((a) => a.frames)) + 1;
    let firstSize: string | undefined;
    for (const [skin, path] of Object.entries(sheet.variants)) {
      const file = `public/${path}`;
      const loaded = load(file);
      if (!loaded) continue;
      const { img } = loaded;
      const size = `${img.width}x${img.height}`;
      firstSize ??= size;
      if (size !== firstSize) add(file, 'sheet', 'error', `is ${size} but the other skin is ${firstSize}: every skin must have the same layout.`);
      if (!sheetFits(img.width, img.height, fw, fh, spacing)) {
        add(file, 'sheet', 'error', `${size} doesn't divide into ${fw}x${fh} frames with ${spacing}px gaps (${json}).`);
        continue;
      }
      const rects = frameRects(img.width, img.height, fw, fh, spacing);
      if (rects.length < usedFrames) add(file, 'sheet', 'error', `has ${rects.length} frames but the animations use ${usedFrames}.`);
      const gutter = gutterAlpha(img, fw, fh, spacing);
      if (gutter > 0) add(file, 'sheet', 'error', `something is drawn in the gaps between frames: neighbouring frames will bleed into each other (skin "${skin}").`);
      for (const anim of grounded) {
        const def = (sheet.animations as Record<string, { frames: number[] }>)[anim];
        if (!def) continue;
        for (const f of def.frames) {
          const r = rects[f];
          if (!r) continue;
          const e = emptyEdges(img, r);
          if (!e.empty && e.bottom > 0) add(file, 'feet', 'error', `frame ${f} ("${anim}", skin "${skin}") has ${e.bottom}px of space under ${who} feet: it would float above the ground. Feet go on the bottom row.`);
        }
      }
    }
  }

  // 5. Decorations: parts line up with the main picture; solid surfaces sit on the art.
  for (const [kind, type] of Object.entries(DECORATION_TYPES)) {
    if (!type.image) continue;
    const file = `public/${gardenPath(type.image)}`;
    const loaded = load(file);
    if (!loaded) continue;
    const sheet = GARDEN_SHEETS[type.image];
    const frame: Rect = { x: 0, y: 0, width: sheet ? sheet.frameWidth : loaded.img.width, height: sheet ? sheet.frameHeight : loaded.img.height };
    for (const part of type.parts ?? []) {
      const partFile = `public/${gardenPath(part.image)}`;
      const p = load(partFile);
      if (p && (p.img.width !== frame.width || p.img.height !== frame.height)) {
        add(partFile, 'parts', 'error', `is ${p.img.width}x${p.img.height}, but it's a part of ${type.image} (${frame.width}x${frame.height}): parts must be the same size as the main picture, drawn in place on the same canvas.`);
      }
    }
    const img = sheet ? crop(loaded.img, frame) : loaded.img;
    const e = emptyEdges(img);
    if (e.empty) continue;
    const anchorY = img.height - e.bottom; // the game stands it here (its lowest visible pixel)
    const centreX = img.width / 2;
    for (const s of type.solids ?? []) {
      const cover = coverageNear(img, centreX + s.x, centreX + s.x + s.width, anchorY + s.y, -6, 8);
      if (cover < LIMITS.solidCoverage) {
        add(file, 'solids', 'warning', `the solid part of "${kind}" at y ${s.y} (config/decorations.ts) has art under only ${pct(cover)} of it: after a redraw it may float above or sink into the picture. Line up its y with the surface in the picture (y = how far above the bottom).`);
      }
    }
    for (const l of type.ladders ?? []) {
      const cover = coverageNear(img, centreX + l.x, centreX + l.x + l.width, anchorY + l.y + l.height / 2, -l.height / 2, l.height / 2);
      if (cover < LIMITS.solidCoverage) add(file, 'solids', 'warning', `the ladder in "${kind}" (config/decorations.ts) isn't over the ladder in the picture.`);
    }
  }

  // 6. Replacement art for placeholders (src/assets/replacements/<key>.png).
  const keys = replaceableKeys();
  const groups = new Map<string, { file: string; size: string }[]>();
  for (const file of listPngs(root, REPLACEMENTS_DIR)) {
    const key = basename(file).replace(/\.png$/i, '');
    const spec = keys.get(key);
    const loaded = load(file);
    files.push({ file, width: loaded?.img.width, height: loaded?.img.height, role: spec?.role, colours: loaded ? colourStats(loaded.img).colours : undefined });
    if (!spec) {
      const guess = closest(key, [...keys.keys()]);
      add(file, 'replacement', 'error', `there's no placeholder called "${key}", so the game won't use it.${guess ? ` Did you mean ${guess}.png?` : ''} (The list is in src/assets/placeholderSpecs.ts.)`);
      continue;
    }
    if (!loaded) continue;
    findings.push(...checkReplacement(file, loaded.img, key, spec, loaded.bytes));
    if (spec.group) {
      const list = groups.get(spec.group) ?? [];
      list.push({ file, size: `${loaded.img.width}x${loaded.img.height}` });
      groups.set(spec.group, list);
    }
  }
  for (const [group, list] of groups) {
    const sizes = new Set(list.map((l) => l.size));
    if (sizes.size > 1) {
      for (const l of list) add(l.file, 'replacement', 'error', `the "${group}" pictures must all be the same size (${list.map((x) => `${basename(x.file)} ${x.size}`).join(', ')}): they swap while animating.`);
    }
  }

  // 7. Levels: a decoration scaled in Tiled changes the size of its art pixels.
  findings.push(...checkMapScales(root));

  // Waivers.
  for (const f of findings) {
    const w = WAIVERS.find((x) => x.file === f.file && x.checks.includes(f.check));
    if (w) f.waived = w.reason;
  }
  const live = findings.filter((f) => !f.waived);
  return {
    files,
    findings,
    errors: live.filter((f) => f.level === 'error').length,
    warnings: live.filter((f) => f.level === 'warning').length,
    waived: findings.length - live.length,
  };
}

/** Checks for a picture replacing a placeholder (or a new picture checked "as" one). */
export function checkReplacement(file: string, img: RgbaImage, key: string, spec: PlaceholderSpec, bytes?: number): Finding[] {
  const isObstacle = key.startsWith('obstacle-');
  const rule: PictureRule = {
    ...ROLE_DEFAULTS[spec.role],
    role: spec.role,
    alpha: isObstacle ? 'solid' : spec.alpha,
    tinted: spec.tinted,
  };
  const out = checkPicture(file, img, rule, bytes);
  const add = (check: CheckId, level: Severity, message: string) => out.push({ file, check, level, message });
  const dw = img.width - spec.width;
  const dh = img.height - spec.height;
  if (spec.fit === 'exact' && (dw || dh)) {
    add('replacement', 'error', `is ${img.width}x${img.height} but must be exactly ${spec.width}x${spec.height}: ${spec.what}`);
  } else if (spec.fit === 'about') {
    const tol = spec.tolerance ?? 0;
    if (Math.abs(dw) > tol || Math.abs(dh) > tol) {
      add('replacement', 'error', `is ${img.width}x${img.height}; the placeholder is ${spec.width}x${spec.height} and real art may differ by at most ${tol}px each way, or the game will feel different. ${spec.what}`);
    }
  }
  if (spec.anchor === 'feet') {
    const e = emptyEdges(img);
    if (!e.empty && e.bottom > 0) add('feet', 'error', `has ${plural(e.bottom, 'empty row')} under it: the game stands it on the picture's bottom edge, so it would float. Crop it so the feet touch the bottom.`);
  }
  return out;
}

/** Screen pixels per art pixel everywhere in the game (the house style). */
const ART_GRID = ROLE_DEFAULTS.prop.grid;

/**
 * Decorations given a `scale` in Tiled (src/levels/maps/*.tmj). Pixel art scaled by anything
 * but 1 no longer matches the rest of the game: 2x makes chunkier art pixels than everything
 * around it, and a non-whole amount makes them uneven and shimmer as the camera moves.
 * (Scale also stretches the decoration's solid parts, so it's a gameplay change too.)
 */
export function checkMapScales(root: string): Finding[] {
  const out: Finding[] = [];
  for (const file of listFiles(root, 'src/levels/maps', /\.tmj$/i)) {
    let map: TiledMap;
    try {
      map = JSON.parse(readFileSync(join(root, file), 'utf8')) as TiledMap;
    } catch {
      continue; // a broken map is reported by the level loader and its tests
    }
    for (const layer of map.layers ?? []) {
      if (layer.type !== 'objectgroup' || layer.name !== LAYERS.decorations) continue;
      for (const o of (layer as TiledObjectLayer).objects ?? []) {
        const scale = o.properties?.find((p) => p.name === 'scale')?.value;
        if (typeof scale !== 'number' || !(scale > 0) || scale === 1) continue;
        const what = `the "${o.type || o.class || 'decoration'}" decoration${o.name ? ` "${o.name}"` : ''} (object ${o.id}, x ${Math.round(o.x)})`;
        const px = scale * ART_GRID;
        const message = Number.isInteger(px)
          ? `${what} has scale ${scale}: its art pixels come out ${px}x${px} screen pixels, ${px > ART_GRID ? 'chunkier' : 'finer'} than everything else (${ART_GRID}x${ART_GRID}). Use scale 1 and draw the picture at the size you need.`
          : `${what} has scale ${scale}, which isn't a whole number of screen pixels per art pixel: its art pixels come out uneven (some ${Math.floor(px)}, some ${Math.ceil(px)} pixels wide) and shimmer as the camera moves. Use scale 1 and draw the picture at the size you need.`;
        out.push({ file, check: 'scale', level: 'warning', message });
      }
    }
  }
  return out;
}

/** The known name most like `name` (for "did you mean"). */
function closest(name: string, options: string[]): string | undefined {
  const dist = (a: string, b: string): number => {
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    return d[a.length][b.length];
  };
  let best: string | undefined;
  let bestD = Infinity;
  for (const o of options) {
    const d = dist(name.toLowerCase(), o.toLowerCase());
    if (d < bestD) {
      bestD = d;
      best = o;
    }
  }
  return bestD <= Math.max(3, name.length / 3) ? best : undefined;
}

// ---------------------------------------------------------------------------------
// Command line
// ---------------------------------------------------------------------------------

export function formatReport(report: ArtReport, root: string): string {
  const lines: string[] = [];
  const byFile = new Map<string, Finding[]>();
  for (const f of report.findings.filter((x) => !x.waived)) byFile.set(f.file, [...(byFile.get(f.file) ?? []), f]);
  const sorted = [...byFile.entries()].sort(([, a], [, b]) => Number(b.some((f) => f.level === 'error')) - Number(a.some((f) => f.level === 'error')));
  for (const [file, list] of sorted) {
    const info = report.files.find((f) => f.file === file);
    const what = info ? ` (${[info.role, info.width !== undefined ? `${info.width}x${info.height}` : ''].filter(Boolean).join(', ')})` : '';
    lines.push('', `${toPosix(relative(root, join(root, file)))}${what}`);
    for (const f of list.sort((a, b) => (a.level === b.level ? 0 : a.level === 'error' ? -1 : 1))) {
      lines.push(`  ${f.level === 'error' ? 'ERROR' : 'warn '}  ${f.check.padEnd(11)} ${f.message}`);
    }
  }
  const waived = report.findings.filter((f) => f.waived);
  if (waived.length) {
    lines.push('', 'Allowed for now (tools/art/assetRules.ts WAIVERS):');
    const seen = new Map<string, { checks: Set<string>; reason: string }>();
    for (const f of waived) {
      const s = seen.get(f.file) ?? { checks: new Set(), reason: f.waived! };
      s.checks.add(f.check);
      seen.set(f.file, s);
    }
    for (const [file, s] of seen) lines.push(`  ${file} - ${[...s.checks].join(', ')}: ${s.reason}`);
  }
  const unused = report.files.filter((f) => f.unused).length;
  lines.push(
    '',
    `${plural(report.files.length - unused, 'picture')} checked${unused ? ` (+ ${unused} unused, not checked)` : ''}: ${plural(report.errors, 'error')}, ${plural(report.warnings, 'warning')}${report.waived ? `, ${report.waived} allowed for now` : ''}.`,
  );
  if (report.errors === 0) lines.push('All good - nothing that will look broken or change the game.');
  return lines.join('\n');
}

function main(argv: string[]): number {
  const root = resolve(fileURLToPath(new URL('../..', import.meta.url)));
  const arg = (name: string) => {
    const i = argv.indexOf(name);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const file = arg('--file');
  if (file) {
    // A picture that isn't in the game yet: check it as a role, or against a placeholder's contract.
    const as = arg('--as') ?? 'prop';
    const abs = resolve(file);
    let img: RgbaImage;
    try {
      img = decodePng(readFileSync(abs));
    } catch (e) {
      console.log(`${file}: can't be read as a PNG (${(e as Error).message})`);
      return 1;
    }
    const spec = replaceableKeys().get(as);
    let findings: Finding[];
    if (spec) findings = checkReplacement(file, img, as, spec, statSync(abs).size);
    else if (as in ROLE_DEFAULTS) findings = checkPicture(file, img, { ...ROLE_DEFAULTS[as as ArtRole], role: as as ArtRole }, statSync(abs).size);
    else {
      console.log(`--as must be a role (${Object.keys(ROLE_DEFAULTS).join(', ')}) or a placeholder name (e.g. boy, item-sausage, obstacle-heavyCrate).`);
      return 1;
    }
    const report: ArtReport = {
      files: [{ file, width: img.width, height: img.height, role: spec?.role ?? (as as ArtRole) }],
      findings,
      errors: findings.filter((f) => f.level === 'error').length,
      warnings: findings.filter((f) => f.level === 'warning').length,
      waived: 0,
    };
    console.log(argv.includes('--json') ? JSON.stringify(report, null, 1) : formatReport(report, process.cwd()));
    return report.errors ? 1 : 0;
  }
  const report = checkProject(root);
  console.log(argv.includes('--json') ? JSON.stringify(report, null, 1) : `Checking the game's pictures...\n${formatReport(report, root)}`);
  return report.errors ? 1 : 0;
}

if (process.argv[1] && resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase()) {
  process.exitCode = main(process.argv.slice(2));
}
