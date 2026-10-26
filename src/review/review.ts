import type Phaser from 'phaser';
import SHOTS from './shots.json';

/**
 * Screenshot review: the same screen, rendered the same way every time, so
 * the art can be compared with the concept art and with last time's look.
 *
 *   http://localhost:5173/?review=garden-house
 *
 * opens that shot (src/review/shots.json): everyone placed where the shot
 * says, the camera held still, the debug overlay off, sounds off, and the
 * game run for a fixed number of frames with the same "random" numbers and
 * the same clock every time. tools/review/capture.ts photographs every shot
 * this way. Nothing here runs in normal play.
 *
 * In `npm run dev`, F9 saves a photo of what's on screen and copies a shot
 * description for shots.json, so any moment can become a review shot.
 */

export interface ShotCharacter {
  x: number;
  /** Where their feet are. */
  y: number;
  facing?: 1 | -1;
}

export interface ReviewShot {
  name: string;
  level: string;
  note?: string;
  /** Top-left corner of the view, in level pixels. */
  camera: { x: number; y: number };
  melody?: ShotCharacter;
  boy?: ShotCharacter;
  /** Who the player is controlling (default Melody). */
  active?: 'melody' | 'boy';
  /** Show the HUD (default true). */
  hud?: boolean;
  /** Frames to run before the picture is taken (60 = one second). */
  frames?: number;
}

export const REVIEW_SHOTS: ReviewShot[] = SHOTS.shots as ReviewShot[];
export const REVIEW_FRAME_MS = 1000 / 60;
/** Emitted on game.events by LevelScene once a shot is set up. */
export const REVIEW_STAGED = 'review-staged';

/** What the capture tool talks to (window.__review). */
export interface ReviewDriver {
  shot: string;
  /** The shot is set up and has run its frames: ready to photograph. */
  ready: boolean;
  error?: string;
  /** Run more frames (60 = one second of game time). */
  advance(frames: number): void;
  /** The current frame as a PNG data URL, at the game's own size (960x540). */
  capture(): Promise<string>;
}

declare global {
  interface Window {
    __review?: ReviewDriver;
  }
}

let active: ReviewShot | undefined;

/** The shot asked for in the address (?review=<name>), if any. */
export function requestedShot(search = window.location.search): ReviewShot | undefined {
  const name = new URLSearchParams(search).get('review');
  if (!name) return undefined;
  const shot = REVIEW_SHOTS.find((s) => s.name === name);
  if (!shot) throw new Error(`There's no review shot called "${name}". Shots: ${REVIEW_SHOTS.map((s) => s.name).join(', ')} (src/review/shots.json)`);
  return shot;
}

/** The shot being reviewed right now (set by startReview), for LevelScene. */
export const activeShot = (): ReviewShot | undefined => active;

/** A tiny repeatable random number generator. */
export function seededRandom(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Take over the game's clock for a review shot. Called by BootScene just
 * before it starts the level: from here on the game only moves when we step
 * it, one fixed 1/60 s frame at a time, with repeatable random numbers - and
 * Date.now() too, because Phaser's tweens run on it.
 */
export function startReview(game: Phaser.Game, shot: ReviewShot): void {
  active = shot;
  Math.random = seededRandom(shot.name);
  let now = 1_000_000;
  Date.now = () => now;
  game.loop.sleep();
  const step = () => {
    now += REVIEW_FRAME_MS;
    game.step(now, REVIEW_FRAME_MS);
  };
  let staged = false;
  game.events.once(REVIEW_STAGED, () => (staged = true));
  const driver: ReviewDriver = {
    shot: shot.name,
    ready: false,
    advance(frames: number) {
      for (let i = 0; i < frames; i++) step();
    },
    capture() {
      return new Promise((resolve) => {
        game.renderer.snapshot((image) => resolve((image as HTMLImageElement).src));
        step();
      });
    },
  };
  window.__review = driver;
  // Step until the level has set the shot up, then run its frames.
  let tries = 0;
  const pump = () => {
    try {
      if (!staged) {
        if (++tries > 600) throw new Error(`the level didn't start (shot "${shot.name}")`);
        step();
        setTimeout(pump, 0);
        return;
      }
      driver.advance(shot.frames ?? 90);
      driver.ready = true;
    } catch (e) {
      driver.error = (e as Error).message;
      console.error(e);
    }
  };
  setTimeout(pump, 0);
}

/** What a shot needs to know about the current moment (for F9). */
export interface ShotMoment {
  level: string;
  camera: { x: number; y: number };
  melody: ShotCharacter;
  boy: ShotCharacter;
  active: 'melody' | 'boy';
}

/**
 * F9 (in `npm run dev`): save a photo of the screen, and copy a shot for
 * shots.json that recreates this moment.
 */
export function enablePhotoKey(scene: Phaser.Scene, moment: () => ShotMoment): void {
  scene.input.keyboard?.on('keydown-F9', () => {
    const m = moment();
    const name = `${m.level}-${m.camera.x}-${m.camera.y}`;
    const shot: ReviewShot = { name, level: m.level, note: 'Describe what this shot is for', camera: m.camera, melody: m.melody, boy: m.boy, frames: 90 };
    if (m.active === 'boy') shot.active = 'boy';
    scene.game.renderer.snapshot((image) => {
      const a = document.createElement('a');
      a.href = (image as HTMLImageElement).src;
      a.download = `${name}.png`;
      a.click();
    });
    const text = JSON.stringify(shot, null, 2);
    navigator.clipboard?.writeText(`${text},`).catch(() => undefined);
    console.info(`Photo saved as ${name}.png. To make it a review shot, paste this into src/review/shots.json:\n${text}`);
  });
}
