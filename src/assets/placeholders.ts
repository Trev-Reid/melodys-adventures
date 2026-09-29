import type Phaser from 'phaser';
import { TEXTURES } from './keys';
import type { ObstacleKind, ObstacleType } from '@/config/obstacles';

/**
 * Generates simple placeholder textures at runtime so the game needs no image
 * files yet. When real artwork arrives, load it in BootScene under the same
 * keys (see assets/keys.ts) and delete the matching function here - nothing
 * else in the game has to change.
 */
export function createPlaceholderTextures(scene: Phaser.Scene): void {
  groundTile(scene);
  grassTop(scene);
  platformTile(scene);
  sausage(scene);
  superSausage(scene);
  sniffTreat(scene);
  squirrelToy(scene);
  scentIcons(scene);
  pawPrints(scene);
  barkBiscuit(scene);
  ball(scene);
  cat(scene);
  leaf(scene);
  glow(scene);
  debris(scene);
  confetti(scene);
  hill(scene);
  cloud(scene);
}

function groundTile(scene: Phaser.Scene): void {
  const g = scene.make.graphics({}, false);
  g.fillStyle(0x7a4e2d).fillRect(0, 0, 32, 32);
  g.fillStyle(0x6a4225).fillRect(4, 16, 6, 4).fillRect(20, 24, 7, 4);
  g.generateTexture(TEXTURES.groundTile, 32, 32);
  g.destroy();
}

function grassTop(scene: Phaser.Scene): void {
  const g = scene.make.graphics({}, false);
  g.fillStyle(0x4caf50).fillRect(0, 0, 32, 9);
  g.fillStyle(0x3d9142).fillRect(0, 7, 32, 3);
  g.fillStyle(0x66bb6a).fillRect(3, 0, 3, 2).fillRect(17, 0, 4, 2);
  g.generateTexture(TEXTURES.grassTop, 32, 10);
  g.destroy();
}

function platformTile(scene: Phaser.Scene): void {
  const g = scene.make.graphics({}, false);
  g.fillStyle(0xc28e56).fillRect(0, 0, 32, 32);
  g.fillStyle(0xa87542).fillRect(0, 0, 1, 32).fillRect(0, 11, 32, 1).fillRect(0, 22, 32, 1);
  g.fillStyle(0xdcae78).fillRect(0, 0, 32, 3);
  g.generateTexture(TEXTURES.platformTile, 32, 32);
  g.destroy();
}

function sausage(scene: Phaser.Scene): void {
  // 30x16: a plump sausage with little tied ends.
  const g = scene.make.graphics({}, false);
  g.fillStyle(0x7a2e1f).fillCircle(3, 8, 2.5).fillCircle(27, 8, 2.5); // tied ends
  g.fillStyle(0xb5462f).fillRoundedRect(3, 1, 24, 14, 7);
  g.fillStyle(0xd9674b).fillRoundedRect(6, 3, 17, 4, 2); // shine
  g.fillStyle(0x8f3522).fillRect(9, 11, 3, 1.5).fillRect(16, 11, 3, 1.5); // grill marks
  g.generateTexture(TEXTURES.sausage, 30, 16);
  g.destroy();
}

function confetti(scene: Phaser.Scene): void {
  const g = scene.make.graphics({}, false);
  g.fillStyle(0xffffff).fillRect(0, 0, 8, 5);
  g.generateTexture(TEXTURES.confetti, 8, 5);
  g.destroy();
}

function hill(scene: Phaser.Scene): void {
  const g = scene.make.graphics({}, false);
  g.fillStyle(0x9ccc65).fillEllipse(200, 200, 400, 300);
  g.generateTexture(TEXTURES.hill, 400, 200);
  g.destroy();
}

function cloud(scene: Phaser.Scene): void {
  const g = scene.make.graphics({}, false);
  g.fillStyle(0xffffff, 0.9).fillCircle(30, 30, 20).fillCircle(55, 22, 24).fillCircle(80, 32, 18).fillRect(30, 30, 50, 20);
  g.generateTexture(TEXTURES.cloud, 110, 56);
  g.destroy();
}

function superSausage(scene: Phaser.Scene): void {
  // Bigger, golden, with sparkles: unmistakably special.
  const g = scene.make.graphics({}, false);
  g.fillStyle(0x8a3b12).fillCircle(4, 11, 3.5).fillCircle(38, 11, 3.5);
  g.fillStyle(0xe8512a).fillRoundedRect(4, 2, 34, 18, 9);
  g.fillStyle(0xffb347).fillRoundedRect(8, 4, 24, 6, 3);
  g.fillStyle(0xfff3b0).fillRect(11, 5, 6, 2);
  g.fillStyle(0xb8341a).fillRect(12, 14, 4, 2).fillRect(20, 14, 4, 2).fillRect(28, 14, 4, 2);
  g.generateTexture(TEXTURES.superSausage, 42, 22);
  g.destroy();
}

