# Art style guide, v2 (confirmed)

**Status:** v2 is the confirmed art direction, adopted on 2026-10-25 with the
garden-overhaul art pack. Trevor delegated art direction to ChatGPT, which wrote the brief;
it's kept word for word in `art/reference/art-direction-v2.md`. This guide is that brief
merged with the v1 rules it doesn't change. If the two ever disagree, the brief wins: point
it out so this file gets fixed.

Each rule is one of three kinds:

- **LOCKED** rules come from the engine, the gameplay or the file format. Art direction
  doesn't change them.
- **CONFIRMED (v2)** rules were decided by the art director. Follow them.
- **PENDING** rules are v1 values the v2 brief doesn't settle. Keep using them, and raise
  them with Trevor or the art director when a task depends on one.

## At a glance

| Area | Rule | Status |
|---|---|---|
| Pixel scale | 1 art pixel = 2×2 screen px at 960×540 (a 480×270 art canvas). Draw at half size, export at 200% nearest-neighbour | LOCKED, CONFIRMED (v2) |
| Pixel density | One density everywhere; no non-whole scaling ("integer display scales") | LOCKED, CONFIRMED (v2) |
| Edges | Cutouts are alpha 0 or 255. The goal keeps its one flat net level. Soft alpha only for effects. No painted checkerboards, baked floor shadows or colour profiles | LOCKED, CONFIRMED (v2) |
| Camera | Side-on, flat, no vanishing points | LOCKED |
| Palette | The v2 material ramps, hue-shifted. Brightest cream only for flowers, collectibles and small material edges. Per-file colour budgets | CONFIRMED (v2) |
| Outlines | Selective dark material edges on the silhouettes that matter. No continuous brown outline round every leaf | CONFIRMED (v2) |
| Light | Warm, from the upper left. Restrained: no strong diagonal ray wash | CONFIRMED (v2) |
| Texture | Readable clusters, not scattered 1-pixel noise. Natural foliage silhouettes, not balls | CONFIRMED (v2) |
| Dithering | Only on the sky and distant haze | PENDING (v1) |
| Depth | The distant landscape has less contrast than the cottage and the oak. An open view through the middle of the tree layer | CONFIRMED (v2) |
| Proportions | Melody, the boy and every size stay as they are | LOCKED (contracts), CONFIRMED (v2) |
| Characters | The boy: teal hoodie, dark shorts, light-soled shoes. Melody: unchanged | CONFIRMED (v2) |
| HUD and signs | One round forest-and-gold badge family. A consolidated HUD panel and quieter signs are next (code work, not done yet) | CONFIRMED (v2) direction |
| Text | Arial Bold with a stroke, for now. No font or title treatment chosen | PENDING |

## 1. Pixel scale (LOCKED, CONFIRMED v2)

- **One art pixel = 2×2 screen pixels.** The game's screen is 960×540, so the art canvas is
  really 480×270.
- **Draw at half size, then export at 200% with nearest-neighbour scaling**, with no
  smoothing. Every PNG in `public/assets/` is stored at screen size, on that grid, and
  `npm run art:check` enforces it.
- **Picture sizes are even numbers.** An odd size cuts an art pixel in half.
- **Never show pixel art at a non-whole scale** (no 1.3×), and never at a scale that changes
  its density. A decoration at scale 2 has 4×4 art pixels, chunkier than everything around it.
  `art:check` warns about scaled decorations in the Tiled maps. Brief pop or squash tweens
  (under about half a second) and soft effects are fine.
- Known breaks of this rule, to fix over time (see `rendering.md`):
  - SUPER STRENGTH draws Melody at 1.3×.
  - In the HUD: the bone icon is drawn at 1.3×, the hearts at 1.2×, the pause cursor at
    1.2×, and the power-up badges (60×60 pictures) at 56 px, which is 0.93×. The HUD pass
    fixes these.
  - Code-drawn placeholders have 1-pixel detail: the treats, the cat, signs and ladders. (The
    boy, the crate, the barrier, the fence and the blocks got real art on 2026-10-25.)

## 2. Palette (CONFIRMED v2)

**Work in material ramps.** A ramp is the tones of one material, dark to light. These are the
v2 reference ramps:

