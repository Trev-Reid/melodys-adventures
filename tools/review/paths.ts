/** Where the screenshot review keeps its pictures (see docs/ART-PIPELINE.md). */
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ReviewShot } from '../../src/review/review';

export const ROOT = resolve(fileURLToPath(new URL('../..', import.meta.url)));
/** The latest photos and comparison boards. Not kept in git - make them again any time. */
export const OUT = join(ROOT, 'art', 'review', 'out');
export const CURRENT = join(OUT, 'current');
/** Approved photos of the game: what "no change" looks like. Kept in git. */
export const BASELINES = join(ROOT, 'art', 'review', 'baselines');
/** What each shot should look like: concept art or a mock-up, named after the shot. */
export const TARGETS = join(ROOT, 'art', 'reference', 'targets');

export function loadShots(): ReviewShot[] {
  return (JSON.parse(readFileSync(join(ROOT, 'src', 'review', 'shots.json'), 'utf8')) as { shots: ReviewShot[] }).shots;
}

/** The shots named on the command line (or all of them), complaining about unknown names. */
export function pickShots(names: string[]): ReviewShot[] {
  const shots = loadShots();
  if (!names.length) return shots;
  const unknown = names.filter((n) => !shots.some((s) => s.name === n));
  if (unknown.length) throw new Error(`No shot called ${unknown.join(', ')}. Shots: ${shots.map((s) => s.name).join(', ')} (src/review/shots.json)`);
  return shots.filter((s) => names.includes(s.name));
}

/** A picture for a shot, if there is one (target art may be .png only, for now). */
export const shotFile = (dir: string, name: string): string | undefined => {
  const file = join(dir, `${name}.png`);
  return existsSync(file) ? file : undefined;
};

/**
 * Which computer and browser drew the photos, e.g. "Windows · msedge 141.0 · software drawing".
 * Fonts and graphics drivers draw text and edges slightly differently on different setups, so
 * a photo is only compared pixel-for-pixel with a baseline approved on the same setup.
 *   art/review/out/current/_setup.json   {"setup": "...", "captured": "...", "shots": [...]} (capture)
 *   art/review/baselines/_setup.json     {"<shot>": {"setup": "...", "approved": "..."}}   (approve)
 */
export const SETUP_FILE = '_setup.json';

export function readJson<T>(file: string): T | undefined {
  try {
    return JSON.parse(readFileSync(file, 'utf8')) as T;
  } catch {
    return undefined;
  }
}

export interface CaptureSetup {
  setup: string;
  captured: string;
  shots: string[];
}
export type BaselineSetups = Record<string, { setup: string; approved: string }>;
