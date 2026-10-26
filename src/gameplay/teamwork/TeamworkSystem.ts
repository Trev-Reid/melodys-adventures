import Phaser from 'phaser';
import type { Melody } from '@/characters/melody/Melody';
import type { Boy } from '@/characters/boy/Boy';
import type { Character } from '@/characters/Character';
import { IDLE_INTENT, type CharacterIntent } from '@/characters/abilities/Ability';
import { FollowBrain, type FollowerState, type LeaderState } from '@/characters/follow/FollowBrain';
import { FOLLOW } from '@/config/follow';
import { CLIMB, FOOTBALL, TEAMWORK } from '@/config/teamwork';
import type { BuiltLevel, TeamworkParts } from '@/levels/LevelBuilder';
import type { Collectible } from '@/entities/collectibles/Collectible';
import type { Gate } from '@/entities/teamwork/Gate';
import type { Lift } from '@/entities/teamwork/Lift';
import { sfx } from '@/core/audio/Sfx';
import { fillPrompts, type InputDevice } from '@/core/input/buttonLabels';
import { ActionPrompt } from './ActionPrompt';
import {
  BOY_ACTION_WORDS,
  canPopTo,
  chooseBoyAction,
  ladderToGrab,
  passesNear,
  rectContains,
  throwVelocity,
  updateStay,
  type BoyActionKind,
  type StayState,
} from './teamworkRules';

export interface TeamworkHooks {
  /** Words over someone's head. */
  say(text: string, color?: string, size?: number, who?: Character): void;
  /** Big words at a spot (GOAL!). */
  cheer(text: string, x: number, y: number): void;
  /** Put the follower next to the leader, with a puff of smoke. */
  pop(follower: Character, leader: Character): void;
  /** Keyboard or controller (for the button names in prompts). */
  device(): InputDevice;
}

const distance = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);

/**
 * Melody and her boy working together.
 *
 * - The boy's action button (the same button as Melody's bark): open gates,
 *   pull levers, throw the football, tell Melody to sit / call her back.
 *   A prompt over his head says what it'll do.
 * - Whoever isn't being played follows - or stays put if told to sit (or
 *   left in the basket), or fetches the ball the boy threw.
 * - A left-behind character never pops into a team area (the treehouse): they
 *   have to get there themselves, which is the whole puzzle.
 * - Lifts, the football (knocking bones out of trees, scoring goals) and
 *   "only the boy can..." hints for Melody.
 */
export class TeamworkSystem {
  private readonly parts: TeamworkParts;
  private readonly brain = new FollowBrain(FOLLOW);
  /** Fetching: run right up to the ball (and sprint for it). */
  private readonly fetchBrain = new FollowBrain({ ...FOLLOW, stopDistance: 2, startDistance: 6, sprintDistance: 140, stuckSeconds: TEAMWORK.fetchGiveUpSeconds });
  private stayState: StayState = { staying: false, wasAway: false };
  /** What the follower is up to: following, fetching the ball, or bringing it back. */
  private mode: 'follow' | 'fetch' | 'return' = 'follow';
  private fetching = false;
  private ballInGoal = false;
  /** After a throw, the ball can't be caught straight back. */
  private noCatchFor = 0;
  private hintTimer = 0;
  private readonly prompt: ActionPrompt;
  private readonly byName = new Map<string, Gate | Lift>();

  constructor(
    scene: Phaser.Scene,
    private readonly level: BuiltLevel,
    private readonly melody: Melody,
    private readonly boy: Boy,
    private readonly hooks: TeamworkHooks,
  ) {
    this.parts = level.teamwork;
    const t = this.parts;
    boy.climb.setLadders(t.ladders);
    for (const g of t.gates) if (g.id) this.byName.set(g.id, g);
    for (const l of t.lifts) {
      if (l.id) this.byName.set(l.id, l);
      // Stand in the basket and ride it.
      scene.physics.add.collider([melody, boy], l.floor);
      l.onMove = (moving) => {
        if (moving) sfx.play('pulley');
      };
    }
    if (t.football) {
      scene.physics.add.collider(t.football, [...level.solids, ...level.obstacles, ...t.lifts.map((l) => l.floor)]);
    }
    this.prompt = new ActionPrompt(scene);
  }

  /** Melody was told to sit (or left in the basket) and is waiting. */
  get melodyStaying(): boolean {
    return this.stayState.staying;
  }

  /** Lift floors (for shadows and so on). */
  get liftFloors(): Phaser.GameObjects.GameObject[] {
    return this.parts.lifts.map((l) => l.floor);
  }

  // --- The boy's action button -----------------------------------------------------