| Material | Dark → light |
|---|---|
| Foliage | `#173b30 #23513b #3b693e #557f40 #749547 #9bb04e #c0cc68 #e4dc8b` |
| Grass | `#183c30 #28513b #416839 #63833b #86a744 #acc857 #cbd775 #e7e9a1` |
| Limestone | `#363e37 #525b50 #707667 #92957c #b4b298 #cdc6a6 #e4d8b7 #f3e6c8` |
| Timber | `#3c2c22 #614331 #92613d #bf8c54 #e4bd7c` |
| Bark | `#332b25 #51402f #745637 #997247 #bc935d #dfbd84` |
| Soil | `#302a24 #44362a #5c4530 #765737 #947248 #b39465` |
| Terracotta | `#663c32 #99553e #c07b52 #e2a577` |
| Boy hoodie | `#173e40 #25858a #318f94 #59b6b4` |
| HUD | `#142c29 #29463c #64765a #e0c68e` |
| Heart | `#693c39 #b74d4c #ed7464 #ffa58a #ffe4bd` |

- **Hue-shift.** Shaded leaves lean forest teal and highlighted leaves lean yellow-green.
  Shadows go deeper and cooler, never just greyer.
- **Save the brightest cream** for flowers, collectibles and small material edges.
- **No pure black.** Each ramp's darkest tone is a deep, hue-shifted colour (foliage
  `#173b30`, timber `#3c2c22`, HUD `#142c29`). Pure white `#ffffff` is only for sparkles,
  glints and the brightest petals. Melody's white fur stays a warm off-white, `#faf6ee`.
- **Which art uses them.** The ramps govern the editable procedural art. The big "hero"
  pictures (house, treehouse, trees, background layers, bushes, egg chair, trampoline, stump)
  were made from high-resolution generated masters, quantised to related adaptive palettes.
  Their exact colours are listed per file in the pack's manifest
  (`art/incoming/garden-overhaul-2026-10-25/specs/asset-manifest.json`). Don't describe them
  as using only the reference ramps.
- **Where the ramps live.** They aren't in `tools/art/make_garden.py` yet: the pack's native
  pictures were drawn with that generator plus the art director's overrides, which are in the
  pack's `source/` folder. So `art/palettes/house.gpl` is still the v1 palette. Use the table
  above for new art until the overrides are folded into the generator.
- **Colour budgets.** Colour counts are budgets, not targets. Going over one is an art:check
  warning, set in `tools/art/assetRules.ts`. By role:

  | Role | Up to |
  |---|---|
  | Items | 16 |
  | Tiles | 16 |
  | Characters | 32 |
  | UI | 40 |
  | Background layers | 40 |
  | Props | 48 |

  v2 per-file exceptions (only the colour budget changes; every other check still applies):

  | Files | Up to |
  |---|---|
  | `house`, `treehouse` | 128 |
  | `bg-far`, `bg-trees`, `bg-fence` | 96 |
  | `big-tree`, `big-tree-leaves`, `treehouse-leaves`, `bush-berries`, `bush-hydrangea`, `egg-chair`, `trampoline`, `stump` | 64 |
  | `tile-stone`, `tile-dirt` | 32 |

  Several of those files sit exactly at their budget, so a touch-up that adds a colour will
  warn.
