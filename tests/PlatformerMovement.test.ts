import { describe, expect, it } from 'vitest';
import { MELODY_MOVEMENT } from '../src/config/movement';
import { NO_INTENT, PlatformerMovement, stepHorizontal } from '../src/movement/PlatformerMovement';

const cfg = MELODY_MOVEMENT;
const DT = 1 / 60;

describe('stepHorizontal', () => {
  it('accelerates towards max speed and never exceeds it', () => {
    let vx = 0;
    for (let i = 0; i < 120; i++) vx = stepHorizontal(vx, 1, true, cfg, DT);
    expect(vx).toBe(cfg.maxSpeed);
  });

  it('brakes to a stop when no direction is held', () => {
    let vx = cfg.maxSpeed;
    for (let i = 0; i < 120; i++) vx = stepHorizontal(vx, 0, true, cfg, DT);
    expect(vx).toBe(0);
  });

  it('has less control in the air', () => {
    const ground = stepHorizontal(0, 1, true, cfg, DT);
    const air = stepHorizontal(0, 1, false, cfg, DT);
    expect(air).toBeCloseTo(ground * cfg.airControl);
  });

  it('turns around faster than it accelerates', () => {
    const turn = cfg.maxSpeed - stepHorizontal(cfg.maxSpeed, -1, true, cfg, DT);
    const accel = stepHorizontal(0, 1, true, cfg, DT);
    expect(turn).toBeGreaterThan(accel);
  });
});

describe('PlatformerMovement jumping', () => {
  const grounded = { vx: 0, vy: 0, onGround: true };
  const airborne = { vx: 0, vy: 50, onGround: false };

  it('jumps when on the ground', () => {
    const m = new PlatformerMovement(cfg);
    const out = m.step(grounded, { ...NO_INTENT, jumpPressed: true, jumpHeld: true }, DT);
    expect(out.jumped).toBe(true);
    expect(out.vy).toBe(-cfg.jumpVelocity);
  });

  it('allows a jump shortly after leaving a ledge (coyote time)', () => {
    const m = new PlatformerMovement(cfg);
    m.step(grounded, NO_INTENT, DT);
    m.step(airborne, NO_INTENT, DT);
    const out = m.step(airborne, { ...NO_INTENT, jumpPressed: true, jumpHeld: true }, DT);
    expect(out.jumped).toBe(true);
  });

  it('does not allow a jump long after leaving a ledge', () => {
    const m = new PlatformerMovement(cfg);
    m.step(grounded, NO_INTENT, DT);
    for (let i = 0; i < 30; i++) m.step(airborne, NO_INTENT, DT);
    const out = m.step(airborne, { ...NO_INTENT, jumpPressed: true, jumpHeld: true }, DT);
    expect(out.jumped).toBe(false);
  });

  it('remembers a jump pressed just before landing (jump buffer)', () => {
    const m = new PlatformerMovement(cfg);
    for (let i = 0; i < 30; i++) m.step(airborne, NO_INTENT, DT);
    m.step(airborne, { ...NO_INTENT, jumpPressed: true, jumpHeld: true }, DT);
    const out = m.step(grounded, { ...NO_INTENT, jumpHeld: true }, DT);
    expect(out.jumped).toBe(true);
  });

  it('cannot double jump', () => {
    const m = new PlatformerMovement(cfg);
    m.step(grounded, { ...NO_INTENT, jumpPressed: true, jumpHeld: true }, DT);
    const out = m.step({ vx: 0, vy: -500, onGround: false }, { ...NO_INTENT, jumpPressed: true, jumpHeld: true }, DT);
    expect(out.jumped).toBe(false);
  });

  it('cuts the jump short when jump is released while rising', () => {
    const m = new PlatformerMovement(cfg);
    m.step(grounded, { ...NO_INTENT, jumpPressed: true, jumpHeld: true }, DT);
    const out = m.step({ vx: 0, vy: -500, onGround: false }, NO_INTENT, DT);
    expect(out.vy).toBeCloseTo(-500 * cfg.jumpCutMultiplier);
  });

  it('falls with stronger gravity and caps fall speed', () => {
    const m = new PlatformerMovement(cfg);
    const out = m.step({ vx: 0, vy: 5000, onGround: false }, NO_INTENT, DT);
    expect(out.gravityY).toBe(cfg.gravity * cfg.fallGravityMultiplier);
    expect(out.vy).toBe(cfg.maxFallSpeed);
  });
});
