import type { SoundName } from '@/core/audio/Sfx';

/**
 * Power-ups and status effects - all data, no game logic.
 *
 * An effect is a timed state on a character (SUPER_STRENGTH for 15 seconds).
 * Effects grant *capabilities* (e.g. 'strength'). Game objects never ask
 * "did she eat a Super Sausage?" - they ask "can she do 'strength' right now?".
 * That keeps pick-ups, effects and the things they unlock independent, so new
 * power-ups (SUPER_SPEED, INVINCIBLE, MEGA_SNIFF...) are mostly new entries here.
 */

/** Things a character can be able to do. Abilities and effects both contribute. */
export type Capability =
  | 'strength'   // push heavy objects, break barriers  (SUPER_STRENGTH)
  | 'sprint'     // currently sprinting                 (sprint ability)
  | 'smash'      // plough through breakables without stopping (SUPER_CHARGE combo)
  | 'superSniff'; // perceive hidden scent trails and hidden objects (SUPER_SNIFF)

export type EffectType = 'SUPER_STRENGTH' | 'SUPER_SNIFF';
// Future: | 'SUPER_SPRINT' | 'INVINCIBLE' ...

export interface EffectDefinition {
  /** Shown on the HUD. */
  label: string;
  /** Seconds the effect lasts. Picking it up again resets the timer. */
  durationSeconds: number;
  /** Capabilities granted while active. */
  grants: Capability[];
  /** Optional movement multipliers while active (1 = unchanged). */
  movement?: { maxSpeed?: number; acceleration?: number };
  /** Colour used for the HUD bar and text. */
  color: number;
  /**
   * How the character looks while it's active. `skin` picks an alternative
   * sprite sheet (e.g. 'buff'); `scale` makes them bigger (1 = normal size).
   * The hitbox grows with the scale.
   */
  appearance?: { skin?: string; scale?: number };
  /** Optional sparkles around the character. */
  sparkle?: number;
  /** When it starts, the character pauses briefly and plays an animation (e.g. a big sniff). */
  onStart?: { pauseSeconds: number; anim?: string };
  /** Expanding ring(s) from the character when it starts. */
  ripple?: number;
  /** Sound when it starts (on top of the pick-up sound). */
  startSound?: SoundName;
  /** Subdue the world while active, so what the effect reveals stands out. */
  worldTint?: { color: number; alpha: number };
  /** The last few seconds flash as a warning. */
  warnAtSeconds: number;
}

export const EFFECTS: Record<EffectType, EffectDefinition> = {
  SUPER_STRENGTH: {
    label: 'SUPER STRENGTH',
    durationSeconds: 15,
    grants: ['strength'],
    color: 0xff5a36,
    appearance: { skin: 'buff', scale: 1.3 },
    sparkle: 0xffe066,
    warnAtSeconds: 3,
  },
  SUPER_SNIFF: {
    label: 'SUPER SNIFF',
    durationSeconds: 15,
    grants: ['superSniff'],
    color: 0xb98cff,
    warnAtSeconds: 3,
    onStart: { pauseSeconds: 0.9, anim: 'sniff' },
    startSound: 'sniff',
    ripple: 0xd6b8ff,
    worldTint: { color: 0x1a1240, alpha: 0.38 },
  },
};

/**
 * Combinations: when a character has all the `requires` capabilities at once,
 * they also get `grants`. Strength + sprint = SUPER CHARGE, smashing through
 * obstacles without slowing down.
 */
export interface ComboDefinition {
  name: string;
  requires: Capability[];
  grants: Capability[];
  color: number;
}

export const COMBOS: ComboDefinition[] = [
  { name: 'SUPER CHARGE', requires: ['strength', 'sprint'], grants: ['smash'], color: 0xffd23f },
];
