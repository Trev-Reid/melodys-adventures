/**
 * Palettes for drawing Melody's Adventures art.
 *
 *   npm run art:palette
 *       Writes the house palette - every colour ramp the garden and Melody are
 *       drawn with (tools/art/make_garden.py, tools/sprites/make_melody.py) -
 *       to art/palettes/house.gpl (load it in Aseprite, LibreSprite, Krita,
 *       GIMP or Lospec) and art/palettes/house.png (a swatch card).
 *
 *   npm run art:palette -- --from art/reference/concept/garden.png --colours 24
 *       Pulls the main colours out of a reference picture (concept art, a
 *       photo of the real garden) into art/palettes/<name>.gpl/.png, plus
 *       <name>-preview.png: the picture redrawn in just those colours, at the
 *       game's art-pixel size - a quick look at how it would read as pixel art.
 *       It also says how big the picture's own art pixels are (or that it
 *       isn't clean pixel art), to compare with the game's 2x2 at 960x540.
 *       PNG only: convert other formats to PNG first (keep the original).
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { blankImage, readPng, writePng, type RgbaImage } from './png';
import { estimatePixelSize, medianCut } from './analyze';
import { drawText, fill, textWidth } from '../review/imageOps';
import { ROOT } from '../review/paths';

export interface Ramp {
  name: string;
  /** Darkest first. */
  colours: number[];
  from: string;
}

const PALETTES = join(ROOT, 'art', 'palettes');

/** Colour ramps defined at the top level of the art generators. */
export function houseRamps(): Ramp[] {
  const ramps: Ramp[] = [];
  const garden = readFileSync(join(ROOT, 'tools/art/make_garden.py'), 'utf8');
  for (const m of garden.matchAll(/^([A-Z][A-Z0-9_]*) = (ramp|rgb)\((.*)\)\s*$/gm)) {
    const colours = [...m[3].matchAll(/'#?([0-9a-fA-F]{6})'/g)].map((h) => parseInt(h[1], 16));
    if (colours.length) ramps.push({ name: m[1], colours, from: 'garden' });
  }
  const melody = readFileSync(join(ROOT, 'tools/sprites/make_melody.py'), 'utf8');
  const melodyColours: { name: string; c: number }[] = [];
  for (const m of melody.matchAll(/^([A-Z][A-Z0-9_]*) = \((\d+), (\d+), (\d+)\)/gm)) {
    melodyColours.push({ name: m[1], c: (Number(m[2]) << 16) | (Number(m[3]) << 8) | Number(m[4]) });
  }
  const lum = (c: number) => (c >> 16) * 0.3 + ((c >> 8) & 255) * 0.59 + (c & 255) * 0.11;
  if (melodyColours.length) {
    ramps.push({ name: 'MELODY', colours: melodyColours.map((x) => x.c).sort((a, b) => lum(a) - lum(b)), from: 'melody' });
  }
  return ramps;
}

const hex = (c: number) => c.toString(16).padStart(6, '0');

export function toGpl(name: string, ramps: Ramp[]): string {
  const lines = ['GIMP Palette', `Name: ${name}`, 'Columns: 8', '#'];
  for (const r of ramps) {
    r.colours.forEach((c, i) => {
      const rgb = [c >> 16, (c >> 8) & 255, c & 255].map((v) => String(v).padStart(3)).join(' ');
      lines.push(`${rgb}\t${r.name}${r.colours.length > 1 ? ` ${i + 1}` : ''} #${hex(c)}`);
    });
  }
  return `${lines.join('\n')}\n`;
}

/** A swatch card: one row per ramp. */
export function swatchCard(title: string, ramps: Ramp[]): RgbaImage {
  const cell = 28;
  const labelW = Math.max(...ramps.map((r) => textWidth(r.name))) + 24;
  const widest = Math.max(...ramps.map((r) => r.colours.length));
  const width = Math.max(labelW + widest * cell + 16, textWidth(title) + 24);
  const height = 44 + ramps.length * (cell + 6) + 10;
  const img = blankImage(width, height);
  fill(img, 0, 0, width, height, [30, 32, 40]);
  drawText(img, 12, 14, title, [240, 240, 245]);
  ramps.forEach((r, row) => {
    const y = 44 + row * (cell + 6);
    drawText(img, 12, y + 7, r.name, [180, 184, 196]);
    r.colours.forEach((c, i) => {
      fill(img, labelW + i * cell, y, cell - 2, cell, [c >> 16, (c >> 8) & 255, c & 255]);
    });
  });
  return img;
}

