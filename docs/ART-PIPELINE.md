# Art pipeline

The game plays well, but it doesn't yet look like the approved concept art. This pipeline is
how we close that gap without breaking the game:

- **One style, written down:** the style guide.
- **Contracts** say what about each picture the game depends on.
- **Automatic checks** catch broken pictures before anyone plays them.
- **Screenshot review** compares the running game with the concept art, with the last approved
  look, and at real window sizes.

It's run by the **melody-art-director** Skill, which Claude Code uses for any art work on the
game. The Skill belongs in `.claude/skills/melody-art-director/`. Until it's moved there, it
waits in `docs/claude-skills/` (one step, see the README in that folder). The detailed rules
are in its `references/` folder. This document is the overview and the audit.

```
 concept art ──► targets ─┐
                          ▼
 draw / replace ──► npm run art:check ──► npm run review:capture ──► npm run review:compare ──► look ──► npm run review:approve
      ▲                  (rules)             (same shot, same pixels)    (boards + report)               (+ a line in LOG.md)
      └──────────────────────────────── fix one thing at a time ◄──────────────────────────────┘
```

| Command | What it does |
|---|---|
| `npm run art:check` | Checks every picture the game loads. It also runs inside `npm test`, so GitHub checks it on every push. |
| `npm run art:check -- --file new.png --as prop` | Checks a new picture before it goes in |
| `npm run art:palette` | Exports the house palette to `art/palettes/house.gpl` / `.png` |
| `npm run art:palette -- --from art/reference/concept/x.png` | Pulls a palette and a pixel preview out of a reference picture, and says how big its art pixels are |
| `npm run review:capture [-- --display 1920x1080,1366x768]` | Photographs the review shots (and the window sizes) into `art/review/out/current/` |
| `npm run review:compare` | Builds the comparison boards, `report.html` and `report.md` in `art/review/out/` |
| `npm run review:approve -- <shot>` | Makes the latest photo of a shot the approved one |

Capturing needs Playwright, installed once with `npm i -D playwright`. On Windows it uses Edge
if Playwright's own browser isn't installed.

**Where things stand (2026-10-25):**

- The pipeline and the checks are in place, and all 180 tests pass. The Skill is updated, and
  is switched on once it's moved into `.claude/skills/`.
- The first art delivery is in: the **garden-overhaul pack** (56 pictures) from ChatGPT as art
  director. The style guide is now **v2, confirmed** (section 3). The approved baselines are
  still the "before" pictures until Trevor approves the new screens.
- The boy has a full animation set (2026-10-26), in placeholder art from `tools/sprites/make_boy.py`.
  The art director's brief is `art/briefs/boy-sprite-sheet.md`.
- Next: the consolidated HUD panel and quieter signs from the v2 brief. That's code work.
- The rendering fixes are **tested but not applied**. They're the first step of the test
  screen (section 7).

---

## 1. Audit: how the game draws and loads its art

### 1.1 Where every picture comes from

| Source | What | How it's made | Count |
|---|---|---|---|
| Drawn garden art | Backgrounds, ground tiles, props, animated strips, effects, HUD icons | `tools/art/make_garden.py` draws them on a half-size canvas and saves them at 2× (`public/assets/garden/`, `public/assets/ui/`) | 53 + 7 |
| Melody | 18 animations × 2 skins (normal, buff) | `tools/sprites/make_melody.py` (96×76 frames, 4 px gaps). It also writes `melodySheet.json`. | 2 sheets |
| Trevor's own art | The trampoline | Painted. `make_garden.py` keeps it because it isn't one of its own files. | 1 |
| Code placeholders | The boy (2 frames), sausages, power-up treats, squirrel toy, ball, cat, scent icons, paw prints, glow, debris, confetti, classic-level tiles, hill, cloud, obstacles (crate, barrier, fence, blocks) | `src/assets/placeholders.ts` draws them with shapes into textures at start-up | 22 + 5 obstacles |
| Code-drawn objects | Sign boards, Tiled ladders, the lift rope, crack lines, the sprint bar, HUD panels, the action prompt, bark rings, poofs | `Graphics`, drawn live in each entity's code | - |
| Text | Signs, HUD, prompts, speech | Phaser Text: Arial Bold with a stroke | - |

*Since 2026-10-25* the garden-overhaul pack supplies 41 of the drawn garden pictures, all 7 HUD
pictures, the trampoline, the boy and the five obstacles: 56 files, delivered in
`art/incoming/garden-overhaul-2026-10-25/`. `make_garden.py` still draws the other 11: the
gnome, the washing line, the robin, squirrel, butterfly and leaf, the distant birds, and the
`fx-mote`, `fx-shadow`, `fx-shade-top` and `fx-vignette` effects. It leaves the delivered files
alone, because their fingerprints aren't its own.

