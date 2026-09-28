import type { SprintConfig } from '@/config/abilities';

/**
 * Pure stamina bookkeeping for sprinting (no Phaser, so it's unit tested).
 * Stamina is 0..1. It drains while sprinting and refills after a short pause.
 * Running completely out makes the character "exhausted" until it has
 * partially recovered, which stops the sprint flickering on and off.
 */
export class SprintStamina {
  stamina = 1;
  exhausted = false;
  sprinting = false;
  private secondsSinceSprint = Number.POSITIVE_INFINITY;

  constructor(public config: SprintConfig) {}

  /** @param wantsToSprint sprint button held AND the character is trying to move. */
  update(wantsToSprint: boolean, dt: number): boolean {
    const cfg = this.config;
    this.sprinting = wantsToSprint && !this.exhausted && this.stamina > 0;

    if (this.sprinting) {
      this.secondsSinceSprint = 0;
      if (Number.isFinite(cfg.staminaSeconds)) {
        this.stamina = Math.max(0, this.stamina - dt / cfg.staminaSeconds);
        if (this.stamina === 0) this.exhausted = true;
      }
    } else {
      this.secondsSinceSprint += dt;
      if (this.secondsSinceSprint >= cfg.rechargeDelaySeconds) {
        this.stamina = Math.min(1, this.stamina + dt / cfg.rechargeSeconds);
      }
      if (this.exhausted && this.stamina >= cfg.exhaustedRecoverAt) this.exhausted = false;
    }
    return this.sprinting;
  }

  reset(): void {
    this.stamina = 1;
    this.exhausted = false;
    this.sprinting = false;
    this.secondsSinceSprint = Number.POSITIVE_INFINITY;
  }
}
