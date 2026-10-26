/**
 * Teamwork: the boy's helpful skills and the things he uses (gates, levers,
 * the basket lift, ladders, the football), and how Melody behaves around
 * him. Just numbers: change them, save, and the game reloads.
 *
 * Positions are relative to where the thing is placed in Tiled (its
 * bottom-centre), in screen pixels: x to the right, y up is negative.
 */

/** A garden gate in a tall hedge. Only the boy can open it. */
export const GATE = {
  /** The gate itself: solid until it's opened. */
  door: { x: -15, y: -150, width: 30, height: 150 },
  /** The hedge above the gate: always solid, and too tall to jump over. */
  hedge: { x: -52, y: -300, width: 104, height: 150 },
  /** How close (px) the boy must be to open it. */
  reach: 80,
};

/** A lever on a post. The boy pulls it to work a gate or a lift. */
export const LEVER = {
  /** How close (px) the boy must be to pull it. */
  reach: 64,
};

/** A basket on a rope: a lift between two heights, worked by a lever. */
export const LIFT = {
  /** Width of the basket floor (px). */
  width: 74,
  /** How fast it goes up and down (px/s). */
  speed: 150,
  /** How far above the top stop the pulley wheel is (px). */
  pulleyHeight: 150,
};

/** Ladders: only the boy can climb them. */
export const CLIMB = {
  /** Up/down speed (px/s). */
  speed: 160,
  /** How far from the middle of a ladder (px) he can be and still grab it. */
  grabDistance: 18,
  /** Jumping off a ladder: this fraction of a normal jump. */
  jumpOff: 0.8,
};

/** The football the boy throws (and Melody fetches). */
export const FOOTBALL = {
  radius: 12,
  gravity: 1300,
  /** How bouncy it is (0 = dead, 1 = superball). */
  bounce: 0.55,
  /** How quickly it stops rolling along the ground (px/s²). */
  rollDrag: 300,
  /** A normal throw: forwards and up (px/s)... */
  throwForward: { vx: 360, vy: -820 },
  /** ...and holding up: high in the air. */
  throwUp: { vx: 60, vy: -960 },
  /** How close (px) the ball must pass to something stuck up high to knock it down. */
  knockRadius: 56,
  /** Left lying about with nobody near, it pops back home after this long (s). */
  goHomeAfterSeconds: 15,
};

/** How Melody and the boy work together. */
export const TEAMWORK = {
  /** The boy can tell Melody to sit when she's this close (px). */
  sitRange: 160,
  /** A sitting Melody gets up and follows again when the boy comes back this close... */
  resumeDistance: 150,
  /** ...after having been at least this far away (so "Sit!" right next to her sticks). */
  awayDistance: 240,
  /** Melody gives up chasing the ball after being stuck this long (s). */
  fetchGiveUpSeconds: 3,
  /** She doesn't chase a ball further away than this (px). */
  fetchMaxDistance: 1000,
  /** She hands the ball back when she's this close to the boy (px). */
  giveBallDistance: 80,
  /** "Only the boy can..." hints show at most this often (s). */
  hintEverySeconds: 6,
  /** The boy bends down to pick the ball up only when he's slower than this (px/s); faster, he scoops it up on the move. */
  pickupBendSpeed: 60,
};
