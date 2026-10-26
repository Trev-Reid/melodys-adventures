import { describe, expect, it } from 'vitest';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { blankImage, decodePng, encodePng, readPng, type RgbaImage } from '../tools/art/png';
import { alphaStats, borderReport, colourStats, coverageNear, emptyEdges, estimatePixelSize, frameRects, gridReport, seamReport, sheetFits } from '../tools/art/analyze';
import { pixelSizeNote } from '../tools/art/palette';
import { checkPicture, checkProject, formatReport, replaceableKeys, type PictureRule } from '../tools/art/checkAssets';
import { PLACEHOLDER_SPECS } from '../src/assets/placeholderSpecs';
import { TEXTURES } from '../src/assets/keys';
import { OBSTACLE_TYPES } from '../src/config/obstacles';

const ROOT = join(__dirname, '..');

/** A picture drawn with whole 2x2 art pixels: `rows` uses one letter per art pixel. */
function art(rows: string[], colours: Record<string, [number, number, number, number]>): RgbaImage {
  const img = blankImage(rows[0].length * 2, rows.length * 2);
  rows.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      const c = colours[ch] ?? [0, 0, 0, 0];
      for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) img.data.set(c, ((y * 2 + dy) * img.width + x * 2 + dx) * 4);
    }),
  );
  return img;
}
const BROWN: [number, number, number, number] = [122, 78, 45, 255];
const DARK: [number, number, number, number] = [43, 29, 20, 255];
const prop: PictureRule = { role: 'prop', alpha: 'cutout', grid: 2, maxColours: 48 };
const checks = (img: RgbaImage, rule = prop) => checkPicture('test.png', img, rule).map((f) => `${f.level}:${f.check}`);

describe('every picture in the game', () => {
  it('passes the art checks (npm run art:check)', () => {
    const report = checkProject(ROOT);
    const errors = report.findings.filter((f) => f.level === 'error' && !f.waived);
    expect(errors, formatReport(report, ROOT)).toEqual([]);
  });

  it('every placeholder has a replacement contract', () => {
    const keys = replaceableKeys();
    // Melody and the boy are sprite sheets (tools/sprites), not placeholders.
    const sheets: string[] = [TEXTURES.melody, TEXTURES.melodyBuff, TEXTURES.boy, TEXTURES.boyCarry];
    const drawn = Object.values(TEXTURES).filter((k) => !sheets.includes(k));
    for (const key of drawn) expect(PLACEHOLDER_SPECS[key], `no spec for ${key}`).toBeDefined();
    for (const kind of Object.keys(OBSTACLE_TYPES)) expect(keys.get(`obstacle-${kind}`)?.fit).toBe('exact');
  });

  it("the contracts match the placeholders' real sizes", () => {
    const code = readFileSync(join(ROOT, 'src/assets/placeholders.ts'), 'utf8');
    const baked = [...code.matchAll(/bake\(scene, g, TEXTURES\.(\w+), (\d+), (\d+)\)/g)];
    expect(baked.length).toBeGreaterThan(15);
    for (const [, name, w, h] of baked) {
      const spec = PLACEHOLDER_SPECS[TEXTURES[name as keyof typeof TEXTURES]];
      expect({ name, width: spec?.width, height: spec?.height }).toEqual({ name, width: Number(w), height: Number(h) });
    }
  });
});

describe('PNG reading and writing', () => {
  it('round-trips a picture exactly', () => {
    const img = art(['.ab', 'ba.'], { a: BROWN, b: [10, 200, 30, 255] });
    const back = decodePng(encodePng(img));
    expect(back.width).toBe(6);
    expect([...back.data]).toEqual([...img.data]);
  });

  it('reads the real game art (palette, RGB and RGBA files)', () => {
    const house = readPng(join(ROOT, 'public/assets/garden/house.png'));
    expect(house.width).toBe(600);
    expect(house.info.hasAlpha).toBe(true);
  });
});