- **Colours that mean something** (LOCKED, because they're gameplay signals):
  - Cream (and gold) with a warm glow (`#ffe27a`) means bones.
  - SUPER STRENGTH is orange-red `#ff5a36`, SUPER SNIFF purple `#b98cff`, SUPER BARK sky blue
    `#4fc3f7`, and SUPER CHARGE yellow `#ffd23f`. The badges are now one forest-and-gold
    family; the power colours still show in the effects and the ring round an active badge.
  - Don't use these strongly on scenery, or players will try to collect it.

## 3. Outlines and edges (CONFIRMED v2)

- **Selective dark material edges** separate the silhouettes that matter: characters,
  collectibles, things you interact with, and the edges you stand on. Use the dark end of the
  material's own ramp, not one brown for everything.
- **No continuous brown outline round every leaf.** Foliage is shaped by its own light and dark
  clusters.
- **Background layers have no dark outlines.** They sit back through lower contrast.
- Never use soft or anti-aliased outlines. Every edge pixel is solid (LOCKED).

## 4. Light and shading (CONFIRMED v2)

- **Warm light from the upper left.** Lit edges face up and left, and shadows fall down and
  right.
- **Restrained.** No strong diagonal white ray wash. The sunbeams (`fx-sunrays`) are now a
  barely visible wash, which settles v1's "sunbeams from the top right" problem.
- **Flat tones from the ramps** (4–8 per material). No airbrush or soft gradients on objects.
- **Where things meet:** use a darker ramp tone where an object meets the ground or tucks under
  an overhang.
- **No baked floor shadows.** The game adds a soft ground shadow (`fx-shadow`) under
  decorations, Melody and the boy.
- Avoid **pillow shading**, where every shape is lit from its middle with dark rings at the
  edge. The light comes from one side.

## 5. Texture, detail and dithering

- **Readable clusters, not scattered one-pixel noise** (CONFIRMED v2): leaf clumps, stone
  courses, wood grain, render.
- **Natural silhouettes** (CONFIRMED v2). Avoid symmetrical, ball-shaped foliage where a more
  natural shape is possible.
- **Believable material detail at the size it's seen in the game** (CONFIRMED v2).
  High-resolution generated originals are source art. Only the quantised, registered 2× exports
  go in the game.
- **Dithering** (PENDING, v1): only for large, smooth areas such as the sky gradient and
  distant haze. Never dither props or characters.
- Avoid:
  - Orphan pixels.
  - Uneven stair-steps on curves. Keep them regular, 1-1-2-2-3, not 1-3-1-2.
  - **Banding**, where tone bands run parallel to the outline.
  - Anything finer than one art pixel (LOCKED).
- **Detail by depth:**
  - Most detail on Melody, the boy and things you interact with.
  - Medium detail on play-area props.
  - The least on the background.

## 6. Depth (CONFIRMED v2)

- The scene is a sunlit country garden: a warm cream cottage, blue-grey slate, weathered honey
  timber, natural oak foliage, and distant patchwork fields and a lake.
- **The distant landscape has less contrast** than the cottage and the oak trunk.
- **Leave an open view through the middle of the tree layer**, so the fields show through.
- **Background layers repeat sideways; ground fills repeat both ways.**

## 7. Perspective (camera LOCKED)

See `perspective.md`. In short, it's side-on and flat. You only see the tops of low, round
things, as flattened ellipses. Verticals stay vertical.

## 8. Scale and proportions (LOCKED: every size is a contract)

v2 confirms it: **don't move platforms or enlarge characters to imitate the mock-up's
composition.** Measured from the current art, in screen px:

| What | Size | Notes |
|---|---|---|
| Buildings, doors, fences | About **1 m ≈ 46 px** | The house door is about 92 px. The treehouse deck is 262 px up. |
| The boy | 64 px tall (a 36×64 picture) | True scale for a 9–10-year-old |
| Melody | 76×64 standing (96×76 frames) | **Hero scale**, about 1.7× a real lurcher, so she reads and stars. She's as tall as the boy. |
| Small garden things (pots, gnome, bird bath, planter) | 56–90 px tall | **Readable scale**: 2–3× real size, sized for play |
| Collectibles | 20–42 px | Bone 36×20, ball 24×24, power-ups 28–42 wide |
| Platform props (stump, deck) | Set by the jump heights in `config/movement.ts` | Their solid tops are in `config/decorations.ts` |
| Trees | 400–560 px canvases | Same scale as the buildings |

The rules that follow:

- Melody and the boy keep their current sizes. Their physics bodies and the level layouts
  depend on them. If new art wants different proportions, raise it as a gameplay decision.
  Don't just redraw bigger.
- Nothing the player must notice is smaller than 16 px (8 art pixels).
- Size a new prop against this table, not against its real-world size.

## 9. Reading the screen (LOCKED: gameplay first)

- **Solid things look solid.**
  - Platforms and props you can stand on have a clear, lit top edge: a grass or gravel top,
    or a lit plank edge.
  - Scenery you can't stand on must not have a flat, lit top at a jumpable height. v2: richer
    decoration must not add apparent platforms or hide the edge you walk on.
- **Collectibles pop.** They're bright, edged and bob gently, with a glow. They're never
  tucked behind front decorations.
- **Things the boy uses show how they're used:** a handle, a knob, a latch, rungs. The game
  adds the action label.
- **Keep gameplay signs on replacement art**, such as the weight icon on the heavy crate and
  the cracks on cracked blocks.
- **Value hierarchy.** Look at a screenshot in greyscale and squint. The play area, characters
  and items should read first, and the background last.

## 10. Characters and animation

- **The boy** (CONFIRMED v2): teal hoodie (the Boy hoodie ramp), dark shorts, light-soled
  shoes. Since 2026-10-26 he has a full animation set: walk, run, jump, climb (seen from
  behind), pick up, catch, throw, pull, open, call, point, cheer and wait. It's two sprite
  sheets, one for carrying the football. The poses came from `tools/sprites/make_boy.py`; the
  art director drew the final frames (2026-10-26) with swept brown hair, a textured hoodie and
  arms that open out when he cheers, so his face stays clear.
- **Melody** (CONFIRMED v2): her lurcher silhouette, patches and animations stay as they are,
  and so do the robin, squirrel and butterfly sheets.
- **Timing and layout** (LOCKED, CONFIRMED v2): keep every animation's timing, grid, gaps and
  frame count.
  - The frames of a strip are all the same size, laid left to right. Frame sizes are in
    `src/assets/gardenSheets.json`, written by `make_garden.py`.
  - Animate from a fixed base. A decoration stands on frame 0's lowest pixel, so no frame may
    reach lower.
  - Character frames have their feet on the bottom row, except in the air (jump, fall, and the
    gallop's suspension frames).
  - Speeds: idle 4 fps, walk about 9 fps, ambient garden loops 1.5–14 fps, swaying plants
    yoyo.
- Exaggerate the key poses, keep in-betweens few, and hold the extremes.

## 11. HUD, signs and text

- **Badges** (CONFIRMED v2): one round forest-and-gold family, using the existing four keys and
  readable power symbols. The HUD and Heart ramps are in section 2.
- **Next, as code work** (CONFIRMED v2 direction, not done yet): the mock-up's consolidated
  HUD panel, title treatment and quieter tutorial signs.
  - Keep every counter value and control.
  - Use integer display scales: show HUD pictures at the size they're drawn.
  - Use the forest, cream and gold treatment.
  - Don't cover landing areas.
- Known issues for that pass:
  - The badge, heart and bone scales listed in section 1.
  - In some shots (`garden-gate`, `garden-crate`, `garden-goal`) the dark badges sit on dark
    foliage and are hard to read. The code makes it worse: an inactive badge is tinted grey
    (`0x8a8a8a`) at 80% opacity (`HudScene.drawBadges`), which suited the old bright badges
    but sinks the new dark ones into the trees. A backing panel or a different "off" look
    fixes it.
- **Text** (PENDING): Arial Bold with a dark stroke for now. It's readable, but it isn't pixel
  art. Keep text at 16 px or more, words short and contrast high.
- **Signs** are code-drawn boards for now. Real sign art becomes a 9-slice board.
- **Melody's portrait** anchors the HUD.

## 12. Soft effects (LOCKED: only these may be soft)

- Light (sunbeams and glows), air (motes and the vignette) and ground shadows: the `fx-*`
  pictures, plus the code glow.
- They support the art and don't replace it. Keep them subtle (v2: restrained lighting). The
  alpha values are `GARDEN_LIGHT` in `GardenBackground.ts`.
- Never use a soft effect to draw an object's edge. Objects are hard-edged.

## 13. Where the art comes from (CONFIRMED v2)

- The garden-overhaul pack's large pictures were made from generated masters (the built-in
  ImageGen tool). The rest were drawn with the project's editable generator plus the art
  director's overrides.
- **Keep the provenance.** Don't claim every PNG was hand-pixelled. The prompts, masters and
  scripts are in `art/incoming/garden-overhaul-2026-10-25/source/`, and every file's hash,
  colours and contract notes are in that pack's `specs/asset-manifest.json`.
- Changes to art direction go in the brief (`art/reference/art-direction-v2.md`), this guide
  and the manifest.

## Change log

- v1 (2026-10): first version, from the approved in-game garden art and Melody's sheets.
- v1.1 (2026-10-25): marked every rule LOCKED or PENDING while the concept art was awaited.
  Added the pixel-density rule for scaled decorations.
- v2 (2026-10-25): adopted the art director's confirmed brief with the garden-overhaul pack:
  - the material ramps and per-file colour budgets;
  - selective edges instead of outlines everywhere;
  - restrained warm light from the upper left;
  - clustered texture and natural foliage;
  - the depth rules;
  - the teal-hoodie boy and the forest-and-gold HUD family.

  Locked contracts are unchanged. Still PENDING: dithering and the font.
