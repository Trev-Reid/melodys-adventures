import Phaser from 'phaser';
import { SCENES } from './keys';
import { CAMERA } from '@/config/camera';
import { KEYBOARD_BINDINGS } from '@/config/controls';
import { DEBUG } from '@/config/debug';
import { InputManager } from '@/core/input/InputManager';
import { KeyboardInputSource } from '@/core/input/KeyboardInputSource';
import { sfx } from '@/core/audio/Sfx';
import { Melody } from '@/characters/melody/Melody';
import type { Character } from '@/characters/Character';
import type { CharacterIntent } from '@/characters/abilities/Ability';
import { COLLECTIBLE_TYPES } from '@/entities/collectibles/collectibleTypes';
import { LevelProgress } from '@/gameplay/LevelProgress';
import { getLevel } from '@/levels';
import { buildLevel, type BuiltLevel } from '@/levels/LevelBuilder';
import { ObstacleSystem } from '@/gameplay/interactions/ObstacleSystem';
import { EFFECTS } from '@/config/powerUps';
import { SniffSystem } from '@/gameplay/scent/SniffSystem';
import { DISPLAY } from '@/config/display';
import type { DebugScene, DebugSceneData } from './DebugScene';
import type { HudScene, HudSceneData } from './HudScene';

export interface LevelSceneData {
  levelKey: string;
}

/** Longest frame step we simulate, so a background tab doesn't cause huge jumps. */
const MAX_DT = 1 / 30;

/**
 * Generic gameplay scene: plays whichever level it is given.
 * One scene class serves every level; levels differ only in their data.
 */
export class LevelScene extends Phaser.Scene {
  private levelKey!: string;
  private level!: BuiltLevel;
  private input$!: InputManager;
  private player!: Character;
  private progress!: LevelProgress;
  private obstacles!: ObstacleSystem;
  private sniff!: SniffSystem;
  /** Darkens the world while an effect with a worldTint (SUPER SNIFF) is active. */
  private worldTint!: Phaser.GameObjects.Rectangle;
  private lastComboNames = '';
  private readonly playerRect = new Phaser.Geom.Rectangle();

  constructor() {
    super(SCENES.level);
  }