describe('the checks catch what makes art look wrong', () => {
  const stump = art(['..dd..', '.dbbd.', '.dbbd.', 'dbbbbd'], { d: DARK, b: BROWN });

  it('clean 2x2 pixel art passes', () => {
    expect(checks(stump)).toEqual([]);
    expect(gridReport(stump, 2).ratio).toBe(0);
  });

  it('odd sizes and detail finer than an art pixel', () => {
    expect(checks(blankImage(31, 20))).toContain('error:grid');
    // One stray screen pixel in a big picture is a warning; lots of them is an error.
    const fine = art(Array(10).fill('.' + 'b'.repeat(19)), { b: BROWN });
    fine.data.set(DARK, (3 * fine.width + 5) * 4);
    expect(gridReport(fine, 2).offGrid).toBe(1);
    expect(checks(fine)).toContain('warning:grid');
    const blurry = art(['.bbb', '.bbb'], { b: BROWN });
    blurry.data.set(DARK, (1 * blurry.width + 3) * 4);
    expect(checks(blurry)).toContain('error:grid');
  });

  it('soft, anti-aliased edges', () => {
    const soft = art(['.bb.', 'bbbb'], { b: BROWN });
    for (let a = 0; a < 6; a++) soft.data[a * 4 + 3] = 40 + a * 30;
    expect(alphaStats(soft).partialLevels.length).toBeGreaterThan(1);
    expect(checks(soft)).toContain('error:alpha');
    // ...but a flat see-through level is fine where it's allowed (the goal's net)
    const net = art(['.nn.', 'bbbb'], { n: [255, 255, 255, 170], b: BROWN });
    expect(checks(net, { ...prop, glassLevels: 1 })).toEqual([]);
  });

  it('a painted-in "transparent" checkerboard, or a solid background', () => {
    const checker = art(
      Array.from({ length: 12 }, (_, y) => Array.from({ length: 16 }, (_, x) => ((x >> 1) + (y >> 1)) % 2 ? 'g' : 'w').join('')),
      { w: [255, 255, 255, 255], g: [204, 204, 204, 255] },
    );
    expect(borderReport(checker).checkerboard).toBe(true);
    expect(checks(checker)).toContain('error:background');
    const box = art(['wwww', 'wbbw', 'wwww'], { w: [255, 255, 255, 255], b: BROWN });
    expect(checks(box)).toContain('error:background');
  });

  it('a ground tile with holes in it', () => {
    const tile = art(['bb', 'b.'], { b: BROWN });
    expect(checks(tile, { role: 'tile', alpha: 'opaque', grid: 2, maxColours: 16 })).toContain('error:alpha');
  });

  it('too many colours, and noisy almost-identical ones', () => {
    const noisy = blankImage(40, 40);
    for (let i = 0; i < 1600; i++) noisy.data.set([100 + (i % 7), 60 + ((i >> 3) % 5), 40, 255], i * 4);
    const c = colourStats(noisy);
    expect(c.colours).toBeGreaterThan(30);
    expect(c.merged).toBeLessThan(c.colours / 3);
    expect(checks(noisy, { ...prop, grid: 1, maxColours: 16 }).filter((x) => x === 'warning:colours').length).toBe(2);
  });

  it('a repeating background that does not join up', () => {
    const seam = art(['bbbbbbbbbbbbbbbd', 'bbbbbbbbbbbbbbbd'], { b: BROWN, d: [250, 250, 250, 255] });
    expect(seamReport(seam, 'x').ratio).toBeGreaterThan(3);
    expect(checks(seam, { ...prop, alpha: 'opaque', tiles: 'x' })).toContain('warning:seam');
  });

  it('measures where a picture stands, and whether a surface sits on it', () => {
    const img = art(['....', '.bb.', 'bbbb', '....'], { b: BROWN });
    expect(emptyEdges(img)).toMatchObject({ top: 2, bottom: 2, left: 0, right: 0 });
    expect(coverageNear(img, 0, 8, 2, 0, 1)).toBeGreaterThan(0.4);
    expect(coverageNear(img, 0, 8, 7, 0, 0)).toBe(0);
  });

  it('measures the art-pixel size of a reference picture (or that it is not pixel art)', () => {
    // 60x34 art pixels of busy pattern, drawn 2x2: like the game's own art.
    let seed = 7;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) % 5);
    const rows = Array.from({ length: 34 }, () => Array.from({ length: 60 }, () => 'abcde'[rnd()]).join(''));
    const palette: Record<string, [number, number, number, number]> = {
      a: BROWN, b: DARK, c: [200, 160, 90, 255], d: [60, 140, 60, 255], e: [230, 230, 220, 255],
    };
    const pixelArt = art(rows, palette);
    expect(estimatePixelSize(pixelArt).size).toBe(2);
    // ...the same picture scaled up 3x more: 6x6 art pixels.
    const big = blankImage(pixelArt.width * 3, pixelArt.height * 3);
    for (let y = 0; y < big.height; y++) for (let x = 0; x < big.width; x++) big.data.set(pixelArt.data.subarray(((Math.floor(y / 3)) * pixelArt.width + Math.floor(x / 3)) * 4, ((Math.floor(y / 3)) * pixelArt.width + Math.floor(x / 3)) * 4 + 4), (y * big.width + x) * 4);
    expect(estimatePixelSize(big).size).toBe(6);
    // ...and by 1.25 (2.5 screen pixels per art pixel): uneven, so no grid is found.
    const uneven = blankImage(Math.floor(pixelArt.width * 1.25), Math.floor(pixelArt.height * 1.25));
    for (let y = 0; y < uneven.height; y++) for (let x = 0; x < uneven.width; x++) uneven.data.set(pixelArt.data.subarray((Math.floor(y / 1.25) * pixelArt.width + Math.floor(x / 1.25)) * 4, (Math.floor(y / 1.25) * pixelArt.width + Math.floor(x / 1.25)) * 4 + 4), (y * uneven.width + x) * 4);
    expect(estimatePixelSize(uneven).size).toBe(1);
    // A smooth painting: no art pixels at all.
    const painted = blankImage(160, 90);
    for (let y = 0; y < 90; y++) for (let x = 0; x < 160; x++) painted.data.set([Math.round(128 + 100 * Math.sin(x / 7 + y / 11)), Math.round(128 + 100 * Math.cos(x / 5 - y / 9)), (x * 3 + y * 5) % 256, 255], (y * 160 + x) * 4);
    expect(estimatePixelSize(painted).size).toBe(1);
    expect(pixelSizeNote(painted)).toMatch(/painted, smoothed or AI/);
    // The game's own art is 2x2; a 960-wide screen of it is "the same as the game".
    expect(estimatePixelSize(readPng(join(ROOT, 'public/assets/garden/house.png'))).size).toBe(2);
    const screen = blankImage(960, 540);
    const at = (x: number, y: number) => ((((y >> 1) % 34) * 2) * pixelArt.width + ((x >> 1) % 60) * 2) * 4;
    for (let y = 0; y < 540; y++) for (let x = 0; x < 960; x++) screen.data.set(pixelArt.data.subarray(at(x, y), at(x, y) + 4), (y * 960 + x) * 4);
    expect(pixelSizeNote(screen)).toMatch(/2x2 .* 480x270 art pixels.*the same as the game/);
  });

  it('sprite sheet maths', () => {
    expect(sheetFits(796, 636, 96, 76, 4)).toBe(true);
    expect(sheetFits(800, 636, 96, 76, 4)).toBe(false);
    expect(frameRects(796, 636, 96, 76, 4)).toHaveLength(64);
    expect(frameRects(796, 636, 96, 76, 4)[9]).toEqual({ x: 100, y: 80, width: 96, height: 76 });
  });
});

