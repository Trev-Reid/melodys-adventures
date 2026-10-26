/**
 * Measurements of a picture that tell us whether it will look right in the
 * game: hard or soft edges, whether it sits on the 2x2 art-pixel grid, how
 * many colours it uses, whether a "transparent" PNG secretly has a painted
 * background, where its feet are, whether it tiles without a seam.
 *
 * Pure functions on RgbaImage (see png.ts) - no game code, no browser.
 */
import type { RgbaImage } from './png';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Alpha above this counts as "visible" - the same rule the game uses to find a picture's bottom. */
export const VISIBLE_ALPHA = 20;

const alphaAt = (img: RgbaImage, x: number, y: number): number => img.data[(y * img.width + x) * 4 + 3];

/** Cut a rectangle out of a picture. */
export function crop(img: RgbaImage, r: Rect): RgbaImage {
  const data = new Uint8Array(r.width * r.height * 4);
  for (let y = 0; y < r.height; y++) {
    const from = ((r.y + y) * img.width + r.x) * 4;
    data.set(img.data.subarray(from, from + r.width * 4), y * r.width * 4);
  }
  return { width: r.width, height: r.height, data };
}

// ---- transparency ------------------------------------------------------------

export interface AlphaStats {
  pixels: number;
  /** alpha 0 */
  transparent: number;
  /** alpha 255 */
  opaque: number;
  /** anything in between */
  partial: number;
  /** The distinct in-between alpha values, smallest first. */
  partialLevels: number[];
}

export function alphaStats(img: RgbaImage): AlphaStats {
  const counts = new Uint32Array(256);
  for (let i = 3; i < img.data.length; i += 4) counts[img.data[i]]++;
  const partialLevels: number[] = [];
  let partial = 0;
  for (let a = 1; a < 255; a++) {
    if (counts[a]) {
      partialLevels.push(a);
      partial += counts[a];
    }
  }
  return { pixels: img.width * img.height, transparent: counts[0], opaque: counts[255], partial, partialLevels };
}

// ---- the art-pixel grid ----------------------------------------------------------

export interface GridReport {
  /** Cells (cell x cell blocks, lined up with the top-left corner) with anything visible in them. */
  cells: number;
  /** Of those, how many aren't one flat colour - i.e. detail finer than an art pixel. */
  offGrid: number;
  ratio: number;
  /** Top-left corner of the first bad cell, to point at. */
  example?: { x: number; y: number };
}

/**
 * Is every art pixel a flat cell x cell block? Pixel art drawn at 1x and
 * exported at 200% always is. Smooth or painted art (or art scaled by a
 * non-whole amount) isn't.
 */
export function gridReport(img: RgbaImage, cell: number): GridReport {
  let cells = 0;
  let offGrid = 0;
  let example: GridReport['example'];
  if (cell <= 1) return { cells: 0, offGrid: 0, ratio: 0 };
  const { width, height, data } = img;
  for (let cy = 0; cy + cell <= height; cy += cell) {
    for (let cx = 0; cx + cell <= width; cx += cell) {
      const first = (cy * width + cx) * 4;
      let visible = false;
      let flat = true;
      for (let y = cy; y < cy + cell; y++) {
        for (let x = cx; x < cx + cell; x++) {
          const i = (y * width + x) * 4;
          if (data[i + 3] > 0) visible = true;
          if (data[i] !== data[first] || data[i + 1] !== data[first + 1] || data[i + 2] !== data[first + 2] || data[i + 3] !== data[first + 3]) {
            // Fully transparent pixels can differ in their hidden colour - that doesn't show.
            if (data[i + 3] !== 0 || data[first + 3] !== 0) flat = false;
          }
        }
      }
      if (!visible) continue;
      cells++;
      if (!flat) {
        offGrid++;
        example ??= { x: cx, y: cy };
      }
    }
  }
  return { cells, offGrid, ratio: cells ? offGrid / cells : 0, example };
}

export interface PixelSizeReport {
  /** One art pixel is this many of the picture's pixels across (1: not blocky pixel art). */
  size: number;
  /** Share of colour changes that fall on that grid, 0-1 (the worse of across and down). */
  alignment: number;
  /** How many colour changes were measured (very few: can't tell). */
  edges: number;
}

