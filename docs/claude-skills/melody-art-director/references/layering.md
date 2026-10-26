# Layering rules

Phaser draws objects in order of their **depth**: higher numbers are drawn on top. The level
(`LevelScene`) and its overlays (`HudScene`, `DebugScene`, `PauseScene`) are separate scenes,
and overlays are always drawn on top of the level, whatever the depths.

## Depth bands in the level (as the game is now)

Depths are numbers written in about 20 files (see "Where the numbers live"). Each band has
one job. The table was spot-checked against the code on 2026-10-25 (`LevelBuilder.ts`
`DEPTH`, `GardenBackground.ts`, `LevelScene.ts`).

| Band | Depth | What's in it |
|---|---|---|
| Sky | -60 to -35 | Sky -60, clouds -50, far hills -40, far birds -35, tree line -30, fence -20 (parallax: `GardenBackground.ts`) |
| Back light | -15 | Sunbeams behind the garden |
| Back scenery | -6 to -1 | Decorations set to `back` -6 (parts ±0.1: leaves behind the treehouse -6.1, the big tree's leaves -5.9), hedge arch -5.5, distance markers -5, pulley -5, rope -4.9, ladders -4, sign boards -4, sign text -3, bark-target trees -2/-1 |
| Ground | 0 to 1.5 | Platform fill 0, shade under the grass lip 0.5, grass/gravel tops and caps 1, ground shadows 1.5 |
| Interactables | 3 to 6 | Bark-target ball 3, lever 3, obstacles 4, gate 4, collectible glows 4, world tint 4.5 (SUPER SNIFF darkening; everything below it gets darker), collectibles 5, football 6, leaf piles 6 |
| Characters | 8 to 12 | Robin and squirrel 8, basket back 8, the boy 9 (10 when you're playing him), Melody 10 (9 when the boy is active), the ball while carried 9.5/10.5, basket front 11, falling leaves 11 (or -5.5, behind), butterflies 12, scent trails 12–17 |
| Above characters | 20 to 30 | Sprint bar, sleep "z" 20, celebration text 30, debris and leaf bursts 30 |
| Effects | 35 to 45 | Bark rings and poofs 35, pollen motes 36, front sunbeams 38, front decorations 40, "say" text 40, active-character marker 40, action prompt 41, cheers 42, vignette 45 |
| HUD scene | 90 to 200 | Confetti 90, level-complete panel 100, swap toast 200 |
| Debug scene | 1000 | Debug text |

## Rules

1. **Put new things in the band for their job.** Don't invent a depth between two existing
   ones unless it really belongs between them, as the basket does: back 8, Melody 10, front 11.
2. **Things that wrap around a character use two pictures:** a back half and a front half, on
   either side of the character's depth. The basket does this (`basket-back` at 8, `basket`
   at 11).
3. **Parts of a decoration** (leaves on a tree) are drawn at the decoration's depth ±0.1.
   `behind: true` puts them at -0.1. Parts are full-size canvases that line up with the main
   picture, so don't trim them.
4. **Front decorations (depth 40) hide gameplay.** Use them sparingly, only at the screen's
   bottom edge, never over items, ledges or signs.
5. **Anything at or above 4.5 isn't darkened by SUPER SNIFF's world tint.** Keep items,
   characters and scents above it, and scenery below it.
6. **The active character is drawn on top** (10). Followers drop to 9.
7. **Light effects go above what they light:**
   - Front beams (38) and motes (36) go over the play area.
   - The vignette (45) goes over everything in the level.
   - None of them goes over the HUD.

## Where the numbers live

- `src/levels/LevelBuilder.ts`: the `DEPTH` table for decorations and platforms, plus ladders.
- `src/levels/GardenBackground.ts`: `GARDEN_LAYERS` (parallax) and the light effects.
- Each entity's own file in `src/entities/` (obstacles, collectibles, gate, lever, lift, signs,
  bark targets, scent).
- `src/characters/` for Melody, the boy, the sprint bar and the aura, and
  `src/gameplay/ambient/AmbientLife.ts` for critters.
- `src/scenes/LevelScene.ts` for say/cheer text, the world tint and the active-character swap.

**Recommended later:** move these numbers into one `src/config/layers.ts`, with the bands
above as named constants, and use them everywhere. That's a mechanical change with no
visual difference (the review shots should come back with 0% changes, which proves it). It's
worth doing before adding a second world.