/** Redraw a picture in only `palette`'s colours, in blocks of `pixel` (a pixel-art preview). */
export function posterise(img: RgbaImage, palette: number[], pixel: number): RgbaImage {
  const out = blankImage(img.width, img.height);
  const pal = palette.map((c) => [c >> 16, (c >> 8) & 255, c & 255]);
  for (let by = 0; by < img.height; by += pixel) {
    for (let bx = 0; bx < img.width; bx += pixel) {
      let r = 0, g = 0, b = 0, a = 0, n = 0;
      for (let y = by; y < Math.min(by + pixel, img.height); y++) {
        for (let x = bx; x < Math.min(bx + pixel, img.width); x++) {
          const i = (y * img.width + x) * 4;
          r += img.data[i]; g += img.data[i + 1]; b += img.data[i + 2]; a += img.data[i + 3]; n++;
        }
      }
      r /= n; g /= n; b /= n; a /= n;
      let best = pal[0];
      let bestD = Infinity;
      for (const p of pal) {
        const d = (p[0] - r) ** 2 * 0.3 + (p[1] - g) ** 2 * 0.59 + (p[2] - b) ** 2 * 0.11;
        if (d < bestD) { bestD = d; best = p; }
      }
      fill(out, bx, by, pixel, pixel, [best[0], best[1], best[2], a >= 128 ? 255 : 0]);
    }
  }
  return out;
}

function main(argv: string[]): number {
  mkdirSync(PALETTES, { recursive: true });
  const at = (flag: string) => {
    const i = argv.indexOf(flag);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const from = at('--from');
  if (!from) {
    const ramps = houseRamps();
    writeFileSync(join(PALETTES, 'house.gpl'), toGpl("Melody's Adventures - house palette", ramps));
    writePng(join(PALETTES, 'house.png'), swatchCard("MELODY'S ADVENTURES - HOUSE PALETTE", ramps));
    writeFileSync(join(PALETTES, 'house.json'), `${JSON.stringify(ramps.map((r) => ({ name: r.name, from: r.from, colours: r.colours.map((c) => `#${hex(c)}`) })), null, 1)}\n`);
    console.log(`${ramps.length} ramps, ${ramps.reduce((n, r) => n + r.colours.length, 0)} colours -> art/palettes/house.gpl, house.png, house.json`);
    return 0;
  }
  const count = Number(at('--colours') ?? at('--colors') ?? 24);
  const name = at('--name') ?? basename(from).replace(/\.[^.]+$/, '');
  const img = readPng(from);
  // Lightest to darkest isn't how artists read a palette; group by hue, then dark to light.
  const colours = medianCut(img, count);
  const hue = (c: number) => {
    const r = (c >> 16) / 255, g = ((c >> 8) & 255) / 255, b = (c & 255) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    if (max - min < 0.08) return -1; // greys first
    const h = max === r ? ((g - b) / (max - min)) % 6 : max === g ? (b - r) / (max - min) + 2 : (r - g) / (max - min) + 4;
    return (h * 60 + 360) % 360;
  };
  const lum = (c: number) => (c >> 16) * 0.3 + ((c >> 8) & 255) * 0.59 + (c & 255) * 0.11;
  const sorted = [...colours].sort((a, b) => Math.round(hue(a) / 30) - Math.round(hue(b) / 30) || lum(a) - lum(b));
  const ramps: Ramp[] = [];
  for (let i = 0; i < sorted.length; i += 8) ramps.push({ name: `${name.toUpperCase()} ${i / 8 + 1}`, colours: sorted.slice(i, i + 8), from });
  writeFileSync(join(PALETTES, `${name}.gpl`), toGpl(`${name} (from ${basename(from)})`, ramps));
  writePng(join(PALETTES, `${name}.png`), swatchCard(`${name.toUpperCase()} - ${colours.length} COLOURS`, ramps));
  // Preview at the game's art-pixel size, scaled as if the picture were 960 wide.
  const pixel = Math.max(2, Math.round((img.width / 960) * 2));
  writePng(join(PALETTES, `${name}-preview.png`), posterise(img, colours, pixel));
  console.log(`${colours.length} colours -> art/palettes/${name}.gpl, ${name}.png, ${name}-preview.png`);
  console.log(pixelSizeNote(img));
  return 0;
}

/** How the picture's art pixels compare with the game's (2x2 screen pixels in a 960x540 frame). */
export function pixelSizeNote(img: RgbaImage): string {
  const p = estimatePixelSize(img);
  if (p.edges < 40) return 'Art pixels: too little detail to tell.';
  if (p.size === 1) {
    return 'Art pixels: none found - this is painted, smoothed or AI art (or pixel art scaled by a non-whole amount). Use it for colours, light and composition, and redraw for the game.';
  }
  // If this picture shows the same view as a 960-wide game screen, its art pixels in game pixels:
  const inGame = (p.size * 960) / img.width;
  const compare = Math.abs(inGame - 2) < 0.25 ? 'the same as the game' : inGame > 2 ? 'chunkier than the game' : 'finer than the game';
  const mixed = p.alignment < 0.9 ? ', the rest is soft light, text or off-grid detail' : '';
  return `Art pixels: ${p.size}x${p.size} (${Math.round(p.alignment * 100)}% of edges on that grid${mixed}): ${Math.round(img.width / p.size)}x${Math.round(img.height / p.size)} art pixels. If it shows a whole game screen, that's ${inGame.toFixed(1)} game pixels per art pixel - ${compare} (2).`;
}

const isMain = process.argv[1] && basename(process.argv[1]).startsWith('palette');
if (isMain) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (e) {
    console.error((e as Error).message);
    process.exitCode = 1;
  }
}
