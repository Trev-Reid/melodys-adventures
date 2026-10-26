import Phaser from 'phaser';
import { SCENES } from './keys';
import { CAMERA } from '@/config/camera';
import { DEBUG } from '@/config/debug';
import type { InputManager } from '@/core/input/InputManager';
import { createPlayerInput } from '@/core/input/createPlayerInput';
import { connectedPads } from '@/core/input/gamepad/GamepadInputSource';
import type { InputDevice } from '@/core/input/buttonLabels';
import { sfx } from '@/core/audio/Sfx';
import { Melody } from '@/characters/melody/Melody';
import { Boy } from '@/characters/boy/Boy';
import type { Character } from '@/characters/Character';
import { IDLE_INTENT, type CharacterIntent } from '@/characters/abilities/Ability';
import { TeamworkSystem } from '@/gameplay/teamwork/TeamworkSystem';
import { COLLECTIBLE_TYPES } from '@/entities/collectibles/collectibleTypes';
import { LevelProgress } from '@/gameplay/LevelProgress';
import { getLevel } from '@/levels';
import { buildLevel, type BuiltLevel } from '@/levels/LevelBuilder';
import { ObstacleSystem } from '@/gameplay/interactions/ObstacleSystem';
import { EFFECTS } from '@/config/powerUps';
import { SniffSystem } from '@/gameplay/scent/SniffSystem';
import { BarkSystem } from '@/gameplay/bark/BarkSystem';
import type { Detectable } from '@/gameplay/scent/Detectable';
import { DISPLAY } from '@/config/display';
import { AmbientLife } from '@/gameplay/ambient/AmbientLife';
import { GroundShadows } from '@/gameplay/ambient/GroundShadows';
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
  /** Melody: power-ups, sniffing and barking are all hers. */
  private melody!: Melody;
  private boy!: Boy;
  /** Whoever the player is controlling; the other one follows. */
  private active!: Character;
  /** Following, staying, fetching; the boy's gates, levers, ladders and football. */
  private teamwork!: TeamworkSystem;
  /** What Melody was asked to do this frame (by the player or by following). */
  private melodyIntent: CharacterIntent = IDLE_INTENT;
  /** Little arrow over whoever you're controlling, just after a swap. */
  private activeMarker!: Phaser.GameObjects.Text;
  /** Butterflies, robins, the squirrel, falling leaves. */
  private ambient!: AmbientLife;
  private shadows!: GroundShadows;
  private progress!: LevelProgress;
  private obstacles!: ObstacleSystem;
  private sniff!: SniffSystem;
  /** Darkens the world while an effect with a worldTint (SUPER SNIFF) is active. */
  private worldTint!: Phaser.GameObjects.Rectangle;
  private lastComboNames = '';
  private readonly playerRect = new Phaser.Geom.Rectangle();
  /** Keyboard or controller: signs show that device's buttons. */
  private device: InputDevice = 'keyboard';
  /** Who landed on a trampoline this frame (applied after their next move). */
  private readonly pendingBounce = new Map<Character, { speed: number; heldSpeed: number }>();

  constructor() {
    super(SCENES.level);
  }

  create(data: LevelSceneData): void {
    this.levelKey = data.levelKey;
    this.device = connectedPads().length > 0 ? 'gamepad' : 'keyboard';
    this.level = buildLevel(this, getLevel(data.levelKey), this.device);
    const { spawn, width, height } = this.level.definition;

    // Input: the keyboard and any USB controllers (see core/input/gamepad).
    this.input$ = createPlayerInput(this);
    this.input$.settle();
    // Coming back from the pause menu: the button that closed it shouldn't make her jump.
    this.events.on(Phaser.Scenes.Events.RESUME, () => this.input$.settle());

    // Melody and her boy. The player controls one (TAB / C / SELECT swaps); the other follows.
    this.melody = new Melody(this, spawn.x, spawn.y);
    this.boy = new Boy(this, Math.max(20, spawn.x - 50), spawn.y);
    this.active = this.melody;
    // Solid ground and walls. Someone climbing a ladder goes through decks they could jump up through.
    this.physics.add.collider([this.melody, this.boy], this.level.solids, undefined, (who, solid) => {
      const body = (solid as Phaser.GameObjects.GameObject).body as Phaser.Physics.Arcade.StaticBody | null;
      const oneWay = !!body && !body.checkCollision.down;
      return !(oneWay && (who as Character).passesThroughOneWay);
    });

    // Trampolines: land on one and boing! (higher if jump is held).
    for (const who of [this.melody, this.boy]) {
      for (const b of this.level.bouncers) {
        this.physics.add.collider(who, b.body, () => {
          if (who.body.touching.down) this.pendingBounce.set(who, b.bounce);
        }, (_p, zone) => {
          // One-way: only when coming down onto it.
          const z = (zone as Phaser.GameObjects.Zone).body as Phaser.Physics.Arcade.StaticBody;
          return who.body.velocity.y >= 0 && who.body.bottom <= z.top + 12;
        });
      }
    }

    // Heavy crates, breakable barriers - what she can do depends on her power-ups.
    this.obstacles = new ObstacleSystem(this, this.melody, this.level.obstacles, this.level.solids, {
      say: (text, color) => this.say(text, color),
      moveX: () => this.melodyIntent.moveX,
    });
    // The boy can't push or smash anything (yet) - to him they're just in the way.
    this.physics.add.collider(this.boy, this.level.obstacles);

    // Melody's nose: scent trails and hidden things.
    this.sniff = new SniffSystem(this, this.melody, this.level.scentTrails, [
      ...this.level.collectibles,
      ...this.level.pointsOfInterest,
    ]);

    // Barking at things: balls in trees, leaf piles, cats in the way, bark blocks.
    const byName = new Map<string, Detectable>();
    for (const c of this.level.collectibles) if (c.id) byName.set(c.id, c);
    for (const p of this.level.pointsOfInterest) byName.set(p.id, p);
    const barkBlocks = this.level.obstacles.filter((o) => o.isBarkBreakable);
    const barks = new BarkSystem(this, this.melody.bark, this.level.barkTargets, byName, (t, c) => this.say(t, c), barkBlocks);
    this.physics.add.collider([this.melody, this.boy], barks.blockers);

    // Teamwork: the boy's gates, levers, ladders and football; who follows, sits or fetches.
    this.teamwork = new TeamworkSystem(this, this.level, this.melody, this.boy, {
      say: (text, color, size, who) => this.say(text, color, size, who),
      cheer: (text, x, y) => this.cheer(text, x, y),
      pop: (follower, leader) => this.popNextTo(follower, leader),
      device: () => this.device,
    });
    this.melody.bark.onBark(() => this.teamwork.onMelodyBark());

    // The garden's wildlife, and soft shadows under Melody and the boy.
    this.ambient = new AmbientLife(this, this.level.critters, this.level.leafAreas);
    this.melody.bark.onBark((e) => this.ambient.scare(e.x, e.y, e.isSuper ? 600 : 320));
    const surfaces = [
      ...this.level.solids,
      ...this.level.obstacles,
      ...this.level.bouncers.map((b) => b.body),
      ...this.teamwork.liftFloors,
    ];
    this.shadows = new GroundShadows(this, [this.melody, this.boy], () => surfaces);

    this.activeMarker = this.add
      .text(0, 0, '▼', { fontFamily: 'Arial, sans-serif', fontSize: '22px', color: '#ffe066', stroke: '#3b2412', strokeThickness: 4 })
      .setOrigin(0.5, 1)
      .setDepth(40)
      .setAlpha(0);

    // Subdues the world (tiles, obstacles, signs) but not items, Melody or scents.
    this.worldTint = this.add
      .rectangle(0, 0, DISPLAY.width, DISPLAY.height, 0x000000, 1)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(4.5)
      .setAlpha(0);

    // Power-up announcements.
    this.melody.effects.listen({
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
    cam.startFollow(this.active, false, CAMERA.lerpX, CAMERA.lerpY, 0, CAMERA.followOffsetY);
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
    this.updateDevice();
    if (input.justPressed('pause') && !this.progress.complete) {
      sfx.play('menuSelect');
      this.scene.pause();
      this.scene.launch(SCENES.pause, { levelKey: this.levelKey });
      return;
    }
    if (input.justPressed('restart') || (this.progress.complete && input.justPressed('pause'))) {
      if (this.progress.complete) {
        this.scene.restart({ levelKey: this.levelKey } satisfies LevelSceneData);
        return;
      }
      const { spawn } = this.level.definition;
      this.melody.respawn(spawn.x, spawn.y);
      this.boy.respawn(Math.max(20, spawn.x - 50), spawn.y);
      this.teamwork.onRespawn();
    }
    if (input.justPressed('switchCharacter')) this.swapCharacters();

    this.obstacles.update(dt);

    const playerIntent: CharacterIntent = {
      moveX: input.moveX,
      moveY: input.moveY,
      jumpPressed: input.justPressed('jump'),
      jumpHeld: input.isDown('jump'),
      sprintHeld: input.isDown('sprint'),
      // One action button: Melody barks, the boy uses things.
      barkPressed: this.active === this.melody && input.justPressed('bark'),
      usePressed: this.active === this.boy && input.justPressed('use'),
    };
    this.teamwork.handleUse(this.active, playerIntent);
    const follower = this.active === this.melody ? this.boy : this.melody;
    const followIntent = this.teamwork.followerIntent(follower, this.active, dt);
    this.melodyIntent = this.active === this.melody ? playerIntent : followIntent;
    const boyIntent = this.active === this.boy ? playerIntent : followIntent;
    this.melody.applyIntent(this.melodyIntent, dt);
    this.boy.applyIntent(boyIntent, dt);
    this.applyBounce(this.melody, this.melodyIntent);
    this.applyBounce(this.boy, boyIntent);
    this.teamwork.afterMove(dt, this.active, playerIntent);

    this.announceCombos();
    this.sniff.update(dt);
    this.updateWorldTint(dt);
    this.updateActiveMarker();

    this.progress.tick(dt * 1000);
    this.checkPickups(this.melody);
    this.checkPickups(this.boy);
    this.level.background?.update(this.cameras.main, dt);
    this.ambient.update(dt, [this.melody, this.boy].map((c) => ({ x: c.x, y: c.body.bottom, speed: Math.abs(c.body.velocity.x) })));
    this.shadows.update();
  }

  /** Boing: launch whoever landed on a trampoline (higher if they're holding jump). */
  private applyBounce(who: Character, intent: CharacterIntent): void {
    const b = this.pendingBounce.get(who);
    if (!b) return;
    this.pendingBounce.delete(who);
    who.body.setVelocityY(-(intent.jumpHeld ? b.heldSpeed : b.speed));
    who.movement.endJump();
    sfx.play('boing');
  }

  // --- Melody and her boy -------------------------------------------------------

  /** TAB / C / SELECT: control the other character; the one you were controlling follows. */
  private swapCharacters(): void {
    this.active.setDepth(9);
    this.active = this.active === this.melody ? this.boy : this.melody;
    this.active.setDepth(10);
    this.teamwork.onSwap(this.active);
    this.cameras.main.startFollow(this.active, false, CAMERA.lerpX, CAMERA.lerpY, 0, CAMERA.followOffsetY);
    this.say(this.active.displayName, '#ffe066', 24, this.active);
    sfx.play('jump');
    this.tweens.killTweensOf(this.activeMarker);
    this.activeMarker.setAlpha(1);
    this.tweens.add({ targets: this.activeMarker, alpha: 0, delay: 1200, duration: 400 });
  }

  /** Left behind or stuck: pop in just behind the leader. */
  private popNextTo(follower: Character, leader: Character): void {
    this.poof(follower.x, follower.body.center.y);
    follower.respawn(leader.x - leader.facing * 30, leader.body.bottom);
    follower.facing = leader.facing;
    this.poof(follower.x, follower.body.center.y);
  }

  private updateActiveMarker(): void {
    this.activeMarker.setPosition(this.active.x, this.active.body.top - 8);
  }

  private poof(x: number, y: number): void {
    const puff = this.add.circle(x, y, 18, 0xffffff, 0.8).setDepth(35);
    this.tweens.add({ targets: puff, scale: 2.2, alpha: 0, duration: 350, ease: 'Quad.easeOut', onComplete: () => puff.destroy() });
  }

  /** Switch the signs between keyboard and controller buttons when the player switches. */
  private updateDevice(): void {
    const source = this.input$.lastActiveSource;
    const device: InputDevice = source === 'gamepad' ? 'gamepad' : source === 'keyboard' ? 'keyboard' : this.device;
    if (device === this.device) return;
    this.device = device;
    for (const sign of this.level.signs) sign.showFor(device);
  }

  // --- Collectibles -------------------------------------------------------------

  /**
   * Both of them collect bones, sausages and toys. Power-ups are dog treats, so
   * only Melody eats those.
   */
  private checkPickups(who: Character): void {
    const body = who.body;
    this.playerRect.setTo(body.x, body.y, body.width, body.height);

    for (const item of this.level.collectibles) {
      if (!item.overlaps(this.playerRect)) continue;
      if (who !== this.melody && item.info.effect) continue;
      item.collect();
      sfx.play(item.info.sound);
      if (item.info.pickupText) this.floatText(item.x, item.y - 10, item.info.pickupText);
      if (item.info.effect) this.melody.effects.apply(item.info.effect);
      if (item.info.celebrate) {
        const c = item.info.celebrate;
        this.say(c.text, '#ffe066', 30, who);
        this.cameras.main.flash(250, 255, 240, 200);
        this.melody.perform(c.anim, c.seconds);
      }

      if (item.info.countsTowardGoal && this.progress.collect()) this.onLevelComplete();
    }
  }

  private onLevelComplete(): void {
    this.time.delayedCall(250, () => sfx.play('celebrate'));
    this.melody.happy = true;
    (this.scene.get(SCENES.hud) as HudScene).celebrate();
  }

  /** Say something above Melody (hints, power-up news, BONK!) - or above someone else. */
  private say(text: string, color = '#ffffff', size = 20, who: Character = this.melody): void {
    const t = this.add
      .text(who.x, who.body.top - 22, text, {
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
    const x = this.melody.x;
    const y = this.melody.body.center.y;
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
    const tints = this.melody.effects.list().map((e) => e.def.worldTint).filter((t) => t !== undefined);
    const strongest = tints.sort((a, b) => b.alpha - a.alpha)[0];
    if (strongest) this.worldTint.setFillStyle(strongest.color, 1);
    const target = strongest?.alpha ?? 0;
    const a = this.worldTint.alpha;
    this.worldTint.setAlpha(a + Math.sign(target - a) * Math.min(Math.abs(target - a), dt * 1.5));
  }

  private announceCombos(): void {
    const names = this.melody.activeCombos.map((c) => c.name).join(',');
    if (names && names !== this.lastComboNames) {
      const combo = this.melody.activeCombos[0];
      this.say(`${combo.name}!`, '#' + combo.color.toString(16).padStart(6, '0'), 26);
    }
    this.lastComboNames = names;
  }

  /** Big happy words at a spot (GOAL!, Got it!). */
  private cheer(text: string, x: number, y: number): void {
    const t = this.add
      .text(x, y, text, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '34px',
        fontStyle: 'bold',
        color: '#ffe066',
        stroke: '#3b2412',
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setDepth(42)
      .setScale(0.4);
    this.tweens.add({ targets: t, scale: 1, duration: 260, ease: 'Back.easeOut' });
    this.tweens.add({ targets: t, y: y - 40, alpha: 0, delay: 900, duration: 600, ease: 'Quad.easeIn', onComplete: () => t.destroy() });
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
      effects: () => this.melody.effects.list(),
      combos: () => this.melody.activeCombos,
      health: () => this.melody.health,
      sprint: () => ({ active: this.melody.sprint.isSprinting, stamina: this.melody.sprint.stamina.stamina }),
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
      const melody = this.melody;
      Object.assign(window, { tune: melody.movement.config, sprint: melody.sprint.stamina.config, game: this.game });
    }
  }

  private restartOverlay(key: string, data: object): void {
    if (this.scene.isActive(key)) this.scene.stop(key);
    this.scene.launch(key, data);
  }

  private debugLines(): string[] {
    const p = this.active;
    const v = p.body.velocity;
    return [
      `pos   x ${p.x.toFixed(0).padStart(5)}  y ${p.y.toFixed(0).padStart(5)}`,
      `vel   x ${v.x.toFixed(0).padStart(5)}  y ${v.y.toFixed(0).padStart(5)}`,
      `onGround ${p.onGround ? 'YES' : 'no'}`,
      ...p.debugLines(),
      this.teamwork.debugLine(),
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