/**
 * How big are the art pixels in a picture someone hands us (concept art, a reference
 * screenshot)? In clean pixel art scaled up N times, every colour change lands on a
 * multiple of N. Painted, smoothed or AI pictures - or pixel art scaled by a non-whole
 * amount - don't line up with any grid, and come out as size 1.
 */
export function estimatePixelSize(img: RgbaImage, maxSize = 16, threshold = 0.75): PixelSizeReport {
  const { width, height, data } = img;
  // A noticeable change only, so JPEG noise doesn't count as an edge.
  const differs = (i: number, j: number) =>
    Math.abs(data[i] - data[j]) + Math.abs(data[i + 1] - data[j + 1]) + Math.abs(data[i + 2] - data[j + 2]) + Math.abs(data[i + 3] - data[j + 3]) > 48;
  const across: number[] = [];
  const down: number[] = [];
  const rowStep = Math.max(1, Math.floor(height / 400));
  const colStep = Math.max(1, Math.floor(width / 400));
  for (let y = 0; y < height; y += rowStep) {
    for (let x = 1; x < width; x++) if (differs((y * width + x - 1) * 4, (y * width + x) * 4)) across.push(x);
  }
  for (let x = 0; x < width; x += colStep) {
    for (let y = 1; y < height; y++) if (differs(((y - 1) * width + x) * 4, (y * width + x) * 4)) down.push(y);
  }
  const fit = (positions: number[], k: number): number => {
    if (!positions.length) return 0;
    const counts = new Array<number>(k).fill(0);
    for (const p of positions) counts[p % k]++;
    return Math.max(...counts) / positions.length;
  };
  const edges = across.length + down.length;
  for (let k = Math.min(maxSize, Math.floor(Math.min(width, height) / 4)); k >= 2; k--) {
    const alignment = Math.min(fit(across, k), fit(down, k));
    if (across.length >= 20 && down.length >= 20 && alignment >= threshold) return { size: k, alignment, edges };
  }
  return { size: 1, alignment: 1, edges };
}

// ---- colours -------------------------------------------------------------------

export interface ColourStats {
  /** Distinct colours among the fully opaque pixels. */
  colours: number;
  /**
   * Distinct colours once very similar ones are merged (4 bits per channel).
   * Clean pixel art: about the same as `colours`. Blurred, painted, JPEG'd or
   * AI-made art: far fewer - it's full of almost-identical colours.
   */
  merged: number;
}

export function colourStats(img: RgbaImage): ColourStats {
  const exact = new Set<number>();
  const merged = new Set<number>();
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] !== 255) continue;
    exact.add((d[i] << 16) | (d[i + 1] << 8) | d[i + 2]);
    merged.add(((d[i] >> 4) << 8) | ((d[i + 1] >> 4) << 4) | (d[i + 2] >> 4));
  }
  return { colours: exact.size, merged: merged.size };
}

/** Every distinct opaque colour with how many pixels use it, most used first. */
export function colourCounts(img: RgbaImage): { rgb: number; count: number }[] {
  const counts = new Map<number, number>();
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] !== 255) continue;
    const c = (d[i] << 16) | (d[i + 1] << 8) | d[i + 2];
    counts.set(c, (counts.get(c) ?? 0) + 1);
  }
  return [...counts.entries()].map(([rgb, count]) => ({ rgb, count })).sort((a, b) => b.count - a.count);
}

// ---- painted-in backgrounds ----------------------------------------------------------

export interface BorderReport {
  /** Fraction of the outermost ring of pixels that is fully opaque. */
  opaque: number;
  /** Share of the ring taken by its single most common colour. */
  dominant: number;
  /** The ring alternates between two light greys: a "transparency" checkerboard painted into the picture. */
  checkerboard: boolean;
}

/**
 * A cut-out picture (a prop, a character) should have see-through edges. If
 * its whole outer ring is solid, the background was saved into the picture -
 * often a white box, or the grey checkerboard that image tools and AI image
 * generators draw to *show* transparency.
 */