### 1.2 How pictures are loaded

`BootScene` loads everything once, at start-up:

- **Garden art:** each name in `GARDEN_IMAGES` (`src/assets/artAssets.ts`) is loaded from
  `assets/garden/<name>.png` under the key `garden-<name>`. Animated strips are cut into frames
  using `src/assets/gardenSheets.json`, which `make_garden.py` writes.
- **HUD art:** each name in `UI_IMAGES` is loaded from `assets/ui/<name>.png` as `ui-<name>`.
- **Melody:** both skins come from `melodySheet.json`, with their animations.
- **Replacement art:** any PNG in `src/assets/replacements/` is loaded under its file name as
  the texture key, and `placeholders.ts` then skips drawing that placeholder. Sounds in
  `src/assets/audio/` are found the same way (`import.meta.glob`).
- **Filtering:** placeholders are drawn after loading. NEAREST filtering is set for the garden,
  UI, Melody and replacement art. Code-drawn textures and text keep LINEAR (smooth).

The flat lists in `artAssets.ts` work well for one world. When there are several, switch to a
per-world manifest made by the art tools, and load only the world being played (see the asset
specs).

### 1.3 How pictures are placed: the contracts in code

These are the facts that make "just swap the picture" safe or unsafe:

- **Decorations** stand on the **lowest visible pixel** of the picture (frame 0 for strips),
  centred, so empty space below doesn't matter. **Parts** (leaves) use the same origin, so they
  must be the same canvas size as the main picture. A Tiled `scale` on a decoration scales its
  picture *and* its solid parts.
- **Solid bits of decorations** (the stump top, the trampoline mat, the treehouse deck and
  railing, the hedge over the gate) are numbers in `src/config/decorations.ts` and
  `config/teamwork.ts`. They're measured from that bottom-centre point, not from the picture.
- **Ground edges** sit at fixed offsets: the grass top 8 px above the surface, gravel 4 px,
  and the end caps 6 px out and 10 px up.
- **Characters** stand on their feet (origin at the bottom centre). The physics body is a fixed
  size at the bottom of the frame, so a frame with empty rows under the feet floats.
- **Obstacles** get their **physics box from the picture**: a bigger crate picture makes a
  bigger crate.
- **Collectibles** get their **pick-up box from the picture**, plus 6 px.

These contracts are written down per asset in the Skill's `references/asset-specs.md` and in
`src/assets/placeholderSpecs.ts`. `art:check` enforces them.

### 1.4 Rendering and scaling

Checked against Phaser **4.2.1**'s own code and its pixel-art guide. Details are in the
Skill's `references/rendering.md`.

- The game is 960×540. `Scale.FIT` leaves the canvas at 960×540 and lets the **browser**
  stretch it to the window.
- Pixel-art mode is off, so `antialias` is on and the browser **smooths** the stretch. Measured
  at 1920×1080, the review compare finds no clean pixel grid: the verdict is **SOFT**.
- `roundPixels` is on, which is good. In Phaser 4, though, rounding only applies to objects that
  aren't scaled, so the 1.2× and 1.3× pictures are never rounded.
- Background layers scroll by fractions of a pixel, because Phaser doesn't round a TileSprite's
  texture offset.

### 1.5 Layering

Depths are plain numbers in about 20 files, but they fall into clear bands:

| Band | Depth |
|---|---|
| Sky | -60 to -20 |
| Back scenery | -6 to -1 |
| Ground | 0 to 1.5 |
| Interactables | 3 to 6 |
| Characters | 8 to 12 |
| Effects | 20 to 45 |
| HUD scene | on top |

The table and the rules are in `references/layering.md`. Later, it's worth moving those numbers
into one `src/config/layers.ts`, and the review shots (`--fail-on-change 0`) would prove that
changes nothing.

### 1.6 Findings: why the game doesn't match the concept art yet

In order of how much they show on screen. The concept art isn't in the project yet, so this
list covers what's wrong *inside the game*. The comparison with the concept art starts when its
targets are added (section 8).

1. **Everything is browser-smoothed when scaled.** Any window bigger than 960×540 makes the
   whole game soft. *Fix: `pixelArt: true` (section 7). Tested: crisp at 2×.*
