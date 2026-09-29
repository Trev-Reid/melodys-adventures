import Phaser from 'phaser';
import type { Character } from '@/characters/Character';
import type { Obstacle } from '@/entities/obstacles/Obstacle';
import { BONK } from '@/config/obstacles';
import { canPush, impactSpeed, resolveImpact } from './strengthRules';
import { sfx } from '@/core/audio/Sfx';

export interface ObstacleSystemHooks {
  /** Show a short speech/hint above the player. */
  say(text: string, color?: string): void;
  /** Called when something is smashed. */
  onSmash?(obstacle: Obstacle, superCharge: boolean): void;
  /** The player's current left/right input (-1..1), used to detect pushing. */
  moveX(): number;
}

/** Seconds of straining against something heavy before she says so. */
const STRAIN_SECONDS = 0.3;
/** Don't repeat the same hint more often than this. */
const HINT_COOLDOWN_MS = 1500;

/**
 * Wires up the player <-> obstacle interactions: pushing heavy things,
 * smashing breakable things, and saying so when she isn't strong enough.
 * Everything it decides comes from strengthRules + config/obstacles.ts.
 */
export class ObstacleSystem {
  private readonly pushables: Obstacle[];
  private readonly breakables: Obstacle[];
  /** Solid things she can't push or smash by running into them (e.g. bark blocks). */
  private readonly solidOnly: Obstacle[];
  private strainedThisFrame?: Obstacle;
  private strainSeconds = 0;
  private pushing?: Obstacle;
  private pendingBonk?: { dir: number };
  private lastHint = new Map<string, number>();

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly player: Character,
    obstacles: Obstacle[],
    solids: Phaser.GameObjects.GameObject[],
    private readonly hooks: ObstacleSystemHooks,
  ) {
    this.pushables = obstacles.filter((o) => o.isPushable);
    this.breakables = obstacles.filter((o) => o.isBreakable);
    this.solidOnly = obstacles.filter((o) => !o.isPushable && !o.isBreakable);
    const physics = scene.physics;

    // Heavy things rest on the level and on each other.
    physics.add.collider(this.pushables, solids);
    physics.add.collider(this.pushables, this.pushables);
    physics.add.collider(this.pushables, this.breakables);
    physics.add.collider(this.pushables, this.solidOnly);
    physics.add.collider(player, this.solidOnly, undefined, (_p, o) => this.processSolid(o as Obstacle), this);

    physics.add.collider(player, this.pushables, undefined, (_p, o) => this.processPush(o as Obstacle), this);
    physics.add.collider(
      player,
      this.breakables,
      () => this.afterBreakableCollision(),
      (_p, o) => this.processBreakable(o as Obstacle),
      this,
    );
  }

  /** Call once per frame, before the player moves. */
  update(dt: number): void {
    // Shove crates that are being pushed; heavy things stop dead otherwise.
    for (const crate of this.pushables) {
      const body = crate.body as Phaser.Physics.Arcade.Body;
      if (crate.pushTimer > 0) {
        crate.pushTimer -= dt;
        body.setVelocityX(crate.pushDir * crate.spec.pushable!.pushForce);
      } else {
        body.setVelocityX(0);
      }
    }

    // Pushing slows her down to the crate's speed - it should feel heavy.
    const pushing = this.pushables.find((c) => c.pushTimer > 0);
    this.player.externalSpeedFactor = pushing
      ? Math.min(1, pushing.spec.pushable!.pushForce / this.player.movement.config.maxSpeed)
      : 1;
    if (pushing && pushing !== this.pushing) sfx.play('strain');
    this.pushing = pushing;

    // Straining against something too heavy.
    if (this.strainedThisFrame) {
      this.strainSeconds += dt;
      if (this.strainSeconds >= STRAIN_SECONDS) {
        this.hint(this.strainedThisFrame.spec.tooWeakText, 'tooWeak');
        this.strainSeconds = 0;
      }
    } else {
      this.strainSeconds = 0;
    }
    this.strainedThisFrame = undefined;
  }

  // --- Pushing -----------------------------------------------------------------

  private processPush(crate: Obstacle): boolean {
    const p = this.player.body;
    const c = crate.body as Phaser.Physics.Arcade.Body;
    const standingOnTop = p.bottom <= c.top + 6;
    if (standingOnTop) return true;

    const dir = Math.sign(crate.x - this.player.x) || 1;
    const pressingInto = this.hooks.moveX() * dir > 0;
    if (!pressingInto) return true;

    if (canPush((cap) => this.player.can(cap), crate.spec)) {
      crate.pushDir = dir;
      crate.pushTimer = 0.12;
    } else {
      this.strainedThisFrame = crate;
    }
    return true;
  }

  // --- Solid blocks -----------------------------------------------------------

  /** Pressing into a bark block: remind her how to get through. */
  private processSolid(block: Obstacle): boolean {
    if (block.broken) return false;
    const dir = Math.sign(block.x - this.player.x) || 1;
    const beside = this.player.body.bottom > (block.body as Phaser.Physics.Arcade.StaticBody).top + 6;
    if (beside && this.hooks.moveX() * dir > 0) this.strainedThisFrame = block;
    return true;
  }

  // --- Breaking ----------------------------------------------------------------

  private processBreakable(obstacle: Obstacle): boolean {
    if (obstacle.broken) return false;
    const now = this.scene.time.now;
    if (now - obstacle.lastHitAt < BONK.cooldownSeconds * 1000) return true;

    const p = this.player.body;
    const o = obstacle.body as Phaser.Physics.Arcade.StaticBody;
    const speed = impactSpeed(
      { vx: p.velocity.x, vy: p.velocity.y, left: p.left, right: p.right, bottom: p.bottom },
      { left: o.left, right: o.right, top: o.top },
    );
    if (speed === 0) return true; // just leaning on it

    const dir = Math.sign(obstacle.x - this.player.x) || 1;
    const result = resolveImpact((cap) => this.player.can(cap), obstacle.spec, speed);

    switch (result) {
      case 'smash':
        this.smash(obstacle, dir, true);
        return false; // plough straight through, keep the speed

      case 'hit': {
        obstacle.lastHitAt = now;
        obstacle.hits += 1;
        if (obstacle.hits >= obstacle.spec.breakable!.hitsToBreak) {
          this.smash(obstacle, dir, false);
          p.velocity.x *= 0.6; // bursting through costs a little speed
          return false;
        }
        obstacle.crack();
        sfx.play('bonk');
        this.scene.cameras.main.shake(90, 0.004);
        this.hooks.say('BONK!', '#ffe066');
        this.pendingBonk = { dir };
        return true;
      }

      case 'needsRunUp':
        this.hint('Take a run-up!', 'runup');
        return true;

      case 'tooWeak':
        this.hint(obstacle.spec.tooWeakText, 'tooWeak');
        return true;
    }
  }

  private afterBreakableCollision(): void {
    if (!this.pendingBonk) return;
    const { dir } = this.pendingBonk;
    this.pendingBonk = undefined;
    this.player.body.setVelocity(-dir * BONK.knockbackX, -BONK.knockbackY);
  }

  private smash(obstacle: Obstacle, dir: number, superCharge: boolean): void {
    obstacle.smash(dir);
    sfx.play('smash');
    this.scene.cameras.main.shake(superCharge ? 140 : 180, superCharge ? 0.006 : 0.01);
    this.hooks.say(superCharge ? 'SMASH!' : 'CRASH!', superCharge ? '#ffd23f' : '#ff7b54');
    this.hooks.onSmash?.(obstacle, superCharge);
  }

  private hint(text: string, key: string): void {
    const now = this.scene.time.now;
    if (now - (this.lastHint.get(key) ?? -Infinity) < HINT_COOLDOWN_MS) return;
    this.lastHint.set(key, now);
    sfx.play('strain');
    this.hooks.say(text);
  }
}
