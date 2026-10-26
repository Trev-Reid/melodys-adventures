# Melody's Adventures

A family-friendly 2D side-scrolling platform game starring Melody the dog.
Built with **Phaser 4**, **TypeScript** and **Vite**.

Current build: three levels. **Home & Garden** (the main level, drawn in pixel
art: the house, garden terraces, a trampoline, a treehouse) with 11 bones to
find and puzzles that need Melody and her boy to work together, **Melody's House and Garden** (puzzles that mix Melody's powers) with 22
sausages, and **Melody's Playground** (the test level for trying out powers)
with 29 sausages. Melody's boy follows her around (Tab, or Select on a
controller, swaps who you control), and he can do what she can't: open gates,
pull levers, climb ladders, throw the football and tell her to sit. Plays with the keyboard or a USB
controller (SNES-style pads included). Plus a pixel-art Melody (drawn from photos of her) who
can walk, run, sprint and jump and naps when left alone, a Super Sausage
power-up (SUPER STRENGTH) with crates to push and barriers to smash, a Super
Sniff Treat (SUPER SNIFF) that reveals scent trails and hidden things, barking
and a Super Bark Biscuit (SUPER BARK) that knocks, blows and scares things,
Bark Boost (bark in mid-air) and Bark Break (bark blocks to bits), a HUD
with Melody's portrait, hearts and power-up badges,
simple sound effects, and a debug overlay.

## Changelog

