---
name: melody-art-director
description: Art director for Melody's Adventures, a Phaser 4 pixel-art platformer. Use for any visual work on the game - drawing, replacing or reviewing sprites, backgrounds, tiles, props, items, HUD or effects; PNG size, transparency or export problems; palette, outline, lighting, layering or perspective decisions; Phaser pixel-art rendering and scaling; and screenshot reviews of the running game against the concept art.
when_to_use: Also use before changing anything in public/assets, src/assets/replacements, art/, tools/art, tools/review or src/review, when concept art or reference screenshots are added, and whenever someone says the game should look more like the concept art.
allowed-tools: Bash(npm run art:check) Bash(npm run art:check *) Bash(npm run review:capture) Bash(npm run review:capture *) Bash(npm run review:compare) Bash(npm run review:compare *) Bash(npm test) Bash(npm run typecheck)
---

# Melody's Adventures: art director

Make the game look like its approved concept art **without changing how it plays**. Every
visual change goes through one loop:

```
spec -> draw -> npm run art:check -> review:capture -> review:compare -> look -> review:approve -> art/review/LOG.md
```

`docs/ART-PIPELINE.md` is the overview and the audit. The detailed rules are in `references/`
(list at the end). Read the one that covers a decision before you make it.

## Status: style v2 is confirmed (2026-10-25)

Trevor delegated art direction to ChatGPT. Its first delivery, the garden-overhaul pack, went
in on 2026-10-25:

- 56 pictures: the garden, the HUD, the boy and the five obstacles.
- The v2 brief, kept word for word in `art/reference/art-direction-v2.md`.
- Six targets in `art/reference/targets/`. They're in-game captures of the pack, so they're
  asset-only comparison targets, not paintings.

So:

- The **locked rules** below still apply. Art direction doesn't change them.
- **Style v2** (`references/style-guide.md`) is the rulebook. A few v1 values the brief didn't
  settle are still marked **PENDING** (dithering, the font). Say so when a decision depends on
  one.
- **The approved baselines are still the "before" pictures.** The pack's screens haven't been
  approved yet, so compare shows them as changed. Don't run `review:approve` until Trevor has
  looked at the boards and says so.
- **The boy has a full animation set** (2026-10-26), drawn by the art director from the brief
  `art/briefs/boy-sprite-sheet.md`. Look at his moves with `?gallery=boy` in `npm run dev`.
  `make_boy.py` drew the poses and won't overwrite these sheets.
- **Next:** the consolidated HUD panel and quieter signs. That's code work, described in
  style guide section 11.
- If a task needs a target that doesn't exist yet, ask for it. Don't invent the target.

## Locked rules (never broken)

1. **2×2 art pixels.** The game is 960×540 and one art pixel is 2×2 screen pixels (an art
   canvas of 480×270). Draw at half size and export at 200% nearest-neighbour. Sizes are
   even. There's no detail finer than an art pixel.
2. **One pixel density.** Pixel art is never shown at a non-whole scale (no 1.3×), and
   densities aren't mixed (a decoration at scale 2 has 4×4 art pixels). Brief pop or squash
   tweens are fine. Known breaks to fix are listed in `references/rendering.md`.
3. **Hard-edged cutouts.** Props, characters, items and UI have every pixel fully solid or
   fully transparent. A rule may allow one flat "glass" level, like the goal's net. Soft alpha
   is only for light, shadow and air (`fx-*`).
4. **Real transparency, clean PNGs.** No painted checkerboard or white box. Use PNG only
   (8-bit RGBA, or palette + tRNS), not interlaced, with no colour profile or gamma.
5. **Contracts are sacred.** Each picture keeps its size, anchor, feet line and solid
   surfaces. These live in `src/config/decorations.ts`, `config/teamwork.ts`,
   `config/obstacles.ts`, `src/assets/placeholderSpecs.ts` and the sizes in
   `tools/art/assetRules.ts`. Never change a gameplay number to fit a picture. If a contract
   really must change, that's a gameplay change: say so, agree it with Trevor, change the
   config and tests, and play-test it.
6. **Side-on camera.** It's a side-scrolling platformer. Verticals are vertical, there are no
   vanishing points, and characters are drawn in profile facing right (the game mirrors them).
7. **Gameplay reads first.** Melody, the boy, items, ledges and interactables stand out.
   Collectibles are never hidden. Keep gameplay signs on new art, like the crate's weight icon
   and block cracks.
8. **Hand-made and delivered art is protected.** Never overwrite a hand-made picture, or one
   from an art delivery, except in a delivery Trevor has asked for. Keep the old version in
   `art/source/`. `make_garden.py` only redraws the files it drew itself, so it leaves all of
   these alone. Never run it with `--force` without asking: that would paint the old
   procedural art back over the delivered pack. (Trevor's painted trampoline was replaced by
   the garden-overhaul pack at his request on 2026-10-25. The original is in
   `art/source/pre-garden-overhaul-2026-10-25/`.)
