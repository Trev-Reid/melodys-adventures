import Phaser from 'phaser';
import { SCENES } from './keys';
import { CAMERA } from '@/config/camera';
import { KEYBOARD_BINDINGS } from '@/config/controls';
import { DEBUG } from '@/config/debug';
import { InputManager } from '@/core/input/InputManager';
import { KeyboardInputSource } from '@/core/input/KeyboardInputSource';
import { sfx } from '@/core/audio/Sfx';
import { Melody } from '@/characters/melody/Melody';
import { Boy } from '@/characters/boy/Boy';
import type { Character } from '@/characters/Character';
import { IDLE_INTENT, type CharacterIntent } from '@/characters/abilities/Ability';
import { FollowBrain } from '@/characters/follow/FollowBrain';
import { FOLLOW } from '@/config/follow';
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
  private readonly followBrain = new FollowBrain(FOLLOW);
  /** What Melody was asked to do this frame (by the player or by following). */
  private melodyIntent: CharacterIntent = IDLE_INTENT;
  /** Little arrow over whoever you're controlling, just after a swap. */
  private activeMarker!: Phaser.GameObjects.Text;
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

    // Melody and her boy. The player controls one (TAB / C swaps); the other follows.
    this.melody = new Melody(this, spawn.x, spawn.y);
    this.boy = new Boy(this, Math.max(20, spawn.x - 50), spawn.y);
    this.active = this.melody;
    this.physics.add.collider([this.melody, this.boy], this.level.solids);

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
    if (input.justPressed('restart')) {
      if (this.progress.complete) {
        this.scene.restart({ levelKey: this.levelKey } satisfies LevelSceneData);
        return;
      }
      const { spawn } = this.level.definition;
      this.melody.respawn(spawn.x, spawn.y);
      this.boy.respawn(Math.max(20, spawn.x - 50), spawn.y);
      this.followBrain.reset();
    }
    if (input.justPressed('switchCharacter')) this.swapCharacters();

    this.obstacles.update(dt);

    const playerIntent: CharacterIntent = {
      moveX: input.moveX,
      jumpPressed: input.justPressed('jump'),
      jumpHeld: input.isDown('jump'),
      sprintHeld: input.isDown('sprint'),
      barkPressed: input.justPressed('bark'),
    };
    const follower = this.active === this.melody ? this.boy : this.melody;
    const followIntent = this.follow(follower, this.active, dt);
    this.melodyIntent = this.active === this.melody ? playerIntent : followIntent;
    this.melody.applyIntent(this.melodyIntent, dt);
    this.boy.applyIntent(this.active === this.boy ? playerIntent : followIntent, dt);

    this.announceCombos();
    this.sniff.update(dt);
    this.updateWorldTint(dt);
    this.updateActiveMarker();

    this.progress.tick(dt * 1000);
    this.checkPickups(this.melody);
    this.checkPickups(this.boy);
  }

  // --- Melody and her boy -------------------------------------------------------

  /** TAB / C: control the other character; the one you were controlling follows. */
  private swapCharacters(): void {
    this.active.setDepth(9);
    this.active = this.active === this.melody ? this.boy : this.melody;
    this.active.setDepth(10);
    this.followBrain.reset();
    this.cameras.main.startFollow(this.active, false, CAMERA.lerpX, CAMERA.lerpY, 0, CAMERA.followOffsetY);
    this.say(this.active.displayName, '#ffe066', 24, this.active);
    sfx.play('jump');
    this.tweens.killTweensOf(this.activeMarker);
    this.activeMarker.setAlpha(1);
    this.tweens.add({ targets: this.activeMarker, alpha: 0, delay: 1200, duration: 400 });
  }

  /** The character you're not controlling follows the one you are. */
  private follow(follower: Character, leader: Character, dt: number): CharacterIntent {
    const fb = follower.body;
    const decision = this.followBrain.update(
      {
        x: follower.x,
        feetY: fb.bottom,
        onGround: follower.onGround,
        blockedLeft: fb.blocked.left || fb.touching.left,
        blockedRight: fb.blocked.right || fb.touching.right,
      },
      { x: leader.x, feetY: leader.body.bottom, onGround: leader.onGround },
      dt,
    );
    if (decision.catchUp) {
      // Left behind or stuck: pop in just behind the leader.
      this.poof(follower.x, fb.center.y);
      follower.respawn(leader.x - leader.facing * 30, leader.body.bottom);
      follower.facing = leader.facing;
      this.poof(follower.x, follower.body.center.y);
    }
    return decision.intent;
  }

  private updateActiveMarker(): void {
    this.activeMarker.setPosition(this.active.x, this.active.body.top - 8);
  }

  private poof(x: number, y: number): void {
    const puff = this.add.circle(x, y, 18, 0xffffff, 0.8).setDepth(35);
    this.tweens.add({ targets: puff, scale: 2.2, alpha: 0, duration: 350, ease: 'Quad.easeOut', onComplete: () => puff.destroy() });
  }

  // --- Collectibles -------------------------------------------------------------

  /**
   * Both of them collect sausages and toys. Power-ups are dog treats, so only
   * Melody eats those.
   */
  private checkPickups(who: Character): void {
    const body = who.body;
    this.playerRect.setTo(body.x, body.y, body.width, body.height);

    for (const item of this.level.collectibles) {
      if (who !== this.melody && item.info.effect) continue;
      if (!item.overlaps(this.playerRect)) continue;
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
