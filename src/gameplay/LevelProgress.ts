/**
 * Tracks how the player is doing in the current level: items collected,
 * time taken, and whether the level is complete. Engine-agnostic, so it's
 * unit tested and could later be saved to a save file.
 */
export class LevelProgress {
  collected = 0;
  elapsedMs = 0;
  private completed = false;

  constructor(readonly total: number) {}

  get complete(): boolean {
    return this.completed;
  }

  /** Advance the level timer (stops once the level is complete). */
  tick(deltaMs: number): void {
    if (!this.completed) this.elapsedMs += deltaMs;
  }

  /** Record one goal item. Returns true on the pick-up that completes the level. */
  collect(): boolean {
    if (this.completed) return false;
    this.collected = Math.min(this.total, this.collected + 1);
    if (this.total > 0 && this.collected === this.total) {
      this.completed = true;
      return true;
    }
    return false;
  }
}

/** 83450 -> "1:23.4" */
export function formatTime(ms: number): string {
  const totalTenths = Math.floor(ms / 100);
  const minutes = Math.floor(totalTenths / 600);
  const seconds = Math.floor((totalTenths % 600) / 10);
  const tenths = totalTenths % 10;
  return `${minutes}:${seconds.toString().padStart(2, '0')}.${tenths}`;
}