  create(data: LevelSceneData): void {
    this.levelKey = data.levelKey;
    this.level = buildLevel(this, getLevel(data.levelKey));
    const { spawn, width, height } = this.level.definition;

    // Input: keyboard today; a GamepadInputSource can be added alongside it later.
    this.input$ = new InputManager();
    this.input$.addSource(new KeyboardInputSource(this.input.keyboard!, KEYBOARD_BINDINGS));

    // The active player character. Later this becomes switchable (Melody <-> friend).
    this.player = new Melody(this, spawn.x, spawn.y);
    this.physics.add.collider(this.player, this.level.solids);

    // Heavy crates, breakable barriers - what she can do depends on her power-ups.
    this.obstacles = new ObstacleSystem(this, this.player, this.level.obstacles, this.level.solids, {
      say: (text, color) => this.say(text, color),
      moveX: () => this.input$.moveX,
    });

    // Melody's nose: scent trails and hidden things.
    this.sniff = new SniffSystem(this, this.player, this.level.scentTrails, [
      ...this.level.collectibles,
      ...this.level.pointsOfInterest,
    ]);

    // Subdues the world (tiles, obstacles, signs) but not items, Melody or scents.
    this.worldTint = this.add
      .rectangle(0, 0, DISPLAY.width, DISPLAY.height, 0x000000, 1)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(4.5)
      .setAlpha(0);

    // Power-up announcements.
    this.player.effects.listen({
      onStart: (type) => {
        const def = EFFECTS[type];
        this.say(`${def.label}!`, '#' + def.color.toString(16).padStart(6, '0'), 30);
        if (def.startSound) sfx.play(def.startSound);
        if (def.ripple !== undefined) this.ripple(def.ripple);
        else this.cameras.main.flash(180, 255, 180, 120);
      },
      onRefresh: (type) => this.say(`${EFFECTS[type].label} topped up!`, '#ffe066'),
      onEnd: () => {
        sfx.play('powerdown');
        this.say('...back to normal', '#ffffff');
      },
    });

    // Goal: collect every goal item in the level.
    const goalItems = this.level.collectibles.filter((c) => c.info.countsTowardGoal);
    this.progress = new LevelProgress(goalItems.length);

    // Camera
    const cam = this.cameras.main;
    cam.setBounds(0, 0, width, height);
    cam.setZoom(CAMERA.zoom);
    cam.startFollow(this.player, false, CAMERA.lerpX, CAMERA.lerpY, 0, CAMERA.followOffsetY);
    cam.setDeadzone(CAMERA.deadzoneWidth, CAMERA.deadzoneHeight);
    cam.fadeIn(250);

    this.launchOverlays();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.input$.destroy());
  }

  override update(_time: number, deltaMs: number): void {
    const dt = Math.min(deltaMs / 1000, MAX_DT);
    const input = this.input$;
    input.update();

    if (input.justPressed('toggleDebug')) this.toggleDebug();
    if (input.justPressed('mute')) sfx.toggleMute();
    if (input.justPressed('restart')) {
      if (this.progress.complete) {
        this.scene.restart({ levelKey: this.levelKey } satisfies LevelSceneData);
        return;
      }
      const { spawn } = this.level.definition;
      this.player.respawn(spawn.x, spawn.y);
    }

    this.obstacles.update(dt);

    const intent: CharacterIntent = {
      moveX: input.moveX,
      jumpPressed: input.justPressed('jump'),
      jumpHeld: input.isDown('jump'),
      sprintHeld: input.isDown('sprint'),
    };
    this.player.applyIntent(intent, dt);
    this.announceCombos();
    this.sniff.update(dt);
    this.updateWorldTint(dt);

    this.progress.tick(dt * 1000);
    this.checkPickups();
  }

  // --- Collectibles -------------------------------------------------------------

  private checkPickups(): void {
    const body = this.player.body;
    this.playerRect.setTo(body.x, body.y, body.width, body.height);

    for (const item of this.level.collectibles) {
      if (!item.overlaps(this.playerRect)) continue;
      item.collect();
      sfx.play(item.info.sound);
      if (item.info.pickupText) this.floatText(item.x, item.y - 10, item.info.pickupText);
      if (item.info.effect) this.player.effects.apply(item.info.effect);
      if (item.info.celebrate) {
        const c = item.info.celebrate;
        this.say(c.text, '#ffe066', 30);
        this.cameras.main.flash(250, 255, 240, 200);
        if (this.player instanceof Melody) this.player.perform(c.anim, c.seconds);
      }

      if (item.info.countsTowardGoal && this.progress.collect()) this.onLevelComplete();
    }
  }

  private onLevelComplete(): void {
    this.time.delayedCall(250, () => sfx.play('celebrate'));
    if (this.player instanceof Melody) this.player.happy = true;
    (this.scene.get(SCENES.hud) as HudScene).celebrate();
  }

  /** Say something above Melody (hints, power-up news, BONK!). */
  private say(text: string, color = '#ffffff', size = 20): void {
    const t = this.add
      .text(this.player.x, this.player.body.top - 22, text, {
        fontFamily: 'Arial, sans-serif',
        fontSize: `${size}px`,
        fontStyle: 'bold',
        color,
        stroke: '#3b2412',
        strokeThickness: 5,
      })
      .setOrigin(0.5, 1)
      .setDepth(40);
    this.tweens.add({ targets: t, y: t.y - 36, alpha: 0, duration: 1200, delay: 300, ease: 'Quad.easeIn', onComplete: () => t.destroy() });
  }

  /** Rings expanding from Melody (SUPER SNIFF's "whoosh" of smells). */
  private ripple(color: number): void {
    const x = this.player.x;
    const y = this.player.body.center.y;
    for (let i = 0; i < 3; i++) {
      const ring = this.add.circle(x, y, 20).setStrokeStyle(4, color, 0.9).setDepth(35);
      this.tweens.add({
        targets: ring,
        scale: 18,
        alpha: 0,
        duration: 1100,
        delay: i * 220,
        ease: 'Cubic.easeOut',
        onComplete: () => ring.destroy(),
      });
    }
  }

  private updateWorldTint(dt: number): void {
    const tints = this.player.effects.list().map((e) => e.def.worldTint).filter((t) => t !== undefined);
    const strongest = tints.sort((a, b) => b.alpha - a.alpha)[0];
    if (strongest) this.worldTint.setFillStyle(strongest.color, 1);
    const target = strongest?.alpha ?? 0;
    const a = this.worldTint.alpha;
    this.worldTint.setAlpha(a + Math.sign(target - a) * Math.min(Math.abs(target - a), dt * 1.5));
  }

  private announceCombos(): void {
    const names = this.player.activeCombos.map((c) => c.name).join(',');
    if (names && names !== this.lastComboNames) {
      const combo = this.player.activeCombos[0];
      this.say(`${combo.name}!`, '#' + combo.color.toString(16).padStart(6, '0'), 26);
    }
    this.lastComboNames = names;
  }

  private floatText(x: number, y: number, text: string): void {
    const t = this.add
      .text(x, y, text, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '20px',
        fontStyle: 'bold',
        color: '#ffe066',
        stroke: '#6b3a12',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(30);
    this.tweens.add({ targets: t, y: y - 40, alpha: 0, duration: 650, ease: 'Quad.easeOut', onComplete: () => t.destroy() });
  }

  // --- Overlays (HUD + debug) ----------------------------------------------------

  private launchOverlays(): void {
    const goalKind = this.level.collectibles.find((c) => c.info.countsTowardGoal)?.kind ?? 'sausage';
    const goal = COLLECTIBLE_TYPES[goalKind];

    const hudData: HudSceneData = {
      progress: this.progress,
      goalTexture: goal.texture,
      goalPlural: goal.plural,
      isMuted: () => sfx.muted,
      effects: () => this.player.effects.list(),
      combos: () => this.player.activeCombos,
    };
    const debugData: DebugSceneData = {
      title: this.level.definition.name,
      lines: () => this.debugLines(),
    };

    // Overlays are restarted along with the level so they pick up fresh data.
    this.restartOverlay(SCENES.hud, hudData);
    this.restartOverlay(SCENES.debug, debugData);
    this.setDebugVisible(this.debugVisible ?? DEBUG.showOverlayOnStart);

    if (import.meta.env.DEV) {
      // Live-tuning from the browser console, e.g.  tune.maxSpeed = 400  or  sprint.speedMultiplier = 2
      const melody = this.player as Melody;
      Object.assign(window, { tune: melody.movement.config, sprint: melody.sprint.stamina.config, game: this.game });
    }
  }

  private restartOverlay(key: string, data: object): void {
    if (this.scene.isActive(key)) this.scene.stop(key);
    this.scene.launch(key, data);
  }

  private debugLines(): string[] {
    const p = this.player;
    const v = p.body.velocity;
    return [
      `pos   x ${p.x.toFixed(0).padStart(5)}  y ${p.y.toFixed(0).padStart(5)}`,
      `vel   x ${v.x.toFixed(0).padStart(5)}  y ${v.y.toFixed(0).padStart(5)}`,
      `onGround ${p.onGround ? 'YES' : 'no'}`,
      ...p.debugLines(),
      `input x ${this.input$.moveX.toFixed(2)}  jump ${this.input$.isDown('jump') ? 'held' : '-'}`,
      `fps ${this.game.loop.actualFps.toFixed(0)}`,
    ];
  }

  private debugVisible?: boolean;

  private toggleDebug(): void {
    this.setDebugVisible(!this.debugVisible);
  }

  private setDebugVisible(visible: boolean): void {
    this.debugVisible = visible;
    (this.scene.get(SCENES.debug) as DebugScene).setOverlayVisible(visible);

    const world = this.physics.world;
    const drawBodies = visible && DEBUG.drawPhysicsBodies;
    if (drawBodies && !world.debugGraphic) world.createDebugGraphic();
    world.drawDebug = drawBodies;
    world.debugGraphic?.clear().setVisible(drawBodies);
  }
}
