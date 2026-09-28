/**
 * Tuning for character abilities. Like movement.ts, these are just numbers:
 * change them, save, and the game reloads.
 */

export interface SprintConfig {
  /** Top speed multiplier while sprinting (1.6 = 60% faster). */
  speedMultiplier: number;
  /** Acceleration multiplier while sprinting, so she gets up to speed quickly. */
  accelerationMultiplier: number;
  /** How many seconds of continuous sprinting a full stamina bar gives. Use Infinity for unlimited. */
  staminaSeconds: number;
  /** Seconds to refill an empty stamina bar. */
  rechargeSeconds: number;
  /** Pause after sprinting stops before stamina starts refilling. */
  rechargeDelaySeconds: number;
  /** After running out, stamina must refill to this fraction (0..1) before she can sprint again. */
  exhaustedRecoverAt: number;
  /** Show the ghost trail behind her while sprinting. */
  showTrail: boolean;
}

/** Melody's speed burst - she's incredibly fast. */
export const MELODY_SPRINT: SprintConfig = {
  speedMultiplier: 1.6,
  accelerationMultiplier: 1.5,
  staminaSeconds: 2.5,
  rechargeSeconds: 2.5,
  rechargeDelaySeconds: 0.4,
  exhaustedRecoverAt: 0.35,
  showTrail: true,
};

/** Melody's sleepy side: leave her alone and she settles down for a nap. */
export interface RestConfig {
  /** Seconds standing still before she sits down. */
  sitAfterSeconds: number;
  /** Seconds standing still before she lies down and falls asleep. */
  sleepAfterSeconds: number;
  /** How long waking up takes (she can't move until she's stretched). */
  wakeUpSeconds: number;
}

export const MELODY_REST: RestConfig = {
  sitAfterSeconds: 5,
  sleepAfterSeconds: 12,
  wakeUpSeconds: 0.5,
};