  /** What his action button would do right now (only when he's the one being played). */
  private boyAction(active: Character): { kind: BoyActionKind; gate?: Gate; lever?: TeamworkParts['levers'][number] } | undefined {
    if (active !== this.boy || this.boy.climb.climbing) return undefined;
    const b = this.boy.body;
    const lever = this.parts.levers.find((l) => l.inReach(b.center.x, b.bottom));
    const gate = this.parts.gates.find((g) => g.inReach(b.center.x, b.bottom));
    const kind = chooseBoyAction({
      leverInReach: !!lever,
      gateInReach: !!gate,
      carryingBall: this.parts.football?.holder === 'boy',
      melodyStaying: this.stayState.staying,
      melodyFollowing: !this.fetching && this.parts.football?.holder !== 'melody',
      melodyDistance: distance(this.boy, this.melody),
      sitRange: TEAMWORK.sitRange,
    });
    return kind && { kind, gate, lever };
  }

  /** The action button was pressed: do the boy's thing (Melody's bark is her own ability). */
  handleUse(active: Character, intent: CharacterIntent): void {
    if (!intent.usePressed) return;
    const action = this.boyAction(active);
    if (!action) return;
    switch (action.kind) {
      case 'pull': {
        const lever = action.lever!;
        lever.pull();
        this.boy.perform('pull');
        sfx.play('lever');
        const target = this.byName.get(lever.target);
        if (target && 'toggle' in target) target.toggle();
        else if (target && target.open()) sfx.play('gate');
        break;
      }
      case 'open':
        this.boy.perform('open');
        if (action.gate!.open()) sfx.play('gate');
        break;
      case 'throw': {
        const ball = this.parts.football!;
        const hand = this.boy.handPosition;
        const up = intent.moveY < -0.5;
        const v = throwVelocity(this.boy.facing, up, this.boy.body.velocity.x, FOOTBALL);
        ball.release(hand.x, hand.y, v.vx, v.vy, true);
        this.boy.carrying = false;
        this.boy.perform(up ? 'throw_up' : 'throw');
        this.noCatchFor = 0.45;
        sfx.play('throw');
        break;
      }
      case 'come':
        this.setStay(false);
        this.boy.perform('call');
        sfx.play('whistle');
        this.hooks.say('Come on, Melody!', '#ffffff', 16, this.boy);
        break;
      case 'sit':
        this.setStay(true);
        this.boy.perform('point');
        sfx.play('sit');
        this.hooks.say('Sit!', '#ffffff', 18, this.boy);
        break;
    }
  }

  // --- Whoever isn't being played ---------------------------------------------------

  /** The follower's controls this frame: follow, stay put, fetch the ball or bring it back. */
  followerIntent(follower: Character, leader: Character, dt: number): CharacterIntent {
    if (follower === this.melody && this.stayState.staying) {
      const r = updateStay(this.stayState, distance(this.melody, this.boy), TEAMWORK);
      this.stayState = { staying: r.staying, wasAway: r.wasAway };
      if (!r.resumed) return IDLE_INTENT;
      // He came back for her.
      this.melody.stay(false);
      this.hooks.say('Woof!', '#ffffff', 18, this.melody);
    }

    const lb = leader.body;
    let target: LeaderState = { x: leader.x, feetY: lb.bottom, onGround: leader.onGround };
    let mode: 'follow' | 'fetch' | 'return' = 'follow';
    if (follower === this.melody) {
      const chase = this.fetchTarget();
      if (chase) {
        mode = 'fetch';
        target = chase;
      } else if (this.parts.football?.holder === 'melody') {
        mode = 'return'; // right up to him, to hand it over
      }
    }
    if (mode !== this.mode) {
      this.mode = mode;
      this.brain.reset();
      this.fetchBrain.reset();
    }
    this.fetching = mode === 'fetch';

    if (mode === 'fetch') {
      const d = this.fetchBrain.update(this.stateOf(follower), target, dt, { canPop: false, reachUp: true });
      if (!d.stuck) return d.intent;
      // Can't get to it: leave it there.
      this.parts.football!.fetchable = false;
      return IDLE_INTENT;
    }
    const canPop = canPopTo(this.parts.teamAreas, { x: follower.x, feetY: follower.body.bottom }, { x: leader.x, feetY: lb.bottom });
    const brain = mode === 'return' ? this.fetchBrain : this.brain;
    const d = brain.update(this.stateOf(follower), target, dt, { canPop, reachUp: canPop });
    if (d.catchUp) {
      this.hooks.pop(follower, leader);
      brain.reset();
    }
    return d.intent;
  }

