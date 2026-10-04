import Phaser from 'phaser';
import type { MovementConfig } from '@/config/movement';
import { PlatformerMovement, neutralModifiers, type MovementOutput } from '@/movement/PlatformerMovement';
import type { Ability, CharacterIntent } from './abilities/Ability';
import { StatusEffects, resolveCapabilities } from '@/gameplay/effects/StatusEffects';
import type { Capability, ComboDefinition } from '@/config/powerUps';
import { EffectAura } from './effects/EffectAura';

/** How long she still counts as standing after losing contact (see onGround). */
const GROUND_GRACE_SECONDS = 0.06;

export interface CharacterOptions {
  /** Texture key (a placeholder for now, a sprite sheet later). */
  texture: string;
  movement: MovementConfig;
  /** Physics body size in px (can be smaller than the art for fairer collisions). */
  bodyWidth: number;
  bodyHeight: number;
}

/**
 * Base class for any playable (or later, AI-driven) platformer character.
 *
 * Characters never read input devices. Each frame the scene hands them a
 * CharacterIntent - from the player's InputManager for the active character,
 * or from an AI/follow behaviour for the others. That is what will let the
 * player switch between Melody and her human friend.
 */
export abstract class Character extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;
  readonly movement: PlatformerMovement;
  protected readonly abilities: Ability[] = [];
  /** Timed power-ups / status effects (SUPER_STRENGTH...). */
  readonly effects = new StatusEffects();
  facing: 1 | -1 = 1;
  /**
   * Hearts. Shown on the HUD; nothing takes them away yet - what hurts her
   * (and what happens at zero) is still to be designed.
   */
  readonly health = { current: 3, max: 3 };
  /**
   * Set by the world each frame to slow the character down (e.g. while
   * shoving a heavy crate). 1 = no effect. Reset after every move.
   */
  externalSpeedFactor = 1;
  private secondsSinceGrounded = Number.POSITIVE_INFINITY;
  private caps = new Set<Capability>();
  private combos: ComboDefinition[] = [];
  private readonly aura: EffectAura;

  constructor(scene: Phaser.Scene, x: number, y: number, options: CharacterOptions) {
    super(scene, x, y, options.texture);
    // Positioned by her feet, so growing/shrinking never pushes her into the floor.
    this.setOrigin(0.5, 1);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.movement = new PlatformerMovement(options.movement);

    const body = this.body;
    body.setSize(options.bodyWidth, options.bodyHeight);
    // Keep the body's feet aligned with the bottom of the art.
    body.setOffset((this.width - options.bodyWidth) / 2, this.height - options.bodyHeight);
    body.setCollideWorldBounds(true);
    // Terminal velocity is handled in PlatformerMovement; leave Arcade uncapped.
    body.setMaxVelocity(10000, 10000);

    this.aura = new EffectAura(scene, this, this.effects);
    this.once(Phaser.GameObjects.Events.DESTROY, () => this.abilities.forEach((a) => a.destroy?.()));
  }

  /** Touching the ground according to the physics engine this frame. */
  get physicallyOnGround(): boolean {
    return this.body.blocked.down || this.body.touching.down;
  }

  /**
   * Standing on something. Includes a tiny grace period: when standing on a
   * movable object (like the heavy crate) Arcade physics reports contact only
   * every other frame, which made her flicker between standing and falling.
   */
  get onGround(): boolean {
    if (this.physicallyOnGround) return true;
    return this.secondsSinceGrounded < GROUND_GRACE_SECONDS && this.body.velocity.y >= 0;
  }

  protected addAbility<T extends Ability>(ability: T): T {
    this.abilities.push(ability);
    return ability;
  }

  /** Can the character do this right now? (From effects, abilities and combos.) */
  can(capability: Capability): boolean {
    return this.caps.has(capability);
  }

  /** Combos currently active, e.g. SUPER CHARGE. */
  get activeCombos(): ComboDefinition[] {
    return this.combos;
  }

  /** Drive the character for one frame. */
  applyIntent(intent: CharacterIntent, dtSeconds: number): void {
    this.secondsSinceGrounded = this.physicallyOnGround ? 0 : this.secondsSinceGrounded + dtSeconds;
    this.effects.update(dtSeconds);

    // Effects and abilities adjust the movement modifiers fresh each frame.
    Object.assign(this.movement.modifiers, neutralModifiers());
    const fx = this.effects.movementMultipliers();
    this.movement.modifiers.maxSpeed *= fx.maxSpeed;
    this.movement.modifiers.acceleration *= fx.acceleration;
    this.movement.modifiers.maxSpeed *= this.externalSpeedFactor;
    this.externalSpeedFactor = 1;
    for (const ability of this.abilities) ability.update(this, intent, dtSeconds);

    const resolved = resolveCapabilities([
      ...this.effects.capabilities(),
      ...this.abilities.flatMap((a) => a.capabilities?.() ?? []),
    ]);
    this.caps = resolved.capabilities;
    this.combos = resolved.combos;

    const out = this.movement.step(
      { vx: this.body.velocity.x, vy: this.body.velocity.y, onGround: this.onGround },
      intent,
      dtSeconds,
    );

    this.body.setVelocity(out.vx, out.vy);
    this.body.setGravityY(out.gravityY);

    if (intent.moveX !== 0) this.facing = intent.moveX > 0 ? 1 : -1;
    this.setFlipX(this.facing < 0);

    if (out.jumped) this.onJump();
    if (out.landed) this.onLand();
    this.afterMove(out, dtSeconds);
    this.aura.update(dtSeconds, this.combos);
  }

  /** Put the character back at a position with no momentum. */
  respawn(x: number, y: number): void {
    this.body.reset(x, y);
    this.movement.reset();
    for (const ability of this.abilities) ability.reset();
  }

  /** Extra lines for the debug overlay. */
  debugLines(): string[] {
    const effects = this.effects.list().map((e) => `${e.type} ${e.remaining.toFixed(1)}s`);
    return [
      ...this.abilities.flatMap((a) => (a.debugText ? [a.debugText()] : [])),
      `effects ${effects.join(', ') || '-'}  can ${[...this.caps].join(',') || '-'}`,
    ];
  }

  /** Hooks for subclasses (sound, squash-and-stretch, dust particles...). */
  protected onJump(): void {}
  protected onLand(): void {}
  /** Runs after movement each frame - pick animations here. */
  protected afterMove(_out: MovementOutput, _dtSeconds: number): void {}
}
