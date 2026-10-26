import { PLACEHOLDER_SPECS } from './placeholderSpecs';

/**
 * Real art for things that are still drawn by code (placeholders.ts).
 *
 * Save a PNG named after the placeholder's key in src/assets/replacements/
 * - boy.png, item-sausage.png, obstacle-heavyCrate.png... - and the game
 * loads it instead of drawing the placeholder. Same key, same size, so
 * nothing about how the game plays changes. The keys, and the sizes their
 * art must be, are in placeholderSpecs.ts; `npm run art:check` checks them.
 */
const FILES = import.meta.glob<string>('./replacements/*.png', { eager: true, query: '?url', import: 'default' });

export const REPLACEMENT_ART: { key: string; url: string }[] = Object.entries(FILES).map(([path, url]) => ({
  key: path.replace(/^.*\//, '').replace(/\.png$/i, ''),
  url,
}));

/** A note for the browser console (dev only) about any replacement that won't fit, so it's noticed early. */
export function replacementWarnings(sizeOf: (key: string) => { width: number; height: number } | undefined): string[] {
  const out: string[] = [];
  for (const { key } of REPLACEMENT_ART) {
    const size = sizeOf(key);
    const spec = PLACEHOLDER_SPECS[key];
    if (!size || !spec) continue;
    const tol = spec.fit === 'exact' ? 0 : spec.fit === 'about' ? (spec.tolerance ?? 0) : Infinity;
    if (Math.abs(size.width - spec.width) > tol || Math.abs(size.height - spec.height) > tol) {
      out.push(`${key}.png is ${size.width}x${size.height} but should be about ${spec.width}x${spec.height} - run npm run art:check`);
    }
  }
  return out;
}