  private stateOf(c: Character): FollowerState {
    const b = c.body;
    return {
      x: c.x,
      feetY: b.bottom,
      onGround: c.onGround,
      blockedLeft: b.blocked.left || b.touching.left,
      blockedRight: b.blocked.right || b.touching.right,
    };
  }

  /** The ball, if Melody should go and get it. */
  private fetchTarget(): LeaderState | undefined {
    const ball = this.parts.football;
    if (!ball || !ball.loose || !ball.fetchable) return undefined;
    if (distance(this.melody, ball) > TEAMWORK.fetchMaxDistance) return undefined;
    return { x: ball.x, feetY: ball.body.bottom, onGround: ball.body.blocked.down || ball.body.touching.down };
  }

  private setStay(on: boolean): void {
    this.stayState = { staying: on, wasAway: false };
    this.melody.stay(on);
    this.resetFollowing();
  }

  private resetFollowing(): void {
    this.mode = 'follow';
    this.fetching = false;
    this.brain.reset();
    this.fetchBrain.reset();
  }

  // --- Events from the level -------------------------------------------------------

  /** The player swapped characters. */
  onSwap(active: Character): void {
    this.resetFollowing();
    if (active === this.melody) {
      if (this.stayState.staying) this.setStay(false);
      return;
    }
    // Left Melody in the basket: she waits there for the ride.
    if (this.parts.lifts.some((l) => l.holds(this.melody.body))) {
      this.setStay(true);
      this.hooks.say('Stay!', '#ffffff', 18, this.melody);
    }
  }

  /** Back to the start (R). */
  onRespawn(): void {
    if (this.stayState.staying) this.setStay(false);
    this.resetFollowing();
    const ball = this.parts.football;
    if (ball?.holder === 'melody') ball.pickUp('boy');
  }

  /** Melody barked: a dog can't bark with a ball in her mouth - she drops it. */
  onMelodyBark(): void {
    const ball = this.parts.football;
    if (ball?.holder !== 'melody') return;
    const m = this.melody.mouthPosition;
    ball.release(m.x, m.y, this.melody.facing * 60, -120, false);
    this.noCatchFor = 0.5;
  }

  // --- Every frame, after everyone has moved ---------------------------------------------

  afterMove(dt: number, active: Character, playerIntent: CharacterIntent): void {
    for (const lift of this.parts.lifts) lift.update();
    this.updateBall(dt, active);
    this.updatePrompt(active, dt);
    this.updateHints(dt, active, playerIntent);
  }

  private updateBall(dt: number, active: Character): void {
    const ball = this.parts.football;
    if (!ball) return;
    this.noCatchFor = Math.max(0, this.noCatchFor - dt);
    this.boy.carrying = ball.holder === 'boy';
    // In his hands (drawn just behind him, so his arms wrap round it), or in Melody's mouth.
    const hold = ball.holder === 'boy' ? this.boy.ballHold : ball.holder === 'melody' ? this.melody.mouthPosition : undefined;
    if (ball.holder === 'boy') ball.setDepth(this.boy.depth - 0.05);
    ball.tick(dt, hold);

    if (ball.holder === 'melody') {
      // Brings it back to him.
      const close = distance(this.melody, this.boy) <= TEAMWORK.giveBallDistance && Math.abs(this.melody.body.bottom - this.boy.body.bottom) < 40;
      if (close && !this.boy.climb.climbing) {
        ball.pickUp('boy');
        this.boy.carrying = true;
        this.boy.perform('catch');
        sfx.play('catch');
        this.hooks.say('Good girl!', '#ffe066', 18, this.boy);
      }
      return;
    }
    if (ball.holder) return;

    // Flying: knock things out of trees, score goals.
    const speed = Math.hypot(ball.body.velocity.x, ball.body.velocity.y);
    if (speed > 120) {
      for (const item of this.level.collectibles) {
        if (item.stuck && !item.collected && passesNear(ball.last, ball, item, FOOTBALL.knockRadius)) this.knockDown(item);
      }
    }
    const inGoal = this.parts.ballZones.some((z) => rectContains(z, ball.x, ball.y));
    if (inGoal && !this.ballInGoal && speed > 40) {
      sfx.play('goal');
      this.hooks.cheer('GOAL!', ball.x, ball.y - 70);
      this.boyCheers();
    }
    this.ballInGoal = inGoal;

    // Picking it up: the boy whenever he touches it; Melody when she's fetching it (or being played).
    if (this.noCatchFor <= 0) {
      if (this.touches(this.boy, ball) && !this.boy.climb.climbing) {
        // Out of the air he catches it. Off the ground he bends down for it if he's standing
        // about; on the move he just scoops it up and keeps going (and runs carrying it).
        const lying = ball.body.blocked.down || ball.body.touching.down || ball.y > this.boy.body.bottom - 30;
        ball.pickUp('boy');
        this.boy.carrying = true;
        if (!lying) this.boy.perform('catch');
        else if (Math.abs(this.boy.body.velocity.x) < TEAMWORK.pickupBendSpeed) this.boy.perform('pickup');
        sfx.play('catch');
      } else if (
        this.touches(this.melody, ball) &&
        !this.stayState.staying &&
        (this.fetching || active === this.melody) &&
        ball.body.velocity.y > -60 // not snatched on its way up
      ) {
        ball.pickUp('melody');
        sfx.play('catch');
      }
    }

    // Lost somewhere nobody is: it finds its way home.
    if (ball.loose && ball.stillFor > FOOTBALL.goHomeAfterSeconds && distance(this.boy, ball) > 400 && distance(this.melody, ball) > 400) {
      ball.goHome();
    }
  }

