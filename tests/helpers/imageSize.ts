import { readFileSync } from 'node:fs';

/** Width and height of a PNG file (read from its header). */
export function imageSize(path: string): { width: number; height: number } {
  const b = readFileSync(path);
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
}