function glow(scene: Phaser.Scene): void {
  // Soft round glow made of stacked translucent circles (tinted when used).
  const g = scene.make.graphics({}, false);
  for (let r = 32; r > 4; r -= 4) g.fillStyle(0xffffff, 0.09).fillCircle(32, 32, r);
  g.generateTexture(TEXTURES.glow, 64, 64);
  g.destroy();
}

function debris(scene: Phaser.Scene): void {
  const g = scene.make.graphics({}, false);
  g.fillStyle(0xffffff).fillRect(0, 0, 6, 4);
  g.generateTexture(TEXTURES.debris, 6, 4);
  g.destroy();
}

/** Draws (once) and returns the texture key for an obstacle type at its size. */
export function ensureObstacleTexture(scene: Phaser.Scene, kind: ObstacleKind, type: ObstacleType): string {
  const key = `obstacle-${kind}`;
  if (scene.textures.exists(key)) return key;
  const { width: w, height: h } = type;
  const g = scene.make.graphics({}, false);

  if (type.look === 'crate') {
    // Heavy iron-bound crate.
    g.fillStyle(0x5a3a1c).fillRect(0, 0, w, h);
    g.fillStyle(0xa8743e).fillRect(6, 6, w - 12, h - 12);
    g.fillStyle(0x94622f);
    for (let y = 6; y < h - 6; y += 16) g.fillRect(6, y, w - 12, 2);
    g.lineStyle(10, 0x6b4520).lineBetween(10, 10, w - 10, h - 10).lineBetween(w - 10, 10, 10, h - 10);
    g.fillStyle(0x4a4f57).fillRect(0, 0, w, 7).fillRect(0, h - 7, w, 7).fillRect(0, 0, 7, h).fillRect(w - 7, 0, 7, h);
    g.fillStyle(0x9aa3ad);
    for (const [x, y] of [[3, 3], [w - 5, 3], [3, h - 5], [w - 5, h - 5], [w / 2 - 1, 3], [w / 2 - 1, h - 5]]) g.fillRect(x, y, 3, 3);
    // "HEAVY" weight icon.
    g.fillStyle(0x2d2d33).fillRoundedRect(w / 2 - 16, h / 2 - 10, 32, 24, 5).fillRect(w / 2 - 6, h / 2 - 16, 12, 8);
    g.fillStyle(0xa8743e).fillRect(w / 2 - 3, h / 2 - 13, 6, 4);
  } else if (type.look === 'planks') {
    // Nailed-together wooden barrier.
    const plank = 11;
    for (let x = 0, i = 0; x < w; x += plank, i++) {
      g.fillStyle(i % 2 ? 0xc48a4c : 0xb57b3f).fillRect(x, 0, plank, h);
      g.fillStyle(0x7c4f24).fillRect(x, 0, 1, h);
    }
    g.fillStyle(0x8f5c2c).fillRect(0, 26, w, 10).fillRect(0, h - 40, w, 10);
    g.fillStyle(0x3c3c40);
    for (const y of [30, h - 36]) for (let x = 4; x < w; x += 11) g.fillRect(x, y, 2, 2);
    g.lineStyle(2, 0x5a3a1c).strokeRect(1, 1, w - 2, h - 2);
  } else if (type.look === 'cracked' || type.look === 'stone') {
    // Brick-ish blocks: sandy and cracked (any bark), or solid grey stone (SUPER BARK).
    const cracked = type.look === 'cracked';
    g.fillStyle(cracked ? 0x8a6238 : 0x55585e).fillRect(0, 0, w, h);
    g.fillStyle(cracked ? 0xd2a46a : 0x9aa0a8).fillRect(3, 3, w - 6, h - 6);
    g.fillStyle(cracked ? 0xe6c18c : 0xb9bec5).fillRect(3, 3, w - 6, 5).fillRect(3, 3, 5, h - 6);
    g.fillStyle(cracked ? 0xb07f47 : 0x7c828a).fillRect(3, h - 8, w - 6, 5).fillRect(w - 8, 3, 5, h - 6);
    if (cracked) {
      g.lineStyle(2, 0x5a3a1c, 1);
      g.beginPath().moveTo(w * 0.3, 3).lineTo(w * 0.45, h * 0.35).lineTo(w * 0.32, h * 0.55).lineTo(w * 0.5, h - 4).strokePath();
      g.beginPath().moveTo(w * 0.45, h * 0.35).lineTo(w * 0.75, h * 0.45).lineTo(w - 4, h * 0.3).strokePath();
    } else {
      // Rivet-like studs so it reads as "heavy stone".
      g.fillStyle(0x5d6269);
      for (const [x, y] of [[10, 10], [w - 13, 10], [10, h - 13], [w - 13, h - 13]]) g.fillRect(x, y, 3, 3);
      g.lineStyle(2, 0x6b7078).strokeRect(12, 12, w - 24, h - 24);
    }
  } else {
    // White garden fence post.
    g.fillStyle(0xf1ead8).fillRect(0, 8, w, h - 8);
    g.fillTriangle(0, 8, w / 2, 0, w, 8);
    g.fillStyle(0xcfc4a8).fillRect(w - 5, 8, 5, h - 8);
    g.fillStyle(0x9e9480).fillRect(0, 34, w, 4).fillRect(0, h - 38, w, 4);
    g.lineStyle(2, 0x6b624f).strokeRect(1, 8, w - 2, h - 9);
  }
  g.generateTexture(key, w, h);
  g.destroy();
  return key;
}

