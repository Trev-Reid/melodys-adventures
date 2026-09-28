import { COMBOS, EFFECTS, type Capability, type ComboDefinition, type EffectDefinition, type EffectType } from '@/config/powerUps';

export interface ActiveEffect {
  type: EffectType;
  def: EffectDefinition;
  remaining: number;
  duration: number;
}

export interface EffectListener {
  onStart?(type: EffectType): void;
  onRefresh?(type: EffectType): void;
  onEnd?(type: EffectType): void;
}

/**
 * Timed status effects on one character. Engine-agnostic (unit tested).
 * Any number of effects can be active at once; they stack with each other
 * and with abilities rather than replacing one another.
 */
export class StatusEffects {
  private readonly active = new Map<EffectType, ActiveEffect>();
  private readonly listeners: EffectListener[] = [];

  constructor(private readonly defs: Record<EffectType, EffectDefinition> = EFFECTS) {}

  listen(listener: EffectListener): void {
    this.listeners.push(listener);
  }

  /** Start an effect, or top it back up if it's already running. */
  apply(type: EffectType, durationSeconds?: number): void {
    const def = this.defs[type];
    const duration = durationSeconds ?? def.durationSeconds;
    const existing = this.active.get(type);
    if (existing) {
      existing.remaining = Math.max(existing.remaining, duration);
      existing.duration = Math.max(existing.duration, duration);
      this.listeners.forEach((l) => l.onRefresh?.(type));
      return;
    }
    this.active.set(type, { type, def, remaining: duration, duration });
    this.listeners.forEach((l) => l.onStart?.(type));
  }

  remove(type: EffectType): void {
    if (this.active.delete(type)) this.listeners.forEach((l) => l.onEnd?.(type));
  }

  clear(): void {
    for (const type of [...this.active.keys()]) this.remove(type);
  }

  /** Count down timers; expired effects end. */
  update(dtSeconds: number): void {
    for (const effect of [...this.active.values()]) {
      effect.remaining -= dtSeconds;
      if (effect.remaining <= 0) this.remove(effect.type);
    }
  }

  has(type: EffectType): boolean {
    return this.active.has(type);
  }

  remaining(type: EffectType): number {
    return this.active.get(type)?.remaining ?? 0;
  }

  list(): ActiveEffect[] {
    return [...this.active.values()];
  }

  /** Capabilities granted by the active effects. */
  capabilities(): Capability[] {
    return this.list().flatMap((e) => e.def.grants);
  }

  /**
   * How the character should look: the most recently applied effect with a
   * skin wins; the biggest scale wins. `warning` is true when an effect with
   * an appearance is about to run out (so the look can flicker).
   */
  appearance(): { skin?: string; scale: number; warning: boolean } {
    let skin: string | undefined;
    let scale = 1;
    let warning = false;
    for (const e of this.active.values()) {
      const a = e.def.appearance;
      if (!a) continue;
      if (a.skin) skin = a.skin;
      scale = Math.max(scale, a.scale ?? 1);
      if (e.remaining <= e.def.warnAtSeconds) warning = true;
    }
    return { skin, scale, warning };
  }

  /** Combined movement multipliers from all active effects. */
  movementMultipliers(): { maxSpeed: number; acceleration: number } {
    let maxSpeed = 1;
    let acceleration = 1;
    for (const e of this.active.values()) {
      maxSpeed *= e.def.movement?.maxSpeed ?? 1;
      acceleration *= e.def.movement?.acceleration ?? 1;
    }
    return { maxSpeed, acceleration };
  }
}

/**
 * Merge capabilities from every source (effects, abilities...) and add any
 * combos they unlock. Returns the capability set and the active combo names.
 */
export function resolveCapabilities(
  sources: Capability[],
  combos: ComboDefinition[] = COMBOS,
): { capabilities: Set<Capability>; combos: ComboDefinition[] } {
  const capabilities = new Set<Capability>(sources);
  const active: ComboDefinition[] = [];
  for (const combo of combos) {
    if (combo.requires.every((c) => capabilities.has(c))) {
      combo.grants.forEach((c) => capabilities.add(c));
      active.push(combo);
    }
  }
  return { capabilities, combos: active };
}