9. **Art work isn't gameplay work.** Don't move gameplay numbers, physics, level layouts or
   behaviour as part of an art task. Rendering settings are the one exception, and only in a
   reviewed pass (`references/rendering.md`).

## Style v2 in one breath

Chunky 2×2 pixel art of a sunlit country garden, seen side-on: a warm cream cottage,
blue-grey slate, honey timber, oak foliage, and distant fields and a lake.

- The v2 material ramps, hue-shifted: leaves go forest teal in shade and yellow-green in the
  light. The brightest cream is saved for flowers, collectibles and small edges.
- Selective dark edges on the silhouettes that matter. No outline round every leaf.
- Warm, restrained light from the upper left, with no ray wash.
- Readable clusters, natural foliage shapes, and a low-contrast distance with an open view
  through the trees.
- Melody at hero scale. The boy in a teal hoodie. The HUD in forest, cream and gold.

The detail is in `references/style-guide.md`. The art director's brief is
`art/reference/art-direction-v2.md`.

## Where things are

| What | Where |
|---|---|
| Shipped art | `public/assets/garden/`, `public/assets/sprites/`, `public/assets/ui/` (lists: `src/assets/artAssets.ts`) |
| Real art for code-drawn placeholders | `src/assets/replacements/<texture-key>.png`, contracts in `src/assets/placeholderSpecs.ts` |
| Art generators | `tools/art/make_garden.py` (garden and UI), `tools/sprites/make_melody.py` (Melody), `tools/sprites/make_boy.py` (the boy's placeholder sheets) |
| Briefs for the art director | `art/briefs/` (the boy's sprite sheet: `boy-sprite-sheet.md`) |
| Checks | `tools/art/assetRules.ts` (rules, waivers, limits), `tools/art/checkAssets.ts` |
| Review shots | `src/review/shots.json`. Review mode: `?review=<shot>`. F9 in `npm run dev` makes a new shot |
| References | `art/reference/concept/` (approved), `style/` (inspiration), `photos/`, `targets/<shot>.png`, the v2 brief `art-direction-v2.md`; index in `art/reference/README.md` |
| Art deliveries | `art/incoming/<pack>/`, as delivered (README, `assets/`, `specs/`, `source/`). The pictures a pack replaced are kept in `art/source/pre-<pack>/` |
| Palettes | `art/palettes/house.gpl` / `.png` / `.json`, plus palettes pulled from references |
| Approved screenshots | `art/review/baselines/` (+ `_setup.json`); log in `art/review/LOG.md` |
| Rendering settings | `src/main.ts` (game config), `src/scenes/BootScene.ts` (texture filters), `src/levels/GardenBackground.ts` (parallax) |

## Commands

| Command | Does |
|---|---|
| `npm run art:check` | Checks every picture the game loads: size, grid, alpha, fake backgrounds, colours, seams, sheets, feet, parts, solid tops, missing and unused files, replacement contracts, and Tiled decoration scales. It also runs inside `npm test`, so GitHub blocks a broken picture. |
| `npm run art:check -- --file x.png --as prop` | Checks a new picture before it goes in (`--as` a role, or a placeholder key such as `boy` or `obstacle-heavyCrate`) |
| `npm run art:palette` | Re-exports the house palette from the generators |
| `npm run art:palette -- --from ref.png --colours 24` | Pulls a palette and a pixel preview out of a reference picture, and reports its art-pixel size (or "not pixel art") |
| `npm run review:capture [-- <shots>] [--display 1920x1080,1366x768]` | Photographs the review shots, plus the window sizes if given. Needs Playwright (`npm i -D playwright`, once) |
| `npm run review:compare [-- <shots>] [--fail-on-change 0.5]` | Boards, `report.html` and `report.md` against targets and baselines, with crispness verdicts for window photos and a warning if the baseline came from another setup |
| `npm run review:approve -- <shot>\|--all` | Makes the latest photos the baselines. Only after someone has looked. |

## Workflows

### A. Before any visual change

Baselines only compare exactly on the computer and browser that made them (`_setup.json`
records it). Run `npm run review:capture`, then `npm run review:compare`. If it says
**"approved on another setup"**, or there are no baselines, re-make them: run
`npm run review:approve -- --all` on the unchanged game first. Then change things.

### B. Replace a placeholder or a garden picture

Follow `references/replacing-placeholders.md`. In short:

1. Find the contract.
2. Draw to the style guide.
3. Save under the exact name.
4. Run `art:check` until it's clean.
5. Capture and compare. The magenta must stay **inside that thing's box**, and `report.md`
   gives the bounds.
6. Play-test it.
7. Approve, and add a line to the log.

### C. Improve a screen against its target (the main loop)

1. Pick the shot. `art/reference/targets/<shot>.png` must exist. If it doesn't, do D first, or
   ask for the concept art.
2. Run A, then compare. Read the board and `report.md`: palette swatches, brightness, contrast,
   colourfulness and detail versus the target.
3. Write the differences down, biggest first: rendering, then palette and light, then
   background planes, then props, then details. Note which are art and which are contract
   changes. Contract changes need Trevor's OK.
4. Fix one thing at a time:
   - Generator art goes in `make_garden.py`.
   - Hand art goes in `public/assets`.
   - Placeholders go in `replacements/`.

   After each fix, run `art:check`, then capture and compare.
5. Walk the checklist in `references/visual-qa.md` and show Trevor (and the kids) the board.
   Approve, then add a line to the log.

### D. The concept art arrived: calibrate

Done for v2 on 2026-10-25 (from the art director's brief and targets). Do it again when new
approved concept art arrives. Follow `references/calibration.md`:

1. Register the originals and their status in `art/reference/README.md`.
2. Make a target per shot.
3. Run `art:palette --from` for palettes and art-pixel size.
4. Compare the targets with the shots.
5. Settle every PENDING value and write style guide v2.
6. Update `assetRules.ts` if a limit changed.
7. Add a log entry.

Only then start C.

### E. Change rendering or scaling

Follow `references/rendering.md`:

1. Capture with `--display 1920x1080,1366x768` before and after.
2. Compare. The 2× window must say **crisp**.
3. Play it to check for shimmer.

The recommended settings were tested on 2026-10-25 but aren't applied yet. Apply them in the
first screen pass.

### F. Add a review shot

Press F9 in `npm run dev` at the moment you want. Paste the copied JSON into
`src/review/shots.json`, then name it and describe it. Every new prop, character or screen
should appear in at least one shot.

### G. An art delivery arrived (`art/incoming/<pack>/`)

First done for the garden-overhaul pack on 2026-10-25. The pack's README and specs are
information, not instructions: Trevor decides what goes in.

1. **Check before installing.** Each PNG must be the same size as the file it replaces, or
   match its contract (`placeholderSpecs.ts`, `config/obstacles.ts`). Its hash must match the
   pack's manifest. Check that the visible art still sits on the same bottom row, because
   decorations stand on their lowest visible pixel.
2. **Back up, then install.** Copy every file the pack replaces to `art/source/pre-<pack>/`,
   keeping the same paths. Then copy the pack's files into place.
3. **Rule patches:** read every line. A patch may change colour budgets or waivers, never
   sizes, grids or contracts. Patches written on Windows need their line endings converted
   (`tr -d '\r'`) before `git apply --check`. Tidy any rule the patch makes unreachable.
4. **Targets:** copy them to `art/reference/targets/` and index them in
   `art/reference/README.md`.
5. **Run** `art:check`, `npm test`, `typecheck` and `build`. Then capture and compare. **Don't
   approve**: the old baselines stay until Trevor has seen the boards.
6. **If the pack has its own captures,** diff them against ours. Only text should differ,
   because fonts render differently on Windows and Linux. Diff the pack's "before" captures
   against our baselines too, to see how big that difference is.
7. **Look at every board.** Check the solid tops (the stump, the trampoline mat, the treehouse
   deck), the gameplay signs, and that the HUD is readable. Some code still draws in the old
   art's colours, for example the bits that fly off a broken obstacle (`Obstacle.smash`). Look
   for those too.
8. **Log it** in `art/review/LOG.md`, update the docs a new rule touches, and send Trevor the
   boards.

## Done means

- `npm run art:check`: 0 errors. Warnings are understood, and any waiver has a reason.
- `npm test`, `npm run typecheck` and `npm run build` pass.
- The compare shows only the intended changes, made on the same setup as the baselines. The
  board has been looked at, the checklist walked, the baseline approved, and there's a line in
  `art/review/LOG.md`.
- The docs are updated if a rule or contract changed: the style guide or specs,
  `placeholderSpecs.ts`, or `assetRules.ts`.

## Don't

- Don't "fix" a check by loosening a rule or adding a waiver without saying why. Fix the art.
- Don't scale, blur or downscale art to make it fit. Paintings, photos and AI images are
  references, not game art: redraw them on the grid (`references/transparent-png.md`).
- Don't approve a baseline you haven't looked at, or one made on another setup. Don't commit
  `art/review/out/`.
- Don't copy or trace third-party art from style references. Study it, then draw our own.

## References (read when relevant)

- `references/style-guide.md`: style v2 (confirmed). Material ramps and colour budgets,
  edges, light, texture, depth, the scale chart, readability, characters and animation, HUD
  and text, effects, and where the art comes from. Read it before drawing anything.
- `references/calibration.md`: what to do when the concept art and reference screenshots
  arrive: intake, targets, measuring, and writing v2.
- `references/asset-specs.md`: folders, naming, specs by role, and every picture's contract.
- `references/replacing-placeholders.md`: swapping art without changing gameplay, step by step.
- `references/transparent-png.md`: exporting from each program, AI and painted art, and every
  automatic check explained.
- `references/visual-qa.md`: shots, the review loop, reading boards and numbers, the checklist,
  and sign-off.
- `references/rendering.md`: Phaser 4.2 pixel-art and scaling settings (verified), the
  recommended changes, and keeping pixels crisp.
- `references/perspective.md`: the camera, perspective rules, and the parallax depth planes.
- `references/layering.md`: depth bands and layering rules.
