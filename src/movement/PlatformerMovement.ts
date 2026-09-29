import type { MovementConfig } from '@/config/movement';

/** What the character wants to do this frame (from the player, or later from AI). */
export interface MovementIntent {
  /** -1..1 horizontal intent. */
  moveX: number;
  /** Jump was pressed this frame. */
  jumpPressed: boolean;
  /** Jump is currently held (for variable jump height). */
  jumpHeld: boolean;
}

/** The physical state the movement logic needs to know about. */
export interface MovementBodyState {
  vx: number;
  vy: number;
  onGround: boolean;
}

/** What the physics body should do next. */
export interface MovementOutput {
  vx: number;
  vy: number;
  /** Gravity to apply to the body this frame (px/s²). */
  gravityY: number;
  /** True on the frame a jump started (hook for sounds/animations later). */
  jumped: boolean;
  /** True on the frame the character touched down. */
  landed: boolean;
}

export const NO_INTENT: MovementIntent = { moveX: 0, jumpPressed: false, jumpHeld: false };

/**
 * Temporary multipliers on the base config, set each frame by abilities and
 * effects (sprinting now; sausage power-ups, being scared, etc. later).
 */
export interface MovementModifiers {
  maxSpeed: number;
  acceleration: number;
}

export function neutralModifiers(): MovementModifiers {
  return { maxSpeed: 1, acceleration: 1 };
}

/**
 * Engine-agnostic platformer movement.
 *
 * Holds the small amount of state good-feeling jumps need (coyote time, jump
 * buffering) and turns an intent + current body state into new velocities.
 * All tuning comes from a MovementConfig, so different characters (Melody,
 * her human friend) or temporary effects (sprinting, sausage power-ups) just
 * swap or modify the config.
 */
export class PlatformerMovement {
  config: MovementConfig;
  /** Reset to neutral by the owner each frame, then adjusted by abilities. */
  readonly modifiers: MovementModifiers = neutralModifiers();

  private timeSinceGroundedMs = Number.POSITIVE_INFINITY;
  private jumpBufferRemainingMs = 0;
  private isJumping = false;
  private wasOnGround = false;

  constructor(config: MovementConfig) {
    this.config = config;
  }

  step(body: MovementBodyState, intent: MovementIntent, dtSeconds: number): MovementOutput {
    const cfg = this.config;
    const dtMs = dtSeconds * 1000;

    // --- Ground tracking & coyote time ---------------------------------------
    const landed = body.onGround && !this.wasOnGround;
    this.wasOnGround = body.onGround;
    if (body.onGround) {
      this.timeSinceGroundedMs = 0;
      if (body.vy >= 0) this.isJumping = false;
    } else {
      this.timeSinceGroundedMs += dtMs;
    }

    // --- Jump buffering --------------------------------------------------------
    if (intent.jumpPressed) this.jumpBufferRemainingMs = cfg.jumpBufferMs;
    else this.jumpBufferRemainingMs = Math.max(0, this.jumpBufferRemainingMs - dtMs);

    let vy = body.vy;
    let jumped = false;
    const canJump = !this.isJumping && this.timeSinceGroundedMs <= cfg.coyoteTimeMs;
    if (this.jumpBufferRemainingMs > 0 && canJump) {
      vy = -cfg.jumpVelocity;
      jumped = true;
      this.isJumping = true;
      this.jumpBufferRemainingMs = 0;
      this.timeSinceGroundedMs = Number.POSITIVE_INFINITY; // consume coyote time
    }

    // --- Variable jump height --------------------------------------------------
    if (!jumped && this.isJumping && !intent.jumpHeld && vy < 0) {
      vy *= cfg.jumpCutMultiplier;
      this.isJumping = false; // only cut once
    }

    // --- Gravity & terminal velocity -----------------------------------------
    const falling = vy > 0;
    const gravityY = cfg.gravity * (falling ? cfg.fallGravityMultiplier : 1);
    vy = Math.min(vy, cfg.maxFallSpeed);

    // --- Horizontal ------------------------------------------------------------
    const m = this.modifiers;
    const horizontalCfg =
      m.maxSpeed === 1 && m.acceleration === 1
        ? cfg
        : {
            ...cfg,
            maxSpeed: cfg.maxSpeed * m.maxSpeed,
            acceleration: cfg.acceleration * m.acceleration,
            turnAcceleration: cfg.turnAcceleration * m.acceleration,
          };
    const vx = stepHorizontal(body.vx, intent.moveX, body.onGround, horizontalCfg, dtSeconds);

    return { vx, vy, gravityY, jumped, landed };
  }

  /**
   * Something else launched her (e.g. BARK BOOST): stop treating this as a
   * held jump, so letting go of jump doesn't cut the launch short.
   */
  endJump(): void {
    this.isJumping = false;
  }

  /** Forget timers, e.g. after respawning. */
  reset(): void {
    Object.assign(this.modifiers, neutralModifiers());
    this.timeSinceGroundedMs = Number.POSITIVE_INFINITY;
    this.jumpBufferRemainingMs = 0;
    this.isJumping = false;
    this.wasOnGround = false;
  }
}

/** Pure horizontal velocity update. Exported for unit tests. */
export function stepHorizontal(
  vx: number,
  moveX: number,
  onGround: boolean,
  cfg: MovementConfig,
  dt: number,
): number {
  const control = onGround ? 1 : cfg.airControl;
  const target = moveX * cfg.maxSpeed;

  let rate: number;
  if (moveX === 0) {
    rate = onGround ? cfg.deceleration : cfg.airDeceleration;
  } else if (vx !== 0 && Math.sign(moveX) !== Math.sign(vx)) {
    rate = cfg.turnAcceleration * control;
  } else if (Math.abs(vx) > Math.abs(target)) {
    // Moving faster than the stick asks for (e.g. half-tilted gamepad): ease down.
    rate = (onGround ? cfg.deceleration : cfg.airDeceleration);
  } else {
    rate = cfg.acceleration * control;
  }

  return approach(vx, target, rate * dt);
}

/** Move `value` towards `target` by at most `maxDelta`. */
export function approach(value: number, target: number, maxDelta: number): number {
  if (value < target) return Math.min(value + maxDelta, target);
  if (value > target) return Math.max(value - maxDelta, target);
  return value;
}