  /** A good throw: he punches the air (if he's standing about, not busy or climbing). */
  private boyCheers(): void {
    if (this.boy.onGround && !this.boy.climb.climbing && !this.boy.carrying) this.boy.perform('cheer');
  }

  private touches(c: Character, ball: { x: number; y: number }): boolean {
    const b = c.body;
    const r = FOOTBALL.radius + 4;
    return ball.x > b.left - r && ball.x < b.right + r && ball.y > b.top - r && ball.y < b.bottom + r;
  }

  /** The ball hit something stuck up high: down it comes. */
  private knockDown(item: Collectible): void {
    const ground = this.groundBelow(item.x, item.y);
    sfx.play('bonk');
    item.knockDown(ground, () => sfx.play('thud'));
    this.hooks.cheer('Got it!', item.x, item.y - 30);
    this.boyCheers();
  }

  /** The top of the first solid thing below a point. */
  private groundBelow(x: number, y: number): number {
    let best = this.level.definition.height;
    for (const s of this.level.solids) {
      const b = (s as Phaser.GameObjects.GameObject & { body: Phaser.Physics.Arcade.StaticBody | null }).body;
      if (!b || !b.enable || !b.checkCollision.up) continue;
      if (x >= b.left && x <= b.right && b.top >= y && b.top < best) best = b.top;
    }
    return best;
  }

  private updatePrompt(active: Character, dt: number): void {
    if (active !== this.boy || this.boy.climb.climbing) {
      this.prompt.hide();
      return;
    }
    const action = this.boyAction(active);
    let button = '{use}';
    let word = action ? BOY_ACTION_WORDS[action.kind] : undefined;
    // "Sit!" works anywhere near her, but is only suggested where it helps: in the basket.
    if (action?.kind === 'sit' && !this.parts.lifts.some((l) => l.holds(this.melody.body))) word = undefined;
    // At a ladder, climbing is what you'll want (unless there's a gate or lever right there).
    const tool = action?.kind === 'pull' || action?.kind === 'open';
    if (!tool && this.boy.climb.ladderNear(this.boy)) {
      button = '{climb}';
      word = 'Climb';
    }
    if (!word) {
      this.prompt.hide();
      return;
    }
    this.prompt.show(fillPrompts(button, this.hooks.device()), word, this.boy.x, this.boy.body.top - 18, dt);
  }

  /** "Only the boy can..." - when Melody's trying something only he can do. */
  private updateHints(dt: number, active: Character, intent: CharacterIntent): void {
    this.hintTimer = Math.max(0, this.hintTimer - dt);
    if (active !== this.melody || this.hintTimer > 0) return;
    const b = this.melody.body;
    let hint: string | undefined;
    if (intent.moveX !== 0 && this.parts.gates.some((g) => g.blocks(b))) {
      hint = 'Only the boy can open gates!\nSwap with {switch}';
    } else if (intent.moveY < -0.5 && ladderToGrab(this.parts.ladders, b.center.x, b.bottom, this.melody.onGround, -1, CLIMB.grabDistance)) {
      hint = "Dogs can't climb ladders!";
    }
    if (!hint) return;
    this.hintTimer = TEAMWORK.hintEverySeconds;
    this.hooks.say(fillPrompts(hint, this.hooks.device()), '#ffe066', 18, this.melody);
  }

  debugLine(): string {
    const ball = this.parts.football;
    const ballText = ball ? (ball.holder ? `ball: ${ball.holder}` : `ball ${ball.fetchable ? 'fetch' : 'loose'}`) : '';
    return `teamwork: ${this.stayState.staying ? 'melody sits' : this.fetching ? 'fetching' : 'following'}  ${ballText}`;
  }
}
