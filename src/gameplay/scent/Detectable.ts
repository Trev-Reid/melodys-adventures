import type { DetectableSpec } from '@/levels/LevelDefinition';

/**
 * Anything that starts hidden and can be found by Melody's nose:
 * collectibles, points of interest - later bones, buried items, switches,
 * secret entrances...
 */
export interface Detectable {
  readonly x: number;
  readonly y: number;
  readonly hiddenSpec?: DetectableSpec;
  readonly revealed: boolean;
  reveal(): void;
}