export function borderReport(img: RgbaImage): BorderReport {
  const { width, height } = img;
  const ring: number[] = [];
  const push = (x: number, y: number) => ring.push((y * width + x) * 4);
  for (let x = 0; x < width; x++) {
    push(x, 0);
    if (height > 1) push(x, height - 1);
  }
  for (let y = 1; y < height - 1; y++) {
    push(0, y);
    if (width > 1) push(width - 1, y);
  }
  const d = img.data;
  let opaque = 0;
  const counts = new Map<number, number>();
  for (const i of ring) {
    if (d[i + 3] === 255) opaque++;
    const c = (d[i] << 16) | (d[i + 1] << 8) | d[i + 2];
    counts.set(c, (counts.get(c) ?? 0) + 1);
  }
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const dominant = ranked.length ? ranked[0][1] / ring.length : 0;
  let checkerboard = false;
  if (ranked.length >= 2 && opaque / ring.length > 0.95) {
    const [a, b] = [ranked[0], ranked[1]];
    const lightGrey = (c: number) => {
      const r = c >> 16;
      const g = (c >> 8) & 255;
      const bl = c & 255;
      return Math.max(r, g, bl) - Math.min(r, g, bl) < 16 && (r + g + bl) / 3 > 140;
    };
    const share = (a[1] + b[1]) / ring.length;
    if (share > 0.85 && b[1] / ring.length > 0.2 && lightGrey(a[0]) && lightGrey(b[0])) {
      // ...and they alternate along the top edge in regular squares.
      let switches = 0;
      for (let x = 1; x < width; x++) {
        const p = (x - 1) * 4;
        const q = x * 4;
        if (d[p] !== d[q] || d[p + 1] !== d[q + 1] || d[p + 2] !== d[q + 2]) switches++;
      }
      checkerboard = switches >= Math.max(2, width / 40);
    }
  }
  return { opaque: ring.length ? opaque / ring.length : 0, dominant, checkerboard };
}

// ---- where the picture is ----------------------------------------------------------

export interface EmptyEdges {
  top: number;
  bottom: number;
  left: number;
  right: number;
  /** Nothing visible at all. */
  empty: boolean;
}

/** How many fully see-through rows/columns there are at each edge (of a rectangle of the picture). */
export function emptyEdges(img: RgbaImage, r: Rect = { x: 0, y: 0, width: img.width, height: img.height }): EmptyEdges {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -1;
  let maxY = -1;
  for (let y = r.y; y < r.y + r.height; y++) {
    for (let x = r.x; x < r.x + r.width; x++) {
      if (alphaAt(img, x, y) > VISIBLE_ALPHA) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return { top: r.height, bottom: r.height, left: r.width, right: r.width, empty: true };
  return {
    top: minY - r.y,
    bottom: r.y + r.height - 1 - maxY,
    left: minX - r.x,
    right: r.x + r.width - 1 - maxX,
    empty: false,
  };
}

/** The frames of a sprite sheet, left to right then top to bottom (Phaser's order). */
export function frameRects(width: number, height: number, frameWidth: number, frameHeight: number, spacing = 0, margin = 0): Rect[] {
  const cols = Math.floor((width - margin * 2 + spacing) / (frameWidth + spacing));
  const rows = Math.floor((height - margin * 2 + spacing) / (frameHeight + spacing));
  const rects: Rect[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      rects.push({ x: margin + col * (frameWidth + spacing), y: margin + row * (frameHeight + spacing), width: frameWidth, height: frameHeight });
    }
  }
  return rects;
}

/** Does a sheet's size divide exactly into frames? (Phaser silently drops leftovers.) */
export function sheetFits(width: number, height: number, frameWidth: number, frameHeight: number, spacing = 0, margin = 0): boolean {
  return (width - margin * 2 + spacing) % (frameWidth + spacing) === 0 && (height - margin * 2 + spacing) % (frameHeight + spacing) === 0;
}

/** Largest alpha in the gaps between frames (should be 0, or neighbours bleed into each other). */
export function gutterAlpha(img: RgbaImage, frameWidth: number, frameHeight: number, spacing: number): number {
  if (spacing <= 0) return 0;
  let max = 0;
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      const inGapX = x % (frameWidth + spacing) >= frameWidth;
      const inGapY = y % (frameHeight + spacing) >= frameHeight;
      if (inGapX || inGapY) max = Math.max(max, alphaAt(img, x, y));
    }
  }
  return max;
}

