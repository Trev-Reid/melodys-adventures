/**
 * A small PNG reader and writer with no dependencies (just Node's zlib), so
 * the art checks run anywhere `npm test` runs - including GitHub's automatic
 * tests. Reads every standard PNG flavour (greyscale, RGB, palette, with or
 * without alpha, 1-16 bits) into plain 8-bit RGBA; writes 8-bit RGBA.
 * Interlaced PNGs aren't supported (re-export without interlacing).
 */
import { inflateSync, deflateSync } from 'node:zlib';
import { readFileSync, writeFileSync } from 'node:fs';

export interface RgbaImage {
  width: number;
  height: number;
  /** 4 bytes per pixel, rows top to bottom. */
  data: Uint8Array;
}

export interface PngInfo {
  width: number;
  height: number;
  bitDepth: number;
  /** 0 grey, 2 RGB, 3 palette, 4 grey+alpha, 6 RGBA. */
  colorType: number;
  interlaced: boolean;
  /** Can it be transparent at all? (alpha channel, or a tRNS chunk) */
  hasAlpha: boolean;
  /** Every chunk type in the file, in order (e.g. IHDR, iCCP, IDAT...). */
  chunks: string[];
}

const SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

export class PngError extends Error {}

/** Read just the header (fast). */
export function pngInfo(bytes: Uint8Array): PngInfo {
  const buf = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (buf.length < 33 || !buf.subarray(0, 8).equals(SIGNATURE)) throw new PngError('not a PNG file');
  if (buf.toString('latin1', 12, 16) !== 'IHDR') throw new PngError('PNG has no IHDR header');
  const colorType = buf[25];
  let hasAlpha = colorType === 4 || colorType === 6;
  const types: string[] = [];
  for (const c of chunks(buf)) {
    if (c.type === 'tRNS') hasAlpha = true;
    if (types[types.length - 1] !== c.type) types.push(c.type);
  }
  return {
    width: buf.readUInt32BE(16),
    height: buf.readUInt32BE(20),
    bitDepth: buf[24],
    colorType,
    interlaced: buf[28] === 1,
    hasAlpha,
    chunks: types,
  };
}

function* chunks(buf: Buffer): Generator<{ type: string; data: Buffer }> {
  let p = 8;
  while (p + 8 <= buf.length) {
    const len = buf.readUInt32BE(p);
    const type = buf.toString('latin1', p + 4, p + 8);
    yield { type, data: buf.subarray(p + 8, p + 8 + len) };
    p += 12 + len;
    if (type === 'IEND') return;
  }
}

/** Decode a PNG into 8-bit RGBA. */
export function decodePng(bytes: Uint8Array): RgbaImage & { info: PngInfo } {
  const buf = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const info = pngInfo(buf);
  if (info.interlaced) throw new PngError('interlaced PNGs are not supported - export without interlacing');
  const { width, height, bitDepth, colorType } = info;
  let palette: Buffer | undefined;
  let trns: Buffer | undefined;
  const idat: Buffer[] = [];
  for (const c of chunks(buf)) {
    if (c.type === 'PLTE') palette = c.data;
    else if (c.type === 'tRNS') trns = c.data;
    else if (c.type === 'IDAT') idat.push(c.data);
  }
  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[colorType];
  if (!channels) throw new PngError(`unknown PNG colour type ${colorType}`);
  if (colorType === 3 && !palette) throw new PngError('palette PNG without a palette');
  const bitsPerPixel = channels * bitDepth;
  const bpp = Math.max(1, bitsPerPixel >> 3); // bytes per pixel, for filtering
  const stride = Math.ceil((width * bitsPerPixel) / 8);
  const raw = inflateSync(Buffer.concat(idat));
  if (raw.length < height * (stride + 1)) throw new PngError('PNG image data is too short (damaged file?)');

  // Undo the per-row filters.
  const pixels = Buffer.alloc(height * stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const src = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const out = pixels.subarray(y * stride, (y + 1) * stride);
    const prev = y > 0 ? pixels.subarray((y - 1) * stride, y * stride) : undefined;
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? out[x - bpp] : 0;
      const b = prev ? prev[x] : 0;
      const c = prev && x >= bpp ? prev[x - bpp] : 0;
      let v = src[x];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      } else if (filter !== 0) throw new PngError(`unknown PNG row filter ${filter}`);
      out[x] = v & 255;
    }
  }

  // Expand to RGBA8.
  const data = new Uint8Array(width * height * 4);
  const sample = (row: Buffer, i: number): number => {
    if (bitDepth === 8) return row[i];
    if (bitDepth === 16) return row[i * 2];
    const perByte = 8 / bitDepth;
    const byte = row[Math.floor(i / perByte)];
    const shift = 8 - bitDepth * ((i % perByte) + 1);
    return (byte >> shift) & ((1 << bitDepth) - 1);
  };
  const scale = bitDepth < 8 && colorType !== 3 ? 255 / ((1 << bitDepth) - 1) : 1;
  const trnsGrey = trns && colorType === 0 ? trns.readUInt16BE(0) : -1;
  const trnsRgb = trns && colorType === 2 ? [trns.readUInt16BE(0), trns.readUInt16BE(2), trns.readUInt16BE(4)] : undefined;
  for (let y = 0; y < height; y++) {
    const row = pixels.subarray(y * stride, (y + 1) * stride);
    for (let x = 0; x < width; x++) {
      const o = (y * width + x) * 4;
      if (colorType === 3) {
        const idx = sample(row, x);
        data[o] = palette![idx * 3];
        data[o + 1] = palette![idx * 3 + 1];
        data[o + 2] = palette![idx * 3 + 2];
        data[o + 3] = trns && idx < trns.length ? trns[idx] : 255;
      } else if (colorType === 0 || colorType === 4) {
        const g = sample(row, x * channels);
        const v = Math.round(g * scale);
        data[o] = data[o + 1] = data[o + 2] = v;
        data[o + 3] = colorType === 4 ? sample(row, x * channels + 1) : g === trnsGrey ? 0 : 255;
      } else {
        const r = sample(row, x * channels);
        const g = sample(row, x * channels + 1);
        const b = sample(row, x * channels + 2);
        data[o] = r;
        data[o + 1] = g;
        data[o + 2] = b;
        data[o + 3] = colorType === 6 ? sample(row, x * channels + 3) : trnsRgb && r === trnsRgb[0] && g === trnsRgb[1] && b === trnsRgb[2] ? 0 : 255;
      }
    }
  }
  return { width, height, data, info };
}

export function readPng(path: string): RgbaImage & { info: PngInfo } {
  return decodePng(readFileSync(path));
}

/** Encode 8-bit RGBA as a PNG. */
export function encodePng(img: RgbaImage): Buffer {
  const { width, height, data } = img;
  const stride = width * 4;
  const raw = Buffer.alloc(height * (stride + 1));
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    Buffer.from(data.buffer, data.byteOffset + y * stride, stride).copy(raw, y * (stride + 1) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([SIGNATURE, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

export function writePng(path: string, img: RgbaImage): void {
  writeFileSync(path, encodePng(img));
}

function chunk(type: string, data: Buffer): Buffer {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, 'latin1');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])), 0);
  return Buffer.concat([head, data, crc]);
}

let CRC_TABLE: Uint32Array | undefined;
function crc32(buf: Buffer): number {
  if (!CRC_TABLE) {
    CRC_TABLE = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      CRC_TABLE[n] = c >>> 0;
    }
  }
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** A blank (transparent) image. */
export function blankImage(width: number, height: number): RgbaImage {
  return { width, height, data: new Uint8Array(width * height * 4) };
}
