import type { LevelDefinition } from './LevelDefinition';
import type { TiledMap } from './tiled/tiledFormat';
import { TiledLevelError, levelFromTiled } from './tiled/loadTiledLevel';

/**
 * Every level is a Tiled map in src/levels/maps/. Any `<name>.tmj` saved there
 * becomes a level called `<name>` - no code changes needed. Play one with
 * http://localhost:5173/?level=<name>
 */
const MAP_FILES = import.meta.glob<string>('./maps/*.tmj', { eager: true, query: '?raw', import: 'default' });

export const LEVELS: Record<string, LevelDefinition> = {};
/** Maps that failed to load, with the reasons (shown on screen instead of crashing). */
export const LEVEL_ERRORS: Record<string, string[]> = {};

for (const [path, text] of Object.entries(MAP_FILES)) {
  const key = path.replace(/^.*\//, '').replace(/\.tmj$/, '');
  try {
    LEVELS[key] = levelFromTiled(JSON.parse(text) as TiledMap, key);
  } catch (e) {
    LEVEL_ERRORS[key] =
      e instanceof TiledLevelError ? e.problems : [`Couldn't read the map file: ${(e as Error).message}`];
  }
}

export const DEFAULT_LEVEL_KEY = 'melodys-playground';

/** Level names that can be played. */
export function levelKeys(): string[] {
  return [...Object.keys(LEVELS), ...Object.keys(LEVEL_ERRORS)].sort();
}

export function getLevel(key: string): LevelDefinition {
  const level = LEVELS[key];
  if (level) return level;
  if (LEVEL_ERRORS[key]) throw new TiledLevelError(key, LEVEL_ERRORS[key]);
  throw new Error(`There's no level called "${key}". Levels: ${levelKeys().join(', ')}`);
}