/**
 * Of the columns x0..x1 (picture coordinates), how many have something
 * visible within rows y+from..y+to? Used to check a solid surface (the
 * stump's top, the trampoline mat) lines up with the picture.
 */
export function coverageNear(img: RgbaImage, x0: number, x1: number, y: number, from: number, to: number): number {
  const left = Math.max(0, Math.floor(x0));
  const right = Math.min(img.width, Math.ceil(x1));
  if (right <= left) return 0;
  const top = Math.max(0, Math.floor(y + from));
  const bottom = Math.min(img.height - 1, Math.ceil(y + to));
  let hit = 0;
  for (let x = left; x < right; x++) {
    for (let yy = top; yy <= bottom; yy++) {
      if (alphaAt(img, x, yy) > VISIBLE_ALPHA) {
        hit++;
        break;
      }
    }
  }
  return hit / (right - left);
}

// ---- tiling -------------------------------------------------------------------

export interface SeamReport {
  /** Average difference across the wrap-around join (last column next to the first). */
  join: number;
  /** The same measure between neighbouring columns inside the picture (90th percentile). */
  inside: number;
  /** join / inside: well above 1 means a visible seam every time it repeats. */
  ratio: number;
}

/** For pictures that repeat: does the end join up with the start? */
export function seamReport(img: RgbaImage, axis: 'x' | 'y'): SeamReport {
  const n = axis === 'x' ? img.width : img.height;
  const m = axis === 'x' ? img.height : img.width;
  const at = (i: number, j: number) => (axis === 'x' ? (j * img.width + i) * 4 : (i * img.width + j) * 4);
  const diff = (a: number, b: number): number => {
    let total = 0;
    for (let j = 0; j < m; j++) {
      const p = at(a, j);
      const q = at(b, j);
      const d = img.data;
      // Compare what you see: colour weighted by how visible it is, plus the visibility itself.
      const pa = d[p + 3] / 255;
      const qa = d[q + 3] / 255;
      total += (Math.abs(d[p] * pa - d[q] * qa) + Math.abs(d[p + 1] * pa - d[q + 1] * qa) + Math.abs(d[p + 2] * pa - d[q + 2] * qa)) / 3;
      total += Math.abs(d[p + 3] - d[q + 3]) / 2;
    }
    return total / m;
  };
  const inside: number[] = [];
  for (let i = 1; i < n; i++) inside.push(diff(i - 1, i));
  inside.sort((a, b) => a - b);
  const p90 = inside.length ? inside[Math.floor(inside.length * 0.9)] : 0;
  const join = diff(n - 1, 0);
  return { join, inside: p90, ratio: join / Math.max(p90, 1) };
}

// ---- comparing screenshots ----------------------------------------------------------

export interface DiffReport {
  /** Pixels that changed noticeably (any channel by more than `threshold`). */
  changed: number;
  ratio: number;
  /** Average change per channel over the whole picture (0-255). */
  meanDelta: number;
  /** Where the changes are. */
  bounds?: Rect;
  /** A picture of the changes: the old screenshot faded, changed pixels in magenta. */
  image: RgbaImage;
}

export function diffImages(a: RgbaImage, b: RgbaImage, threshold = 8): DiffReport {
  const width = Math.min(a.width, b.width);
  const height = Math.min(a.height, b.height);
  const out = new Uint8Array(width * height * 4);
  let changed = 0;
  let total = 0;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * a.width + x) * 4;
      const j = (y * b.width + x) * 4;
      const o = (y * width + x) * 4;
      const dr = Math.abs(a.data[i] - b.data[j]);
      const dg = Math.abs(a.data[i + 1] - b.data[j + 1]);
      const db = Math.abs(a.data[i + 2] - b.data[j + 2]);
      total += (dr + dg + db) / 3;
      const lum = (a.data[i] * 0.3 + a.data[i + 1] * 0.59 + a.data[i + 2] * 0.11) * 0.35 + 150;
      if (Math.max(dr, dg, db) > threshold) {
        changed++;
        out[o] = 255;
        out[o + 1] = 0;
        out[o + 2] = 200;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      } else {
        out[o] = out[o + 1] = out[o + 2] = Math.min(255, lum);
      }
      out[o + 3] = 255;
    }
  }
  const pixels = width * height;
  return {
    changed,
    ratio: pixels ? changed / pixels : 0,
    meanDelta: pixels ? total / pixels : 0,
    bounds: maxX >= 0 ? { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 } : undefined,
    image: { width, height, data: out },
  };
}