function sniffTreat(scene: Phaser.Scene): void {
  // A bone-shaped biscuit with a purple "smell" swirl.
  const g = scene.make.graphics({}, false);
  g.fillStyle(0x6b3fa0).fillCircle(6, 7, 5).fillCircle(6, 15, 5).fillCircle(30, 7, 5).fillCircle(30, 15, 5);
  g.fillStyle(0x6b3fa0).fillRect(6, 5, 24, 12);
  g.fillStyle(0xe8c9ff).fillCircle(6, 7, 3.5).fillCircle(6, 15, 3.5).fillCircle(30, 7, 3.5).fillCircle(30, 15, 3.5);
  g.fillStyle(0xe8c9ff).fillRect(6, 7, 24, 8);
  g.fillStyle(0xb98cff).fillRect(12, 9, 3, 2).fillRect(18, 11, 3, 2).fillRect(23, 9, 3, 2);
  g.generateTexture(TEXTURES.sniffTreat, 36, 22);
  g.destroy();
}

function squirrelToy(scene: Phaser.Scene): void {
  // Melody's beloved (slightly chewed) squirrel toy.
  const g = scene.make.graphics({}, false);
  const fur = 0x9a5a2e;
  const dark = 0x5e3417;
  // big bushy tail
  g.fillStyle(dark).fillEllipse(10, 16, 18, 28);
  g.fillStyle(fur).fillEllipse(10, 16, 13, 23);
  g.fillStyle(0xc68a5a).fillEllipse(8, 12, 5, 12);
  // body + head
  g.fillStyle(dark).fillEllipse(24, 26, 18, 18);
  g.fillStyle(fur).fillEllipse(24, 26, 14, 14);
  g.fillStyle(0xe8c9a0).fillEllipse(26, 28, 7, 9);
  g.fillStyle(dark).fillCircle(29, 13, 8);
  g.fillStyle(fur).fillCircle(29, 13, 6.5);
  g.fillStyle(dark).fillTriangle(24, 7, 27, 1, 29, 7).fillTriangle(30, 7, 34, 1, 35, 8);
  g.fillStyle(0x111111).fillCircle(32, 12, 1.6);
  g.fillStyle(0x3b2412).fillCircle(35.5, 15, 1.4);
  // stitched-on patch - it's a well-loved toy
  g.lineStyle(1, 0xfff1d0).strokeRect(19, 22, 4, 4);
  g.generateTexture(TEXTURES.squirrelToy, 40, 36);
  g.destroy();
}

function scentIcons(scene: Phaser.Scene): void {
  // Acorn = squirrel
  let g = scene.make.graphics({}, false);
  g.fillStyle(0x6b4520).fillEllipse(8, 5, 14, 7);
  g.fillStyle(0xffa24c).fillEllipse(8, 11, 10, 12);
  g.fillStyle(0x6b4520).fillRect(7, 0, 2, 3);
  g.generateTexture(TEXTURES.scentSquirrel, 16, 18);
  g.destroy();
  // Mini sausage
  g = scene.make.graphics({}, false);
  g.fillStyle(0xff5f6d).fillRoundedRect(1, 3, 16, 9, 4);
  g.fillStyle(0xffb3b8).fillRect(4, 5, 8, 2);
  g.generateTexture(TEXTURES.scentSausage, 18, 15);
  g.destroy();
  // Paw = cat
  g = scene.make.graphics({}, false);
  g.fillStyle(0xb58cff).fillEllipse(8, 11, 9, 7);
  g.fillCircle(3, 5, 2.2).fillCircle(7, 3, 2.2).fillCircle(11, 3, 2.2).fillCircle(14, 6, 2.2);
  g.generateTexture(TEXTURES.scentCat, 17, 16);
  g.destroy();
}