2. **Two pixel sizes are mixed.** The garden and Melody are 2×2 pixel art. The boy, the treats,
   the crate, the cat, the sign boards, the ladders and the HUD panels are drawn by code with
   1-pixel, smooth-edged shapes, and the boy is on screen all the time. *Fix: replacement art
   via `src/assets/replacements/` (no code needed). Later, turn the sign boards and ladders into
   textures.*
3. **The text is smooth vector Arial**: signs, HUD and prompts. *Fix: a pixel font on the 2×2
   grid, decided in the UI pass.*
4. **Pixel art is shown at non-whole scales:** SUPER STRENGTH Melody at 1.3×, the HUD bone at
   1.3×, the hearts and the pause cursor at 1.2×. The art pixels come out uneven.
5. **The light comes from two directions.** Props, trees and Melody are lit from the upper left,
   but the sun glow in the sky and the sunbeams come from the top right. *Settle it with the
   concept art.* (Settled by v2: warm light from the upper left, and the sunbeams are now a
   barely visible wash.)
6. **One painted picture** (the trampoline) sits among the pixel art. It breaks the grid, has
   soft edges and uses 656 colours. It's kept on purpose and waived. Redraw it when Trevor is
   happy to. (Replaced by the garden-overhaul pack's pixel-art trampoline on 2026-10-25, at
   Trevor's request. The original is in `art/source/pre-garden-overhaul-2026-10-25/`.)
7. **The background layers step unevenly** as the camera glides (fractional offsets).
8. **There was no target to measure against,** so "matches the concept art" couldn't be checked.
   Now each review shot can have a target picture, and the boards compare them.
9. **Layering is scattered** (see 1.5). It's not a visible problem yet, but it's a risk as
   content grows.

The good news:

- Every drawn garden picture, all the UI and Melody's sheets pass every check: exactly on the
  2×2 grid, hard edges, real transparency, small palettes, and sheets that divide correctly.
- `roundPixels` is on, and the camera zoom is a whole number.

The foundation is right. The problems are the code-drawn pieces, how the canvas is scaled, and
the missing targets.

### 1.7 What the audit found in the pipeline itself (fixed 2026-10-25)

- **`npm test` was failing on the real project.** `public/assets/garden/trampoline_old.png` (an
  unused old version with soft edges) failed `art:check`. Since the GitHub workflow runs
  `npm test` before publishing, the next push would not have been published. *Fixed:* files
  nothing loads are now only flagged "unused" and never fail the build. The file itself is still
  there; move it to `art/source/` when convenient.
- **The Skill wasn't switched on.** It was parked in `docs/claude-skills/`, where Claude Code
  doesn't look. Claude's remote tools can't write into `.claude/` (that folder can hold
  settings that run commands), so the updated Skill is still in `docs/claude-skills/`. *To
  switch it on:* move it once (`docs/claude-skills/README.md`). The previous draft is kept in
  `Claude outputs/claude-skills-draft-v0.16/` for reference.
- **Baselines could be compared across computers without warning.** Text and edges differ
  between machines and browsers. *Fixed:* captures record their setup, and compare warns when
  a baseline came from another one.
- **The rendering advice hadn't been checked against Phaser 4.** *Fixed:* it was verified against
  4.2.1's source and tested on two shots (section 7). It now includes Phaser 4's
  `smoothPixelArt` and per-object rounding.
- **The style guide presented provisional values as fixed rules.** *Fixed:* every rule is now
  marked LOCKED (engine and gameplay) or PENDING (concept art).
- **Nothing measured a reference picture's pixel size.** *Fixed:* `art:palette --from` reports
  it, and compare uses the same measure to call window photos crisp or soft.
- **A decoration scaled in Tiled would silently change its pixel size.** *Fixed:* `art:check`
  warns about it.

---

## 2. Folders and names

- **Shipped art** stays where it is: `public/assets/garden|sprites|ui/`.
- **Replacement art** for placeholders goes in `src/assets/replacements/<texture-key>.png`.
- **Everything that isn't shipped** goes under `art/`:
  - `reference/concept`, `style`, `photos` and `targets`, with an index in
    `reference/README.md`.
  - `source`: editable files and old versions.
  - `palettes`.
  - `review/baselines` and `review/out`, plus `review/LOG.md`.
- **Names** are lowercase-kebab-case with role prefixes (`bg-`, `tile-`, `fx-`), and
  `<thing>-<part>` / `<thing>-<variant>`.
- **When a second world arrives,** move to `public/assets/characters/<name>/` and
  `public/assets/world/<world>/{backgrounds,tiles,props,fx}/`, and load per world from a
  manifest. Don't move anything before then: the generators and loaders use today's paths.

The full layout and naming rules are in `references/asset-specs.md`.