describe('art:check on a copy of the game', () => {
  const copy = (): string => {
    const dir = mkdtempSync(join(tmpdir(), 'melody-art-'));
    cpSync(join(ROOT, 'public/assets'), join(dir, 'public/assets'), { recursive: true });
    return dir;
  };
  const found = (dir: string) => {
    const r = checkProject(dir);
    return r.findings.filter((f) => !f.waived).map((f) => `${f.level}:${f.check}:${f.file.replace(/^.*\//, '')}`);
  };

  it('spots missing, unused and wrongly-sized replacement pictures', () => {
    const dir = copy();
    try {
      expect(checkProject(dir).errors).toBe(0);
      rmSync(join(dir, 'public/assets/garden/bone.png'));
      writeFileSync(join(dir, 'public/assets/garden/trampoline_old.png'), readFileSync(join(ROOT, 'public/assets/garden/stump.png')));
      mkdirSync(join(dir, 'src/assets/replacements'), { recursive: true });
      // a crate the wrong size (its physics box is the picture), and a misspelt name
      writeFileSync(join(dir, 'src/assets/replacements/obstacle-heavyCrate.png'), encodePng(art(Array(50).fill('b'.repeat(50)), { b: BROWN })));
      writeFileSync(join(dir, 'src/assets/replacements/item-sausag.png'), encodePng(art(['bbbbbbbbbbbbbbb'], { b: BROWN })));
      // the cat floating above its feet
      writeFileSync(join(dir, 'src/assets/replacements/npc-cat.png'), encodePng(art([...Array(20).fill('..' + 'b'.repeat(22) + '..'), ...Array(4).fill('.'.repeat(26))], { b: BROWN })));
      const f = found(dir);
      expect(f).toContain('error:missing:bone.png');
      expect(f).toContain('warning:unused:trampoline_old.png');
      expect(f).toContain('error:replacement:obstacle-heavyCrate.png');
      expect(f).toContain('error:replacement:item-sausag.png');
      expect(f).toContain('error:feet:npc-cat.png');
      const r = checkProject(dir);
      expect(r.findings.find((x) => x.file.endsWith('item-sausag.png'))?.message).toContain('item-sausage.png');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('only flags a picture nothing loads as unused: an old version left behind never fails the build', () => {
    const dir = copy();
    try {
      // Soft edges and an odd size: an error in a picture the game uses, but nothing loads this one.
      const old = blankImage(31, 20);
      for (let i = 3; i < old.data.length; i += 4) old.data[i] = 128;
      writeFileSync(join(dir, 'public/assets/garden/bush-old.png'), encodePng(old));
      writeFileSync(join(dir, 'public/assets/garden/broken-old.png'), Buffer.from('not a png'));
      const r = checkProject(dir);
      const f = found(dir);
      expect(f).toContain('warning:unused:bush-old.png');
      expect(f).toContain('warning:unused:broken-old.png');
      expect(f.filter((x) => x.endsWith('-old.png') && !x.startsWith('warning:unused'))).toEqual([]);
      expect(r.errors).toBe(0);
      expect(r.files.find((x) => x.file.endsWith('bush-old.png'))).toMatchObject({ width: 31, height: 20, unused: true });
      const unused = r.files.filter((x) => x.unused).length;
      expect(unused).toBeGreaterThanOrEqual(2);
      expect(formatReport(r, dir)).toContain(`(+ ${unused} unused, not checked)`);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('spots decorations scaled in Tiled, which changes the size of their art pixels', () => {
    const dir = copy();
    try {
      const decoration = (id: number, kind: string, scale?: number) => ({
        id, name: '', type: kind, x: id * 100, y: 500, width: 0, height: 0, rotation: 0, visible: true, point: true,
        ...(scale === undefined ? {} : { properties: [{ name: 'scale', type: 'float', value: scale }] }),
      });
      const map = {
        type: 'map',
        layers: [
          { id: 1, name: 'decorations', type: 'objectgroup', objects: [decoration(1, 'stump', 1.3), decoration(2, 'gnome', 2), decoration(3, 'bush', 1), decoration(4, 'fern')] },
          // the same property on another layer isn't a decoration's
          { id: 2, name: 'signs', type: 'objectgroup', objects: [decoration(5, 'sign', 1.5)] },
        ],
      };
      mkdirSync(join(dir, 'src/levels/maps'), { recursive: true });
      writeFileSync(join(dir, 'src/levels/maps/test-level.tmj'), JSON.stringify(map));
      const scales = checkProject(dir).findings.filter((x) => x.check === 'scale');
      expect(scales.map((x) => x.level)).toEqual(['warning', 'warning']);
      expect(scales[0].message).toMatch(/"stump".*scale 1\.3.*uneven \(some 2, some 3 pixels wide\)/);
      expect(scales[1].message).toMatch(/"gnome".*4x4 screen pixels, chunkier/);
      // The real levels don't scale any decorations.
      expect(checkProject(ROOT).findings.filter((x) => x.check === 'scale')).toEqual([]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("spots a redrawn decoration whose solid top no longer lines up, and parts that don't match", () => {
    const dir = copy();
    try {
      // A squashed stump: its top is now far below where Melody stands on it.
      const stump = readPng(join(dir, 'public/assets/garden/stump.png'));
      const squashed = blankImage(stump.width, stump.height);
      const keep = Math.floor(stump.height / 2);
      squashed.data.set(stump.data.subarray((stump.height - keep) * stump.width * 4), (stump.height - keep) * stump.width * 4);
      writeFileSync(join(dir, 'public/assets/garden/stump.png'), encodePng(squashed));
      writeFileSync(join(dir, 'public/assets/garden/big-tree-leaves.png'), encodePng(blankImage(398, 500)));
      const f = found(dir);
      expect(f).toContain('warning:solids:stump.png');
      expect(f).toContain('error:parts:big-tree-leaves.png');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("spots Melody's feet off the ground", () => {
    const dir = copy();
    try {
      const file = join(dir, 'public/assets/sprites/melody.png');
      const sheet = readPng(file);
      // Lift frame 0 (idle) up by 4 pixels.
      const lifted = { ...sheet, data: new Uint8Array(sheet.data) };
      for (let y = 0; y < 76; y++) {
        for (let x = 0; x < 96; x++) {
          const from = y + 4 < 76 ? ((y + 4) * sheet.width + x) * 4 : -1;
          lifted.data.set(from >= 0 ? sheet.data.subarray(from, from + 4) : [0, 0, 0, 0], (y * sheet.width + x) * 4);
        }
      }
      writeFileSync(file, encodePng(lifted));
      expect(found(dir)).toContain('error:feet:melody.png');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