- **0.16** An art pipeline, so the game can be brought up to the concept art
  without breaking anything. Nothing in the game looks or plays differently yet.
  - **The melody-art-director Skill** (`.claude/skills/melody-art-director/`)
    holds the house style for Claude: the style guide, the asset sizes and
    contracts, and the rules for perspective, layering and transparent PNGs. It
    also has the review checklist and the Phaser pixel-art settings. The overview
    and the audit of how the game draws and loads its art are in
    `docs/ART-PIPELINE.md`.
  - **`npm run art:check`** checks every picture: whether it's on the 2×2 pixel
    grid, has hard edges and real transparency (no painted-in checkerboards),
    and stays within its colour budget. It also checks that repeating pictures
    join up, that sprite sheets divide into their frames, that Melody's feet are
    on the ground, and that solid tops line up. It runs in `npm test` too.
  - **Replacement art without code:** save a PNG named after a placeholder's
    key in `src/assets/replacements/` (e.g. `boy.png`, `item-sausage.png`,
    `obstacle-heavyCrate.png`) and the game uses it instead.
  - **Screenshot review:** `?review=garden-house` sets up the same screen,
    pixel for pixel, every time. `npm run review:capture`, `review:compare` and
    `review:approve` photograph the shots and compare them with the concept art
    and with the last approved look. In `npm run dev`, **F9** saves a photo.
  - **`npm run art:palette`** exports the house palette for drawing programs,
    or pulls a palette out of a reference picture (and says how big its art
    pixels are, or that it isn't pixel art).
  - **Checked (25 Oct):** the Skill is updated in `docs/claude-skills/`. Move it
    into `.claude/skills/` once (see the README there) so Claude Code uses it.
    `npm test` no longer fails because of an old picture nothing uses
    (`trampoline_old.png` is just flagged). Review
    photos remember which computer and browser took them, and compare warns when a
    baseline came from another one. `--display 1920x1080,1366x768` photos get a
    crisp/soft verdict. The Phaser 4 pixel-art settings were tested and are ready
    for the first screen pass. The style guide marks what still waits for the
    concept art.
  - **New garden art (25 Oct):** the first delivery from ChatGPT as art
    director, the "garden-overhaul" pack. A cream stone cottage, an oak-tree
    garden with fields and a lake behind it, a pixel-art trampoline, round
    forest-and-gold HUD badges, a boy in a teal hoodie, and real art for the
    crate, barrier, fence and blocks (56 pictures). Every size, solid surface
    and animation is the same as before, so nothing plays differently. The
    style guide is now v2 (confirmed). Trevor's painted trampoline is kept in
    `art/source/pre-garden-overhaul-2026-10-25/`. Still to do: the HUD panel
    and quieter signs from the same brief.
  - **The boy moves properly (26 Oct):** he used to have two pictures for
    everything. Now he walks, runs, jumps, falls and lands, climbs ladders seen
    from behind (hand over hand, in time with the rungs), bends down to pick
    the ball up, carries it in both hands, throws it (high when you hold up),
    takes it back from Melody, pulls levers, pushes gates, whistles for Melody,
    points for "Sit!", cheers at a goal, and fidgets when you leave him
    standing. His speed, jump, body and throw are exactly as before. The art
    director then redrew every frame from the brief
    (`art/briefs/boy-sprite-sheet.md`): swept hair, a textured hoodie, and arms
    that open out when he cheers. See every move at
    `?gallery=boy` (C switches to Melody, S to carrying the ball).
- **0.15** Teamwork: the boy gets his own skills, and Home & Garden gets
  puzzles that need both of them.
  - **The boy's action button** is Melody's bark button (B or E on the
    keyboard, A on a controller): one button, and each of them does their own
    thing. A little label over his head says what it'll do right now:
    **Open** a gate, **Pull** a lever, **Throw** the ball, **Sit!** (tell
    Melody to stay) or **Come, Melody!** (call her back).
  - **Climbing:** the boy climbs ladders (↑ ↓, or the D-pad). Melody can't.
  - **The football:** the boy picks it up and throws it (hold ↑ to throw it
    high). It knocks things out of trees, and Melody fetches it back. Get it in
    the goal for a GOAL!
  - **Melody stays put** when the boy tells her to sit, or when you swap away
    while she's in the basket. She gets up when he comes back for her or calls
    her, and if she waits long enough she nods off.
  - **Home & Garden puzzles:** a garden door in a tall hedge that only the boy
    can open; the treehouse step is gone, so the boy climbs the ladder and
    hauls Melody up in a basket with the lever, where a Super Bark Biscuit and
    a pile of leaves hiding a bone are waiting (the biscuit is the only one in
    the level, and the back-lawn leaves need it too); and a bone stuck up the
    big tree at the end that only the football can knock down. 11 bones now.
  - Whoever's following no longer pops into the treehouse when left behind
    (**team areas**): they wait instead of jumping at walls, until you bring
    them up.
  - Barks now reach whatever Melody is standing on, whichever way she faces.
    A railing stops anyone walking off the treehouse deck by accident.
  - Tiled: a new `interactables` layer (`gate`, `lever`, `lift`, `ladder`,
    `football`, `teamArea`); collectibles can be `stuck` (only the football
    knocks them down); sign text can use `{use}` and `{climb}`.
- **0.14** USB controllers and a living, sunlit garden.
  - **Controllers:** plug in a USB pad (SNES-style ones included) and play,
    Mario style: D-pad moves, **B** jumps, hold **Y** (or L/R) to sprint, **A**
    (or X) barks, **Start** pauses, **Select** swaps Melody and the boy. Retrolink
    and Buffalo SNES pads and anything the browser knows ("standard" pads, Xbox,
    8BitDo) work straight away; for any other pad, **Start > Set up controller**
    lights up each button on a drawn SNES pad and remembers your choices.
    A message pops up when a controller is plugged in.
  - **Pause menu** (Start, Esc or P): keep playing, start again, change level,
    sound on/off, controller setup.
  - **Signs speak your language:** `{jump}`, `{bark}`, `{sprint}`, `{switch}`...
    in sign text show "SPACE" at the keyboard and "B" with a controller.
  - **Richer world and lighting** (Home & Garden): sunlit sky with a warm glow,
    sunbeams and drifting pollen, Irish countryside in the distance, fuller
    trees with leafy clumps, a proper dry-stone wall, lush grass with daisies,
    rounded grass edges, shade under ledges, soft shadows under Melody, the boy
    and the scenery, and a gentle vignette.
  - **A living garden:** tree canopies sway, flowers and long grass wave,
    washing flaps on the line, leaves drift down, butterflies flutter (and dart
    away from Melody), robins hop and peck (and fly off if she runs at them or
    barks), the squirrel on the treehouse flicks its tail and scampers off, and
    birds cross the sky. New decorations: `tallGrass`, `washingLine`,
    `birdBath`, `gnome`, `robin`, `butterflies`.
  - The boy is back in the game (a later update had accidentally unplugged him).
- **0.13** HOME & GARDEN. A new main level that looks like the mockup:
  Melody's house and drive, flower beds, garden terraces with a stump, a
  trampoline (hold jump for a bigger bounce!), a scent trail to a drain pipe,
  the crate up to the back lawn, a treehouse with a squirrel, the egg chair,
  a leaf pile and some cracked blocks. Collect 10 bones. All the art is drawn
  pixel art (backgrounds that scroll at different speeds, grass, stone walls,
  gravel, props), made by `tools/art/make_garden.py`. New HUD: Melody's
  portrait, three hearts (display only for now), the bone counter, and badges
  for Super Sprint/Strength/Sniff/Bark that light up with a countdown ring.
  Levels can now have a `theme`, styled platforms and **decorations** (Tiled
  layer). The Playground is still there: `?level=melodys-playground`.
- **0.12** The boy! He follows Melody everywhere, and **Tab** (or C)
  swaps who you control; the other one follows. He's a bit slower than Melody
  with a slightly smaller jump, collects sausages and toys (power-ups are dog
  treats, so only Melody eats those), and can't push or smash things yet. If
  the follower gets stuck (Melody boosted somewhere he can't reach) or left far
  behind, they pop up next to the leader. Follow tuning is in
  `config/follow.ts`, his movement in `config/movement.ts` (`BOY_MOVEMENT`).
  Placeholder art; his name is `displayName` in `characters/boy/Boy.ts`.
- **0.11** New level: **Melody's House and Garden**
  (`?level=house-and-garden`). Puzzles that mix powers: sniff out the
  sausage on top of the fridge and BARK BOOST up to it; scare the cat off the
  bookcase and SUPER BOOST over it; smash the stuck back door; break into the
  shed and sniff out what's hidden inside (Squirrel!); follow your nose to
  the right leaf pile in the vegetable patch; SUPER CHARGE through the fences;
  then push the crate to the garden wall and SUPER BOOST over it. 22 sausages.
  `tests/houseAndGarden.test.ts` checks that each puzzle needs the powers it's
  meant to.
- **0.10** Daniel's ideas: BARK BOOST and BARK BREAK. Bark in mid-air and
  Melody pops upwards (once per jump; higher with Super Bark), so she can reach
  ledges a jump can't. Bark at blocks to smash them: cracked sandy blocks
  crumble at any bark, grey stone blocks need a Super Bark. A bark breaks every
  block the sound reaches, so standing back breaks more. New zone at the end of
  the Playground: a boost ledge, Daniel's cracked wall, a stone wall with a
  biscuit before it, and a sausage only a super boost can reach.
- **0.9** SUPER BARK. Melody can bark any time (B). A Super Bark Biscuit
  gives 15 seconds of a huge bark: blue sound waves, a screen shake, and
  things in front of her react. The new Bark Zone (after the Sniff Zone) has
  a ball stuck in a tree (bark it down), a pile of leaves hiding a sausage
  (bark them away) and a cat sitting on a sausage ledge, blocking the way
  (bark and it runs off). An ordinary woof near them says "Not loud enough!".
  Bark targets are Tiled objects (`barkTargets` layer). Drop a recording of
  Melody's real bark in `src/assets/audio/bark.mp3` and the game uses it.
- **0.8** Levels are now made in the **Tiled** map editor: the Playground is
  `src/levels/maps/melodys-playground.tmj`. Any map saved there becomes a
  playable level (`?level=<name>`). Broken maps show a clear list of what's
  wrong instead of a blank screen. GitHub setup: automatic test + publish to
  GitHub Pages on every push (see `docs/GITHUB-SETUP.md`).
- **0.7** SUPER SNIFF. A Super Sniff Treat gives 15 seconds of Melody's nose:
  she stops for a big sniff, rings ripple out, the world dims, and hidden
  scent trails appear with little icons drifting along them towards what they
  lead to. Hidden objects near her are revealed and stay found. The new Sniff
  Zone (under the staircase) has a squirrel trail leading to the hidden
  Squirrel toy, a sausage trail to a hidden sausage, and a cat trail that's a
  red herring. Scent trails, hidden objects and points of interest are
  reusable level data. Super Sniff stacks with Super Strength.
- **0.6** SUPER STRENGTH now makes Melody big and muscly instead of red: she
  swaps to a buff sprite sheet (big chest, bulging legs, determined eyebrow)
  and grows 30% (hitbox too), growing from her feet. In the last 3 seconds she
  flickers between buff and normal, then shrinks back. Gold sparkles replace
  the red glow. Power-ups can now set an `appearance` (skin + scale). The
  animation gallery has an S key to switch skins.
- **0.5** Power-up system and SUPER STRENGTH. A glowing Super Sausage gives
  Melody 15 seconds of strength (aura, countdown bar, warning flash, power-down
  sound). A new Strength Zone at the end of the Playground has a heavy crate
  to push over to a high ledge, a barrier to break into the SECRET SAUSAGE
  STASH, and a row of fences. Strength + sprint = SUPER CHARGE, which smashes
  through them without slowing down.
- **0.4** Melody redrawn in the style of the character sheet: bigger
  expressive head, eye highlight, tongue, perky ears, short tail, shading.
  17 animations: idle, walk, run, sprint, jump, air, fall, land, sniff,
  alert, happy, scared, sit, sit_idle, lie_down, sleep, wake. Walk, run and
  sprint are chosen by speed. Leave her alone and she sits, then lies down and
  sleeps (with z's). Press anything and she wakes up with a stretch. She
  celebrates when the level is complete. Animation gallery at `/?gallery`.
- **0.3** Pixel-art Melody sprite sheet based on photos of the real Melody
  (white lurcher, tan saddle, black collar) with idle, gallop, jump, fall and
  landing animations. The gallop speeds up with her speed, so sprinting looks
  faster. The sprite sheet is generated by `tools/sprites/make_melody.py`.
- **0.2** Sausages to collect with a counter, timer and a "you found them all"
  celebration. Melody's sprint (hold Shift) with a stamina bar and speed
  trail. A secret ledge reachable only by sprint-jumping. Hint signs. Sound
  effects (M to mute). R restarts the level after finishing.
- **0.1** Foundation: movement, jumping, camera, keyboard input, debug overlay.

## Play online

Once set up (see `docs/GITHUB-SETUP.md`), the latest version is always at
**https://trev-reid.github.io/melodys-adventures/** (the Playground:
add `?level=melodys-playground` to the address). Every `git push`
tests, builds and republishes it automatically.

## Getting started

Requires [Node.js](https://nodejs.org/) 20 or newer.

```bash
npm install      # first time only
npm run dev      # opens the game at http://localhost:5173 and live-reloads on save
```

Other commands:

| Command             | What it does                                         |
| ------------------- | ---------------------------------------------------- |
| `npm run build`     | Type-checks and builds a static site into `dist/`    |
| `npm run preview`   | Serves the built `dist/` folder locally              |
| `npm test`          | Runs the unit tests (movement and input logic)       |
| `npm run typecheck` | Type-checks only                                     |
| `npm run tiled:project` | Regenerates the Tiled project file (after adding new object types) |
| `npm run art:check` | Checks every picture against the art rules (also part of `npm test`) |
| `npm run art:palette` | Exports the house palette for drawing programs (`art/palettes/`) |
| `npm run review:capture` | Photographs the review shots (needs `npm i -D playwright` once) |
| `npm run review:compare` | Compares them with the concept art and the last approved photos |
| `npm run review:approve -- <shot>` | Makes the latest photo of a shot the approved one |

## Controls

| Action         | Keys                  |
| -------------- | --------------------- |
| Move           | ← → or A D            |
| Jump           | Space, ↑ or W. Hold for a higher jump, tap for a small hop |
| Sprint         | Hold Shift (or X) while moving |
| Bark           | B (in mid-air: BARK BOOST) |
| The boy's action | B or E: open, pull, throw, "Sit!", "Come!" |
| Climb a ladder (the boy) | ↑ ↓ (or W S) |
| Throw high (the boy) | Hold ↑ and press B |
| Respawn / play again | R               |
| Mute sounds    | M                     |
| Swap Melody / the boy | Tab or C       |
| Pause menu     | Esc or P              |
| Toggle debug   | F3 or \` (backtick)   |

**With a USB controller** (SNES layout, like Super Mario World):

| Action                | Button                     |
| --------------------- | -------------------------- |
| Move (and menus)      | D-pad (or left stick)      |
| Jump                  | B (hold for higher)        |
| Sprint                | Hold Y (or L / R)          |
| Bark                  | A (or X); in mid-air: BARK BOOST |
| The boy's action      | A: open, pull, throw, "Sit!", "Come!" (hold ↑ to throw high) |
| Climb a ladder (the boy) | D-pad ↑ ↓               |
| Pause menu            | Start                      |
| Swap Melody / the boy | Select                     |

The browser only shows a controller to the game after one of its buttons has
been pressed, so press any button once if it doesn't respond at first. If the
buttons are muddled (some pads number them differently), open the pause menu
and choose **Set up controller**: press each button as it lights up and it's
remembered for that controller (in this browser). **Use standard controller
buttons** in the same menu undoes it. Ready-made layouts live in
`core/input/gamepad/gamepadMapping.ts`.

**Super Sniff:** eat the purple Super Sniff Treat (near the start, under the
staircase). For 15 seconds you can see scent trails and sniff out hidden
things. Which trail leads to Squirrel? That's for you to work out.

**Super Bark:** eat the blue Super Bark Biscuit (by the "Press B to bark!"
sign). For 15 seconds her bark is huge: face the tree, the leaves or the cat
and press B.

**Bark Boost:** jump, then press B near the top of the jump for an extra
pop upwards. Once per jump. With Super Bark it's even bigger.

**Bark Break:** bark at cracked blocks to smash them. Stone blocks need a
Super Bark. Step back a little to break more of a wall at once.

**Super Strength:** eat a glowing Super Sausage. For 15 seconds Melody can
shove heavy crates (just push against them) and break barriers (take a
run-up or jump into them). Hold Shift while strong for a SUPER CHARGE.

**Teamwork (the boy):** swap to him (Tab / Select) for the things Melody
can't do. Walk up to a gate or lever and press the action button (a label
over his head says what it'll do). Push up at a ladder to climb it. Walk over
the football to pick it up, then press the action button to throw it (hold up
to throw it high); Melody runs after it and brings it back. Near Melody, the
action button tells her to **Sit!**; press it again (from anywhere) to call
her. Melody can't climb, so to get her up to the treehouse: put her in the
basket, swap to the boy (she'll wait there), climb the ladder and pull the
lever. Tuning (reach, climbing speed, throws, how far she'll fetch) is in
`config/teamwork.ts`.

Leave Melody alone for 5 seconds and she sits down; after 12 seconds she
naps. Timings are in `config/abilities.ts` (`MELODY_REST`).

The debug overlay shows Melody's position, velocity, whether she's on the
ground, the current input and FPS. It also draws physics bodies. It's on by
default in `npm run dev`.

## Tuning how Melody moves

All movement values live in **`src/config/movement.ts`**: speed,
acceleration, braking, turn speed, air control, jump velocity, gravity, fall
gravity, max fall speed, variable jump height, coyote time and jump
buffering. Each value has a comment explaining it. Change a number, save, and
the game reloads.

For live experiments without reloading, open the browser console (F12) while
running `npm run dev`:

```js
tune.maxSpeed = 420
tune.jumpVelocity = 700
tune.airControl = 1

sprint.speedMultiplier = 2
sprint.staminaSeconds = Infinity   // unlimited sprint
```

Once something feels right, copy the value back into `movement.ts` or
`abilities.ts`.

Other tuning files: `config/abilities.ts` (sprint speed and stamina),
`config/audio.ts` (volumes), `config/camera.ts` (smoothing, dead zone, zoom),
`config/controls.ts` (key bindings), `config/display.ts` (resolution),
`config/debug.ts`.

## Editing levels in Tiled

Levels are made in [Tiled](https://www.mapeditor.org/) (free).

1. Open **`melodys-adventures.tiled-project`** in Tiled (File > Open File or
   Project). This teaches Tiled our object types, colours and settings.
2. Open a map from `src/levels/maps/` (the Playground is
   `melodys-playground.tmj`).
3. Edit, then **save**. With `npm run dev` running, the game reloads with
   your changes.

**How a level is organised.** Each layer holds one kind of thing. Every object
has a **Class** that says exactly what it is, and properties for the details:

| Layer | Draw with | Classes | Properties |
| --- | --- | --- | --- |
| `platforms` | Rectangle | `ground` (solid), `platform` (thin) | `oneWay`: jump up through it. `style`: `grass`, `stone` (grassy stone wall), `gravel`, `wood`, `slab`, `classic` (Playground look) |
| `obstacles` | Rectangle (top-left corner counts; size comes from the type) | `heavyCrate`, `woodenBarrier`, `fence`, `crackedBlock` (any bark breaks it), `stoneBlock` (Super Bark breaks it) | |
| `collectibles` | Point (centre of the item) | `bone`, `sausage`, `superSausage`, `sniffTreat`, `squirrelToy`, `barkBiscuit`, `ball` | `hidden`, `revealRadius`, `revealedBy` (`superSniff`, or `event` = only a bark target reveals it), `stuck` (up a tree: only the football knocks it down). Name = id |
| `barkTargets` | Point (where it stands, on the ground) | `ballInTree`, `leafPile`, `cat` | `reveals` (name of the hidden thing it uncovers), `requiresSuperBark`, `height` (tree). Name = id |
| `signs` | Point (bottom of the post) | `sign` | `text` |
| `scentTrails` | Polyline, drawn **from the start to where it leads** | `scentTrail` | `scentType`, `targetId` (name of what it leads to), `visibleNormally`... Name = id |
| `pointsOfInterest` | Point | `pointOfInterest` | `text`, `marker`, `hidden`. Name = id |
| `interactables` | Point (**bottom-centre**) for `gate`, `lever`, `lift`, `football`; Rectangle for `ladder`, `teamArea` | `gate` (garden door in a tall hedge: only the boy opens it), `lever` (the boy pulls it), `lift` (a basket on a rope), `ladder` (only the boy climbs it; drawn for you), `football`, `teamArea` (somewhere a left-behind character can't just pop into) | gate: `startsOpen`. lever: `target` (name of the gate or lift it works). lift: `travel` (how far up it goes, px), `startsUp`; Name = id (needed so a lever can work it). A lift's point is where its floor is at the bottom |
| `decorations` | Point (**bottom-centre**: where it stands) | `house`, `trampoline` (bouncy!), `stump` (solid), `treehouse` (deck you can stand on, and a ladder the boy can climb), `bigTree`, `goal` (throw the football in!), `football` (just a picture: use the interactable to play with it), `eggChair`, `potPurple`, `potPink`, `bush`, `bushHydrangea`, `bushBerries`, `planter`, `drain`, `flowers`, `tallGrass`, `washingLine`, `birdBath`, `gnome`, `fern` (foreground); creatures: `robin`, `butterflies`, `squirrel` | `flipX`, `layer` (`back`/`front`), `scale` |
| `markers` | Point | `spawn` (exactly one: where Melody starts, at her feet) | |

The map's own properties (Map > Map Properties) hold `name`, `skyColor`,
`showDistanceMarkers` and `theme` (`garden` gives the drawn sky, hills,
trees and fence, and grass platforms by default; `playground` the original
look). The map size is the world size (the grid is 8px).

**Making a new level:** in Tiled, open Home & Garden (or the Playground) and **File > Save As**
into `src/levels/maps/` with a new name, e.g. `leos-level.tmj`. Choose the
**JSON map files (*.tmj)** format. Play it at
http://localhost:5173/?level=leos-level. No code changes are needed.

**Sign text** can show the right button for whatever the player is using:
write `{jump}`, `{bark}`, `{use}` (the boy's action), `{climb}`, `{sprint}`, `{pause}`, `{move}` or `{switch}`, e.g.
"Hold {jump} to bounce higher!" reads "Hold SPACE..." at the keyboard and
"Hold B..." with a controller.

**If something's wrong** (an object with no Class, a sign with no text, a
scent trail leading to a name that doesn't exist...), the game shows a list
of the problems and where they are instead of starting. `npm test` checks
every map too.

Note: `tests/levelDesign.test.ts` has checks specific to the Playground's
layout (e.g. the secret ledge needs a sprint-jump). If you rework the
Playground and those tests fail, that's the tests doing their job: either
restore the layout or update the test.

## Power-ups and strength puzzles

Power-ups are **status effects**: timed states on a character that grant
**capabilities**. The Super Sausage doesn't contain any special code. It's a
collectible whose data says `effect: 'SUPER_STRENGTH'`, and SUPER_STRENGTH is
data that says "grants `strength` for 15 seconds". Crates and barriers only
ask `character.can('strength')`.

| To change... | Edit |
| --- | --- |
| How long a power-up lasts, what it grants, its colour | `config/powerUps.ts` (`EFFECTS`) |
| How she looks while powered up (`appearance: { skin: 'buff', scale: 1.3 }`) | `config/powerUps.ts` (`EFFECTS`) |
| Combos (strength + sprint = SUPER CHARGE) | `config/powerUps.ts` (`COMBOS`) |
| Crate push speed (`pushForce`), hits to break (`hitsToBreak`), run-up speed (`minImpactSpeed`), `requiresStrength` | `config/obstacles.ts` |
| What a pick-up does, whether it respawns | `entities/collectibles/collectibleTypes.ts` |
| Where things are in the level | Tiled: `src/levels/maps/melodys-playground.tmj` |

**Adding a new power-up** (e.g. MEGA_SNIFF): add it to `EffectType` and
`EFFECTS` in `config/powerUps.ts` with the capability it grants, add a
collectible type that applies it, and make whatever it unlocks check
`character.can('<capability>')`. Effects can also change movement with
`movement: { maxSpeed, acceleration }` multipliers (that's how a SUPER_SPEED
would work). Any number of effects can be active at once.

**Scent is part of the world.** Levels can contain:

- `scentTrails`: `{ id, scentType, targetId, points, visibleNormally, visibleWithSuperSniff, color, active }`.
  Points run from where the trail starts to where it leads.
- `hidden: { requiresSuperSniff, revealRadius }` on any collectible (hidden
  until sniffed out, then stays found).
- `pointsOfInterest`: discoverable spots with a marker and a message (the
  cat's dead end), which can also be hidden.

Scent types (squirrel, sausage, cat) and their colours/icons are in
`config/scents.ts`, as is `SCENT_TRAIL_STYLE`: how trails are drawn is
deliberately easy to change (dots, drifting icons, speed, wobble) while
play-testing. The rules (what's visible, what gets revealed) are pure
functions in `gameplay/scent/scentRules.ts`.

**Barking.** Bark (B) is an ability every Melody has; SUPER_BARK grants the
`superBark` capability, which makes it bigger (`MELODY_BARK` in
`config/abilities.ts`: range, cone, cooldown). Things that react to barks are
**bark targets** (`config/barkTargets.ts`): each kind says how it reacts
(`fall`, `scatter`, `flee`) and whether it needs a Super Bark. A target can
`reveal` a hidden collectible whose `revealedBy` is `event`. The rules (is it
in range and in front of her, is it loud enough) are pure functions in
`gameplay/bark/barkRules.ts`.

**Bark Boost** strength is `boost` in `MELODY_BARK` (`speed`, `superSpeed`;
her jump is 620). **Bark Break**: any obstacle type with
`barkBreakable: { requiresSuperBark }` in `config/obstacles.ts` can be barked to
bits; `tooWeakText` is what she says when a bark isn't loud enough.

**Real sounds.** Put audio files in `src/assets/audio/` named after the sound
(`bark.mp3`, `meow.mp3`, `collect.wav`...) and they replace the synthesized
ones. `bark` is also used, deeper and louder, for the Super Bark.

**Adding a new obstacle** (e.g. a heavier boulder): add an entry to
`OBSTACLE_TYPES` in `config/obstacles.ts` and place it in a level's
`obstacles` list.

## Artwork

Melody has two sprite sheets with identical layouts: `melody.png` (normal)
and `melody_buff.png` (SUPER STRENGTH), both in `public/assets/sprites/`. Each is 55 frames of
96×76 pixels (pixel art drawn at 48×38 and doubled), with a 4px gap between
frames so neighbours never bleed into each other. Its frame size and
animation list are in `src/characters/melody/melodySheet.json`, which the game
reads directly.

**Reviewing the art:** open http://localhost:5173/?gallery to see every
animation playing side by side (click one to flip it, press S to switch
between normal and buff). There are also labelled contact sheets in
`tools/sprites/` (`melody_preview.png`, `melody_buff_preview.png`).

**Changing the art:** the sheet, the JSON and the preview are generated by
`tools/sprites/make_melody.py`. It draws Melody from a pose "rig", so every
frame is the same dog. Colours, proportions, each animation's poses and
speed, and the builds (`normal`, `buff`) are plain values in that script. A
new build (say, a soaking-wet Melody) is a new entry in `BUILDS`. Edit and run
`python tools/sprites/make_melody.py` (needs `pip install pillow`).

**Replacing it with hand-drawn art:** draw frames in Piskel or Aseprite (or
commission them) at the same frame size, export a PNG sprite sheet over
`melody.png`, and update the frame numbers in `melodySheet.json`. Nothing else
needs to change. The "Turn Around" and front-view frames from the character
sheet aren't included; the rig only draws side-on and the game flips her
instantly.

### Garden art

Everything in `public/assets/garden/` (backgrounds, ground tiles, props, the
bone) and `public/assets/ui/` (portrait, hearts, badges) is drawn by
`tools/art/make_garden.py` (needs `pip install pillow numpy`). Each piece is
one function, e.g. `trampoline()`; change it and run the script.
`tools/art/garden_preview.png` shows everything at once. Pictures you've
replaced with your own are left alone (the script remembers what it drew in
`tools/art/generated.json`); run it with `--force` to redraw everything.

Animated pictures (swaying flowers, the washing line, the robin...) are strips
of frames side by side; their frame sizes and speeds are written to
`src/assets/gardenSheets.json`. Trees are two pictures: the trunk, and the
leaves (`big-tree-leaves`, `treehouse-leaves`), which the game sways gently.
Two-state pictures are strips of two frames too: the garden door (`gate`:
shut, open) and the `lever` (off, on). The hedge it sits in is `hedge-arch`;
the lift is `basket` (its front, drawn over whoever's in it), `basket-back`
and `pulley` (its wheel must stay 60px from the left and 24px from the top -
see `entities/teamwork/Lift.ts`).

**The mood** - sunbeams, pollen, birds in the sky, the vignette, how far the
background layers sit - is `GARDEN_LIGHT` and `GARDEN_LAYERS` in
`src/levels/GardenBackground.ts`. The wildlife (how close Melody can get
before robins fly off, how often leaves fall, butterfly colours) is in
`src/config/ambient.ts`. If the garden ever runs slowly on an older computer,
turn `sunbeams`, `frontBeams`, `motesPerSecond` and `vignette` down to 0.

### Art pipeline: the style, the checks and the review

How the game's art is kept consistent, and checked against the concept art, is
in **`docs/ART-PIPELINE.md`**. The house style itself lives in the
melody-art-director Skill (`.claude/skills/melody-art-director/references/`),
starting with `style-guide.md`. In short:

- Draw at half size and export at 200% (one art pixel is 2×2 screen pixels).
  Use hard edges, real transparency, the v2 material ramps (in the style guide),
  selective dark edges, and warm light from the upper left. (Style v2, confirmed
  on 25 Oct 2026 with the art director's first delivery.)
- `npm run art:check` before playing, and `npm run review:capture` then
  `npm run review:compare` to see what changed on screen.
- Code-drawn placeholders (treats, the cat) are replaced by saving a PNG named
  after the placeholder in `src/assets/replacements/`, as the crate, the
  barrier, the fence and the blocks already are. The sizes are in that
  folder's README. Melody and the boy are sprite sheets in
  `public/assets/sprites/` instead.
- Concept art goes in `art/reference/concept/`, listed in
  `art/reference/README.md`. A picture of what a review shot should look like
  goes in `art/reference/targets/<shot>.png`. When the concept art arrives, ask
  Claude to calibrate the style guide to it first.

**Using art from elsewhere (ChatGPT, a drawing app...):** save a PNG with a
transparent background over the file of the same name, then run
`npm run art:check` (it spots soft edges, painted-in backgrounds and off-grid
pixels). Objects should be
side-on (not looking down), one object per picture, roughly the size of the
one it replaces (e.g. house 600×344, treehouse 440×560, trampoline 248×114,
bone 36×20). The bottom-centre of the picture is where it stands. If a
replacement has solid parts (trampoline mat, stump top, treehouse deck), check
those still line up: `solids` in `src/config/decorations.ts`. Ground tiles
and background strips must repeat seamlessly side by side.

**A new decoration:** draw it (or add the PNG to `public/assets/garden/`), add
its name to `GARDEN_IMAGES` in `src/assets/artAssets.ts` and an entry to
`DECORATION_TYPES` in `src/config/decorations.ts`, then run
`npm run tiled:project` so Tiled knows about it.

## Project structure

```
src/
  main.ts                    Phaser game config: scaling, physics, scene list
  config/                    Tunable values only, no logic
    movement.ts              Movement feel (per character: Melody, the boy)
    follow.ts                How the character you are not controlling follows
    abilities.ts             Ability tuning (sprint, bark, napping)
    audio.ts  camera.ts  controls.ts  display.ts  debug.ts
    powerUps.ts              Power-ups/status effects, capabilities, combos
    obstacles.ts             Obstacle types (crate, barrier, fence, bark blocks)
    scents.ts                Scent types + how trails are drawn
    barkTargets.ts           Things that react to barks
    decorations.ts           Scenery types (house, trampoline...): solid parts, swaying leaves, creatures
    ambient.ts               Wildlife tuning (scare distances, leaf fall, butterfly colours)
    teamwork.ts              Gates, levers, lifts, ladders, the football; sit/fetch distances
  core/audio/Sfx.ts          Synthesized sound effects (swap for real sounds later)
  core/input/                Input abstraction
    actions.ts               The action vocabulary (moveX, jump, ...)
    InputSource.ts           Interface every device implements
    KeyboardInputSource.ts   Keyboard -> actions (uses config/controls.ts)
    InputManager.ts          Merges sources, detects presses and releases
    createPlayerInput.ts     Keyboard + controllers, ready to use
    buttonLabels.ts          Button names for signs ({jump} -> SPACE or B)
    gamepad/                 USB controllers: mappings (pure, tested), input source, saved setups
  movement/
    PlatformerMovement.ts    Engine-agnostic run/jump logic driven by a MovementConfig
  characters/
    animationState.ts        Picks idle/run/jump/fall/land from physics state
    Character.ts             Base class: physics body + movement + abilities, driven by an intent
    abilities/Ability.ts     Ability interface + CharacterIntent
    abilities/sprint/        Sprint: stamina logic (pure) + Phaser visuals
    abilities/bark/          Bark: emits bark events (normal or super)
    abilities/climb/         Climbing ladders (the boy)
    melody/Melody.ts         Melody, her abilities and animation
    boy/Boy.ts               The boy (placeholder art): climbs, holds the football
    follow/FollowBrain.ts    Follow-the-leader logic for whoever you're not controlling
    melody/melodyAnimations.ts  Registers animations from melodySheet.json
    melody/melodySheet.json  Frame size + animation list (generated)
  entities/collectibles/     Pick-ups: Collectible + collectibleTypes registry
  entities/Sign.ts           Hint signs (show keyboard or controller buttons)
  entities/obstacles/        Obstacle: pushable/breakable things (placeholder art)
  gameplay/LevelProgress.ts  Items collected, timer, level complete
  gameplay/effects/          StatusEffects: timed effects + capability/combo resolution
  gameplay/interactions/     strengthRules (pure) + ObstacleSystem (push/break/hints)
  gameplay/scent/            scentRules (pure), SniffSystem, Detectable interface
  gameplay/bark/             barkRules (pure), BarkSystem (waves, reactions, hints)
  gameplay/ambient/          AmbientLife (butterflies, robins, squirrel, falling leaves), GroundShadows
  gameplay/teamwork/         teamworkRules (pure), TeamworkSystem (the boy's action, follow/sit/fetch, ball), ActionPrompt
  entities/teamwork/         Gate, Lever, Lift (the basket), Football
  levels/GardenBackground.ts Sky, clouds and scrolling scenery for garden levels
  entities/bark/             BarkTarget: ball in tree, leaf pile, cat (placeholder art)
  entities/scent/            ScentTrail (renderer), PointOfInterest
  characters/effects/        EffectAura: placeholder glow for active power-ups
  levels/
    LevelDefinition.ts       Level data format
    LevelBuilder.ts          Turns level data into platforms, background, etc.
    maps/*.tmj               The levels, made in Tiled (one file per level)
    tiled/                   Tiled loader (with friendly errors), exporter, project file builder
    index.ts                 Finds every map and loads it
  scenes/
    BootScene.ts             Loads/generates assets, starts the first level
    LevelScene.ts            Generic gameplay scene: plays any level
    HudScene.ts              Portrait, hearts, counter, power badges, celebration, messages
    PauseScene.ts            Pause menu (Start / Esc)
    ControllerSetupScene.ts  Press-each-button controller setup
    AnimationGalleryScene.ts Art review page (/?gallery)
    DebugScene.ts            Overlay drawn on top of the level
  assets/
    keys.ts                  Texture key names
    placeholders.ts          Generated placeholder art (replace with real art later)
    placeholderSpecs.ts      What real art must be like to replace each placeholder
    replacements/            Drop-in PNGs that replace placeholders (named after the key)
    audio/                   Optional real sound recordings (bark.mp3...)
  review/                    Screenshot review mode (?review=<shot>) and shots.json
public/assets/sprites/       Sprite sheets (melody.png)
tools/sprites/               Sprite generator script + preview image
tools/art/                   Garden art generator, plus art:check and art:palette
tools/review/                review:capture, review:compare, review:approve
tools/levels/                Tiled helpers (npm run tiled:project)
art/                         Not shipped: concept art, targets, palettes, review baselines and log
docs/ART-PIPELINE.md         The art pipeline: audit, style, checks, review
.claude/skills/melody-art-director/   Claude's art-director Skill (style guide and rules)
docs/GITHUB-SETUP.md         One-time GitHub + publishing setup
.github/workflows/           Automatic test + publish on every push
melodys-adventures.tiled-project   Open this in Tiled
tests/                       Vitest unit tests, including level-design checks
```

### Design choices

- **Input is decoupled from characters.** Devices produce *actions*.
  `LevelScene` turns actions into a `MovementIntent` and passes it to the
  active character. Characters never touch the keyboard. Adding a gamepad
  means writing an `InputSource` and calling `addSource()` (that's how USB
  controllers work: `core/input/gamepad/`). Swapping between Melody and the
  boy just hands the player's intent to the other character; the one you're
  not controlling gets its intent from a `FollowBrain` (`characters/follow/`),
  plain unit-tested logic that steers by the same rules as the keyboard.
- **Movement logic is separate from Phaser.** `PlatformerMovement` is plain
  TypeScript that takes a config, the body state and an intent, and returns
  velocities. That keeps it unit-testable, and each character (or a power-up)
  just uses a different config.
- **Abilities are plug-ins.** Each ability (sprint so far) runs before
  movement every frame and adjusts `movement.modifiers` (speed and acceleration
  multipliers). Sniffing, sausage power-ups or getting scared follow the same
  pattern.
- **Level-design tests.** `tests/levelDesign.test.ts` simulates jumps with the
  real movement code. If a tuning change makes the secret ledge reachable
  without sprinting, or unreachable with it, `npm test` fails.
- **Levels are data, made in Tiled.** A new level is a new map file; the
  loader turns it into the same `LevelDefinition` the game has always used,
  so nothing else in the game knows or cares that it came from Tiled.
- **Art is swappable.** Everything refers to textures by key (`assets/keys.ts`).
  Melody's sprite sheet is loaded in `BootScene.preload()`. The level, sausages
  and background are still generated placeholders (`assets/placeholders.ts`)
  and will be replaced the same way.
- **Fixed virtual resolution (960×540)** scaled to fit any window, so layouts
  look the same on every screen.

## Where things will go next

| Feature                          | Likely home                                                |
| -------------------------------- | ---------------------------------------------------------- |
| New actions (sniff, dig)         | `core/input/actions.ts` + bindings (keyboard and `gamepadMapping.ts`) |
| More abilities (sniff, dig)      | `characters/abilities/<name>/`, added in `Melody.ts`       |
| More things for the boy (carry, push) | `gameplay/teamwork/` (action button) or `characters/abilities/<name>/` |
| Two players (one each)           | A second InputManager driving the follower instead of `TeamworkSystem.followerIntent` |
| More collectibles (bones, woozies) | new kind in `LevelDefinition.ts` + `collectibleTypes.ts` |
| More power-ups (SUPER_SPEED, MEGA_SNIFF) | `config/powerUps.ts` + a collectible type (see above) |
| Enemies                          | `entities/enemies/`                                         |
| Title screen, more menus         | new scenes in `scenes/` (see `PauseScene.ts`)              |
| Real sounds                      | load in `BootScene`, play from `core/audio/Sfx.ts`         |
| The house and garden             | New maps in `src/levels/maps/`                             |