## 3. The style guide (v2, confirmed 2026-10-25)

The style guide is in `references/style-guide.md`. It's the art director's v2 brief
(`art/reference/art-direction-v2.md`, word for word) merged with the v1 rules it doesn't change.
In one breath: chunky 2×2 pixel art of a sunlit country garden, seen side-on.

- **Palette:** the v2 material ramps (foliage, grass, limestone, timber, bark, soil,
  terracotta, the boy's hoodie, HUD, heart), hue-shifted. Larger colour budgets for the hero
  pictures (`assetRules.ts`).
- **Edges:** selective dark material edges on the silhouettes that matter, not an outline round
  every leaf.
- **Light:** warm and restrained, from the upper left, with no ray wash.
- **Texture and depth:** readable clusters and natural foliage shapes. A low-contrast distance
  with an open view through the trees.
- **Scale:** unchanged. Melody at hero scale, small garden things at readable scale.

Every rule is marked:

- **LOCKED:** the 2×2 grid, one pixel density, hard edges, PNG format, contracts, the side-on
  camera, and gameplay readability.
- **CONFIRMED (v2):** palette, edges, light, texture, depth, characters, and the HUD direction.
- **PENDING:** dithering and the font.

When new approved concept art arrives, `references/calibration.md` turns it into targets and
the next version of the guide.

## 4. Replacing art without changing gameplay

The rule: the art changes, the numbers don't. Each picture's contract (size, anchor, feet,
solid surfaces) is kept.

1. Find the contract.
2. Draw it to the style guide.
3. Save it under the right name:
   - A placeholder goes in `src/assets/replacements/<key>.png`.
   - A garden picture replaces its file (`make_garden.py` keeps hand-made files).
4. Run `art:check`.
5. Run review capture and compare. The changes must stay inside that thing's box.
6. Play-test it.
7. Approve it, and add a line to `art/review/LOG.md`.

This was tested end to end on 2026-10-25 with a stand-in crate:

- `art:check` passed.
- The compare showed **2.27%** of the `garden-crate` screen changed, all inside x 530–640,
  y 366–476. That's exactly the crate's 110×110 box.

The stand-in was then removed. The full steps, and what to do when a contract really must
change, are in `references/replacing-placeholders.md`. The placeholder sizes are in
`src/assets/replacements/README.md`.

## 5. Automatic checks

`tools/art/checkAssets.ts` (rules in `tools/art/assetRules.ts`) checks every PNG **the game
loads** from `public/assets/`, everything in `src/assets/replacements/`, and the decoration
scales in the Tiled maps.

| Kind | Checks |
|---|---|
| PNG and pixels | Readable, not interlaced, no colour profile; size limits and even sizes; on the 2×2 grid |
| Transparency | Hard edges, or flat glass where it's allowed; no painted-in checkerboard or solid background; no holes in opaque tiles |
| Colours | Within the role's budget, without near-duplicate noise |
| Repeating pictures | They join up with themselves |
| Sheets | They divide into their frames; nothing in the gaps; no frame dips below frame 0; Melody's feet on the ground in every grounded frame |
| Decorations | Parts are the same size as the main picture; solid tops have art under them; no Tiled `scale` other than 1 (a warning) |
| Files | Every file the game loads exists. Files nothing loads are flagged as unused, not checked. |
| Replacements | The name is a real placeholder key (it suggests the nearest), the size is within the contract, and characters' feet are on the bottom row |

`tests/assets.test.ts` runs it as part of `npm test`, so GitHub fails the build on an art error.
It also tests every check against deliberately broken pictures. Waivers (pictures allowed to
break a rule, with the reason) are in `assetRules.ts`; today there are none.

## 6. Screenshot review

- **The shots:** `src/review/shots.json` defines six garden shots, each a fixed screen. Opening
  `?review=<shot>` sets one up exactly:
  - Everyone is placed where the shot says.
  - The camera holds still and the debug overlay is off.
  - The game runs a fixed number of frames on a controlled clock with repeatable "random"
    numbers.

  The same shot captured twice gives **identical pixels**: this was checked again on
  2026-10-25 on all six, with 0 pixels different.
- **The tools:**
  - `review:capture` photographs the shots in a headless browser, plus window sizes with
    `--display`.
  - `review:compare` builds a board per shot (target | now / approved | what changed), a
    `report.html` with a fade slider, and a `report.md` with numbers, plain-words notes against
    the target, **crisp / SOFT verdicts** for the window photos, and a warning if a baseline
    came from another setup.
  - `review:approve` accepts them.
- **F9:** in `npm run dev`, F9 saves a photo of the screen and copies a ready-made shot
  description, so any moment can become a review shot.
- **Baselines** are only compared exactly on the setup (computer and browser) that made them.
  `_setup.json` records it. Make them on the computer doing the work, before changing anything.

Details, the checklist and how to read the numbers are in `references/visual-qa.md`.

## 7. Phaser changes needed (tested, not applied yet)

These are left for the test-screen pass, so the before and after are reviewed properly. The
exact code is in `references/rendering.md`.

1. **`pixelArt: true`** in `src/main.ts`, instead of `roundPixels: true`. In Phaser 4 this means
   nearest-neighbour textures (including text and placeholders), a crisp CSS canvas, rounding,
   and no multisampling. It's the biggest single visual improvement.
2. **Keep the soft effects smooth.** In `BootScene`, set the vignette, ground shadow, shade,
   sunbeams and glow back to LINEAR.
3. **Whole-pixel parallax.** Round the TileSprite offsets in `GardenBackground.update`.
4. **No non-whole scaling of pixel art:**
   - SUPER STRENGTH (1.3×): draw the buff sheet bigger, or use 1.5× (even pixels), or try
     per-texture `smoothPixelArt`. Her hitbox grows with the scale, so this is Trevor's call.
   - HUD icons: draw them at their shown size.
5. **Keep `Scale.FIT`.** Judge the unevenness at 1366×768. Move to whole-number zoom on big
   screens only if it bothers the kids.
6. **Later: a pixel font** for the signs, HUD and prompts.

**Tested on 2026-10-25** (changes 1–3, on a scratch copy, `garden-house` and `garden-crate`):

- At 1920×1080 the verdict went from **SOFT** to **crisp: every art pixel 4×4**.
- At 1366×768 it's crisp but uneven (2 or 3 px), as expected at 1.42×.
- Inside the 960×540 frame, under 1% of pixels changed: text got sharper, and code-drawn
  shapes show hard 1-pixel steps.
- Typecheck, tests and build passed.

## 8. Next: the test screen

The proposed first screen is **`garden-house`**. It's the first thing everyone sees, and it
covers nearly every kind of art: sky and background layers, ground tiles, the house and pots, a
sign, a bone, Melody, the boy and the HUD.

1. **Add the approved concept art** to `art/reference/concept/` and index it. Make the target
   `art/reference/targets/garden-house.png`, in the same view as the shot.
2. **Calibrate** (`references/calibration.md`): palettes, art-pixel size, light direction,
   outlines, proportions. Then write style guide v2.
3. **Make the baselines on the computer doing the work:** capture with
   `--display 1920x1080,1366x768`, then approve with `--all`.
4. **Apply rendering fixes 1–3** (section 7), then capture and compare. The 2× verdict must say
   crisp.
5. **Settle the light direction:** move the sun, or re-light.
6. **Real art for the boy:** his sprite sheets (`public/assets/sprites/boy.png` and
   `boy_carry.png`, brief in `art/briefs/boy-sprite-sheet.md`). The sign board and text
   treatment come next.
7. **Adjust the house, pots, ground and background planes** towards the target, one change at a
   time, each one checked and compared.
8. **Review with the kids.** Approve, log, and then roll the same changes out to the other five
   shots.

## Files

| File | What |
|---|---|
| `.claude/skills/melody-art-director/` | The Skill: `SKILL.md` + `references/` (style guide, calibration, asset specs, replacing placeholders, transparent PNGs, visual QA, rendering, perspective, layering). Waiting in `docs/claude-skills/` until it's moved. |
| `tools/art/png.ts` | PNG reader and writer (no dependencies) |
| `tools/art/analyze.ts` | Picture measurements: grid, alpha, colours, borders, seams, feet, diffs, look, art-pixel size |
| `tools/art/assetRules.ts` | The rules, waivers and limits |
| `tools/art/checkAssets.ts` | `npm run art:check` |
| `tools/art/palette.ts` | `npm run art:palette` |
| `tools/review/` | `capture.ts`, `compare.ts`, `approve.ts`, plus helpers |
| `src/review/` | Review mode (`review.ts`) and the shots (`shots.json`) |
| `src/assets/placeholderSpecs.ts` | Contracts for every code-drawn placeholder |
| `src/assets/artReplacements.ts` + `src/assets/replacements/` | Drop-in replacement art |
| `tests/assets.test.ts` | The art checks in `npm test`, and tests of the checks themselves |
| `art/` | `reference/` (+ `README.md` index), `palettes/house.*`, `review/LOG.md`; folders for sources and baselines |