function pawPrints(scene: Phaser.Scene): void {
  // Little cat paw prints on the ground.
  const g = scene.make.graphics({}, false);
  const paw = (x: number, y: number) => {
    g.fillStyle(0x5b3fa0, 0.85).fillEllipse(x, y + 4, 7, 5);
    g.fillCircle(x - 4, y, 1.6).fillCircle(x - 1.5, y - 2, 1.6).fillCircle(x + 1.5, y - 2, 1.6).fillCircle(x + 4, y, 1.6);
  };
  paw(8, 12); paw(22, 6); paw(36, 12); paw(50, 6);
  g.generateTexture(TEXTURES.pawPrints, 58, 20);
  g.destroy();
}

function barkBiscuit(scene: Phaser.Scene): void {
  // Round biscuit with a blue "sound wave" on it.
  const g = scene.make.graphics({}, false);
  g.fillStyle(0x8a5a2b).fillCircle(14, 14, 13);
  g.fillStyle(0xd9a45b).fillCircle(14, 14, 11);
  g.lineStyle(2, 0x2b8fd6).beginPath().arc(9, 14, 4, -0.9, 0.9).strokePath();
  g.beginPath().arc(9, 14, 8, -0.8, 0.8).strokePath();
  g.fillStyle(0x2b8fd6).fillCircle(8, 14, 2);
  g.generateTexture(TEXTURES.barkBiscuit, 28, 28);
  g.destroy();
}

function ball(scene: Phaser.Scene): void {
  // Melody's tennis ball.
  const g = scene.make.graphics({}, false);
  g.fillStyle(0x6b8e1f).fillCircle(11, 11, 11);
  g.fillStyle(0xd4ec3a).fillCircle(11, 11, 9.5);
  g.lineStyle(2, 0xffffff).beginPath().arc(2, 11, 8, -1.1, 1.1).strokePath();
  g.beginPath().arc(20, 11, 8, Math.PI - 1.1, Math.PI + 1.1).strokePath();
  g.generateTexture(TEXTURES.ball, 22, 22);
  g.destroy();
}

function cat(scene: Phaser.Scene): void {
  // The neighbour's ginger cat, sitting side-on (facing left).
  const g = scene.make.graphics({}, false);
  const fur = 0xe08a3c;
  const dark = 0x9c5418;
  g.fillStyle(dark).fillEllipse(44, 34, 10, 26); // tail curled up behind
  g.fillStyle(fur).fillEllipse(44, 34, 6, 22);
  g.fillStyle(dark).fillEllipse(30, 34, 30, 30); // body
  g.fillStyle(fur).fillEllipse(30, 34, 26, 26);
  g.fillStyle(dark).fillRect(18, 38, 20, 10);
  g.fillStyle(fur).fillRect(20, 38, 17, 9);
  g.fillStyle(0xf6d9b8).fillEllipse(22, 38, 10, 14); // chest
  g.fillStyle(dark).fillCircle(16, 16, 11); // head
  g.fillStyle(fur).fillCircle(16, 16, 9.5);
  g.fillStyle(dark).fillTriangle(8, 10, 9, 1, 15, 7).fillTriangle(18, 7, 23, 1, 24, 10);
  g.fillStyle(0x2d7a2d).fillEllipse(11, 15, 4, 5).fillEllipse(19, 15, 4, 5); // green eyes
  g.fillStyle(0x111111).fillRect(10.5, 13, 1.2, 4).fillRect(18.5, 13, 1.2, 4);
  g.fillStyle(0xd46a7a).fillTriangle(14, 20, 18, 20, 16, 22);
  g.fillStyle(dark).fillRect(24, 26, 3, 8).fillRect(32, 24, 3, 9); // stripes
  g.generateTexture(TEXTURES.cat, 52, 48);
  g.destroy();
}

function leaf(scene: Phaser.Scene): void {
  const g = scene.make.graphics({}, false);
  g.fillStyle(0xffffff).fillEllipse(5, 3, 10, 5);
  g.generateTexture(TEXTURES.leaf, 10, 6);
  g.destroy();
}