export interface LookStats {
  /** Average brightness 0-1. */
  brightness: number;
  /** Spread of brightness (standard deviation) - higher is punchier. */
  contrast: number;
  /** Average colourfulness 0-1. */
  saturation: number;
  /** How busy the picture is: share of pixels at a strong edge. */
  detail: number;
  /** The main colours, most used first (hex). */
  palette: string[];
}

/** The overall look of a screenshot or a piece of concept art, for comparing moods rather than pixels. */
export function lookStats(img: RgbaImage, paletteSize = 8): LookStats {
  const { width, height, data } = img;
  const n = width * height;
  const lum = new Float32Array(n);
  let sumL = 0;
  let sumS = 0;
  for (let p = 0; p < n; p++) {
    const r = data[p * 4] / 255;
    const g = data[p * 4 + 1] / 255;
    const b = data[p * 4 + 2] / 255;
    const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    lum[p] = l;
    sumL += l;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    sumS += max === 0 ? 0 : (max - min) / max;
  }
  const mean = sumL / n;
  let variance = 0;
  for (let p = 0; p < n; p++) variance += (lum[p] - mean) ** 2;
  let edges = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const p = y * width + x;
      const gx = lum[p + 1] - lum[p - 1];
      const gy = lum[p + width] - lum[p - width];
      if (Math.hypot(gx, gy) > 0.12) edges++;
    }
  }
  return {
    brightness: mean,
    contrast: Math.sqrt(variance / n),
    saturation: sumS / n,
    detail: edges / n,
    palette: medianCut(img, paletteSize).map(toHex),
  };
}

export const toHex = (rgb: number): string => `#${rgb.toString(16).padStart(6, '0')}`;

/**
 * Reduce a picture to its `count` main colours (median cut). Used to pull a
 * palette out of concept art, and to describe a screenshot's colours.
 * Returns colours most used first.
 */
export function medianCut(img: RgbaImage, count: number): number[] {
  const pixels: number[] = [];
  const d = img.data;
  const step = Math.max(1, Math.floor((img.width * img.height) / 200_000)); // sample big pictures
  for (let i = 0; i < d.length; i += 4 * step) if (d[i + 3] > 127) pixels.push((d[i] << 16) | (d[i + 1] << 8) | d[i + 2]);
  if (!pixels.length) return [];
  const ch = (c: number, k: number) => (k === 0 ? c >> 16 : k === 1 ? (c >> 8) & 255 : c & 255);
  let boxes: number[][] = [pixels];
  while (boxes.length < count) {
    // Split the box with the widest spread of colour.
    let best = -1;
    let bestRange = -1;
    let bestChannel = 0;
    boxes.forEach((box, i) => {
      if (box.length < 2) return;
      for (let k = 0; k < 3; k++) {
        let lo = 255;
        let hi = 0;
        for (const c of box) {
          const v = ch(c, k);
          if (v < lo) lo = v;
          if (v > hi) hi = v;
        }
        if (hi - lo > bestRange) {
          bestRange = hi - lo;
          best = i;
          bestChannel = k;
        }
      }
    });
    if (best < 0 || bestRange <= 0) break;
    const box = boxes[best].sort((a, b) => ch(a, bestChannel) - ch(b, bestChannel));
    const mid = box.length >> 1;
    boxes.splice(best, 1, box.slice(0, mid), box.slice(mid));
  }
  return boxes
    .filter((b) => b.length)
    .sort((a, b) => b.length - a.length)
    .map((box) => {
      let r = 0;
      let g = 0;
      let b = 0;
      for (const c of box) {
        r += c >> 16;
        g += (c >> 8) & 255;
        b += c & 255;
      }
      const n = box.length;
      return (Math.round(r / n) << 16) | (Math.round(g / n) << 8) | Math.round(b / n);
    });
}
