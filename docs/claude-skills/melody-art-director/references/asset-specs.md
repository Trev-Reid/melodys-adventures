# Asset specifications

These are the sizes, formats, names and **contracts** for every kind of picture. A contract is
whatever about a picture the game's behaviour depends on: its size, where its feet are, where
its solid top is. Change the art freely, but keep the contract.

## Folders

How it is now:

```
public/assets/            shipped with the game, loaded by path (lists in src/assets/artAssets.ts)
  garden/                 Home & Garden: backgrounds, tiles, props, animated strips, fx
  sprites/                Melody's sprite sheets (melody.png, melody_buff.png)
  ui/                     HUD icons, hearts, Melody's portrait
src/assets/
  replacements/           real art for code-drawn placeholders, named after the texture key
  audio/                  recorded sounds (bark.mp3...)
  gardenSheets.json       frame sizes of the animated garden strips (written by make_garden.py)
src/characters/melody/melodySheet.json   Melody's frame size and animations (written by make_melody.py)
tools/art/make_garden.py  draws the garden and HUD art
tools/sprites/make_melody.py  draws Melody
art/                      NOT shipped with the game
  reference/README.md     index of every reference picture and its status
  reference/concept/      approved concept art: originals, unedited
  reference/style/        inspiration from elsewhere (study only, never copied)
  reference/photos/       photos of the real garden, Melody, the family's things
  reference/targets/      one picture per review shot: what that screen should look like
  source/                 editable sources (.aseprite, .kra, .psd) at 1x, and old versions
  palettes/               house.gpl / .png / .json (npm run art:palette) and extracted palettes
  review/baselines/       approved screenshots + _setup.json (npm run review:approve)
  review/out/             latest screenshots and comparison boards (not kept in git)
  review/LOG.md           one entry per approved art change
```

**When the second world arrives**, grow it like this. It's a recommendation, so don't move any
files now: the generators and loaders use the paths above.

```
public/assets/
  characters/<name>/      melody/, boy/, cat/...: sheets and their JSON side by side
  world/<world>/          garden/, park/, beach/...
    backgrounds/  tiles/  props/  fx/
  items/                  bones, treats, power-ups (shared by every world)
  ui/
```

At that point, a small manifest per world (a JSON list written by the art tools) lets the game
load only the world it's playing, instead of everything at start-up. `art:check` reads the
same lists, so it keeps checking only what's loaded.

## Naming

- **lowercase-kebab-case**, ASCII only: `big-tree-leaves.png`. `melody_buff.png` is an older
  exception; new files use hyphens.
- **Prefix by role:**
  - `bg-` for parallax backgrounds
  - `tile-` for repeating ground (fills, and the edges laid along the top)
  - `fx-` for soft light, shadow and air
  - In `ui/`: `heart-`, `badge-`, `portrait-`
  - Props have no prefix: `house`, `stump`
- **Parts:** `<thing>-<part>`, for example `treehouse-leaves`, `basket-back`.
- **Variants:** `<thing>-<variant>`, for example `pot-pink`, `pot-purple`, `cloud-1`, `cloud-2`.
- **Animated strips:** one file per animation, with frames left to right, e.g.
  `washing-line.png`. Frame sizes go in `gardenSheets.json`.
- **Replacement art:** exactly the texture key: `item-sausage.png`,
  `obstacle-heavyCrate.png`. The key decides the name, even where it isn't kebab-case.
- **Texture keys in code:** `garden-<file>` for garden pictures, `ui-<file>` for HUD pictures,
  and the placeholder keys in `src/assets/keys.ts`.
- **References:** `<subject>[-<variant>].png` in `art/reference/<folder>/`, with targets named
  after the shot (`garden-house.png`).
- **Old versions** don't belong in `public/assets/`, because everything there ships with the
  game. Keep them in `art/source/`. `art:check` flags unused files. Right now that's
  `public/assets/garden/trampoline_old.png`.

## Every picture: the format

- PNG, 8-bit RGBA (or palette with transparency), **not interlaced**, with **no colour
  profile**. See `transparent-png.md`.
- Stored at screen size, on the 2×2 grid, with even dimensions.
- Nothing over 2048 px on a side. 4096 is the hard limit, so split bigger things into parts
  or repeating tiles.
- Shown at scale 1. Tiled decorations keep `scale` at 1, and `art:check` warns otherwise.

## Specs by role

| Role | Folder | Edges | Colours | Anchor (where the game holds it) | Notes |
|---|---|---|---|---|---|
| Background layer | `garden/bg-*` | Cutout | ≤ 40 | Bottom edge, repeated sideways | Must join up left↔right; no outlines; lighter and bluer with distance |
| Sky | `garden/bg-sky` | Opaque | Any (dithered) | Stretched to the screen | 960×540 |
| Ground fill | `garden/tile-*` | Opaque | ≤ 16 | Top-left, repeated both ways | Must join up both ways |
| Ground edge | `garden/tile-*-top`, `-cap` | Cutout | ≤ 16 | Fixed offsets from the surface | Exact heights, see below |
| Prop / decoration | `garden/<name>` | Cutout | ≤ 48 | **Bottom-centre on its lowest visible pixel** | Outlined; solids in `config/decorations.ts` |
| Decoration part | `garden/<name>-<part>` | Cutout | ≤ 48 | Same canvas as the main picture | Same size as the main picture, drawn in place |
| Animated strip | `garden/<name>` | Cutout | ≤ 48 | Frame 0's lowest pixel | Frames the same size; sizes in `gardenSheets.json` |
| Item / collectible | `garden/bone`, replacements | Cutout | ≤ 16 | Centre | Pick-up box = picture + 6 px |
| Character | `sprites/`, replacements | Cutout | ≤ 32 | **Feet** (bottom-centre) | Feet on the bottom row; facing right |
| Effect | `garden/fx-*` | Soft | Any | Varies | Light, shadow, air only; white if the game tints it |
| HUD | `ui/` | Cutout | ≤ 40 | Top-left | Drawn at the shown size, no in-game scaling |

## The garden and HUD pictures, and their contracts

Sizes and colour counts were checked against the files on 2026-10-25, after the
garden-overhaul pack went in.

| Picture | Size (frames×w×h) | Role | Edges | Colours | Used as |
|---|---|---|---|---|---|
| `bg-sky` | 960×540 | background | opaque | gradient | Sky, fixed behind everything |
| `cloud-1`, `cloud-2` | 160×68, 112×52 | background | cutout | 2 | Drifting clouds |
| `bg-far` | 960×340 | background | cutout | 95 (v2 budget 96) | Far hills (parallax 0.12) |
| `bg-trees` | 960×520 | background | cutout | 95 (v2 budget 96) | Tree line (parallax 0.3) |
| `bg-fence` | 256×144 | background | cutout | 95 (v2 budget 96) | Fence and hedge (parallax 0.6) |
| `tile-dirt` | 64×64 | tile | opaque | 32 (v2 budget 32) | Fill under grass ground |
| `tile-stone` | 96×96 | tile | opaque | 32 (v2 budget 32) | Fill of stone walls and gravel paths |
| `tile-grass-top` | 64×36 | tile | cutout | 11 | Grass along the top. **Height 36, laid 8 px above the surface** |
| `tile-grass-cap` | 20×60 | tile | cutout | 6 | Rounded grass ends. **20×60, placed 6 px out and 10 px up** |
| `tile-gravel-top` | 64×20 | tile | cutout | 5 | Gravel along the top. **Height 20, laid 4 px above the surface** |
| `tile-wood`, `tile-slab` | 64×24 | tile | opaque | 5 | Thin boards and paving; the top row is the lit edge |
| `fx-shadow` | 64×16 | fx | soft | - | Ground shadow, stretched under decorations and characters |
| `fx-shade-top` | 8×28 | fx | soft | - | Shade under the grass lip |
| `fx-sunrays` | 480×540 | fx | soft | - | Sunbeams (ADD blend), top right. Since v2 a barely visible wash |
| `fx-mote` | 4×4 | fx | soft | 1 | Pollen specks |
| `fx-vignette` | 320×180 | fx | soft | - | Darker corners, stretched to the screen |
| `bone` | 36×20 | item | cutout | 3 | The collectible; also the HUD counter (1.3×) and pause cursor (1.2×) |
| `football` | 24×24 | item | cutout | 6 | The boy's ball (and a decoration) |
| `house` | 600×344 | prop | cutout | 128 (v2 budget 128) | Decoration `house` |
| `trampoline` | 248×114 | prop | cutout | 64 (v2 budget 64) | Decoration `trampoline`. **Mat: solid top 50 px above the bottom.** Pixel art, redesigned 2026-10-26 (padded posts, coarse net; 63 colours). Earlier versions: `art/source/pre-trampoline-redesign-2026-10-26/` (the overhaul's) and `art/source/pre-garden-overhaul-2026-10-25/` (Trevor's painted original) |
| `stump` | 120×112 | prop | cutout | 63 (v2 budget 64) | Decoration `stump`. **Solid top 98 px above the bottom** |
| `treehouse` + `treehouse-leaves` | 440×560 (both) | prop | cutout | 128 / 64 (v2 budgets) | **Deck solid 262 px up; railing; ladder at x -90..-48 from the centre** |
| `big-tree` + `big-tree-leaves` | 400×500 (both) | prop | cutout | 64 / 63 (v2 budgets 64) | Leaves sway and drop |
| `goal` | 224×120 | prop | cutout + net glass | 3 | Decoration `goal`; ball zone 192×104 |
| `egg-chair`, `pot-*`, `bush*`, `planter`, `drain`, `gnome`, `fern` | various | prop | cutout | 4–64 | Decorations. `egg-chair`, `bush-berries` and `bush-hydrangea` have v2 budgets of 64 |
| `hedge-arch` | 104×300 | prop | cutout | 13 | The hedge the side gate is in. **Solid hedge from 150 to 300 px up** (`config/teamwork.ts` GATE) |
| `gate` | 2×64×156 | prop | cutout | 9 | Frame 0 closed, frame 1 open. **Door solid 30×150** |
| `lever` | 2×36×60 | prop | cutout | 12 | Frame 0 up, frame 1 pulled |
| `basket`, `basket-back` | 80×36, 80×80 | prop | cutout | 7 | The lift: front (depth 11) and back (depth 8) halves. **Floor 74 wide** |
| `pulley` | 80×168 | prop | cutout | 15 | The lift's winch; wheel at (60, 24) |
| `flowers`, `tall-grass` | 4×80×36, 4×52×44 | prop | cutout | 6 | Swaying (yoyo) |
| `washing-line` | 4×300×180 | prop | cutout | 20 | Flapping |
| `bird-bath` | 2×80×88 | prop | cutout | 8 | Rippling; a robin perches 64 px up |
| `squirrel`, `robin`, `butterfly` | 5×52×44, 5×32×28, 4×20×16 | prop | cutout | 4–7 | Critters (`AmbientLife.ts`); what each frame means is in that file |
| `leaf` | 4×14×14 | prop | cutout | 3 | Falling leaves (tumbling) |
| `bird-far` | 2×14×8 | background | cutout | 1 | Distant flock |
| `ui/heart-full`, `ui/heart-empty` | 26×24 | ui | cutout | 5 / 2 | HUD health, shown at 1.2× (to fix: draw at the shown size) |
| `ui/badge-*` | 60×60 | ui | cutout | 5 | Power-up badges, one forest-and-gold family. Shown at 56 px (0.93×) and dimmed when off (to fix in the HUD pass) |
| `ui/portrait-melody` | 76×76 | ui | cutout | 15 | The HUD's anchor |

The bold contracts are numbers in code. If a redraw moves a surface, the solid must move too,
in `src/config/decorations.ts` or `src/config/teamwork.ts`. That's a deliberate gameplay change
(see `replacing-placeholders.md`). `npm run art:check` warns when a solid top no longer has art
under it.

**The boy's sheets** (`sprites/boy.png`, `boy_carry.png`), since 2026-10-26:

- Frames are 64×80 with 4 px transparent gaps, 8 columns × 9 rows (66 frames used), the same
  layout in both skins. `carry` holds the football in both hands.
- Facing right, on the frame's centre line, about 64 px tall. His physics body is 24×58 at the
  bottom centre, whatever the picture.
- Feet are on the bottom row in every grounded frame (`grounded` in `boySheet.json`).
- `boySheet.json` has the animations, their speeds, and `ball`: where the held football goes in
  each frame. In carry frames it stays within 8 px of 13 px forwards, 27 px up, where a throw
  starts (`tests/boyAnimation.test.ts`).
- The PNGs are the art director's (2026-10-26, brief: `art/briefs/boy-sprite-sheet.md`). The
  layout and `boySheet.json` came from `tools/sprites/make_boy.py`, which won't overwrite them.
  The placeholder sheets are in `art/source/pre-boy-animation-sheets-2026-10-26/`.

**Melody's sheets** (`sprites/melody.png`, `melody_buff.png`):

- Frames are 96×76 with 4 px transparent gaps, 8 columns × 8 rows, and the same layout in every
  skin.
- Feet are on the bottom row in every grounded frame.
- Animations and speeds are in `melodySheet.json`. Both the PNGs and the JSON are written by
  `tools/sprites/make_melody.py`.

## Placeholders and their replacements

These have contracts in `src/assets/placeholderSpecs.ts`, with a quick table in
`src/assets/replacements/README.md`. **The boy and the five obstacles have real art** since
2026-10-25 (garden-overhaul pack, in `src/assets/replacements/`). The contracts below still
apply to any redraw. The others are still drawn by code.

- **The boy** is no longer a placeholder: since 2026-10-26 he's a sprite sheet (above).
- **Collectible treats:** their placeholder size ±4 px, because pick-up boxes follow the
  picture. Sausage 30×16, super sausage 42×22, sniff treat 36×22, bark biscuit 28×28, squirrel
  toy 40×36, ball 22×22.
- **The cat:** 52×48 ±8, feet on the bottom row.
- **Obstacles:** **exactly** their `config/obstacles.ts` size, because the physics box is the
  picture. Heavy crate 110×110, wooden barrier 44×200, fence 28×150, cracked and stone blocks
  48×48. When one breaks, `Obstacle.smash` throws out bits in colours fixed in code. They
  still match the old placeholders: cream for the fence and sandy brown for cracked blocks.
  Against the new brown fence and grey blocks they're wrong, so update them in the same pass
  as any obstacle redraw.
- **Tinted effects** (glow, debris, confetti) are drawn in white.
- **Scent icons, paw prints, the classic-level tiles, hill and cloud** are listed in the spec
  file.

These are drawn with shapes every frame (`Graphics`), so a PNG can't replace them yet:

- Sign boards (`entities/Sign.ts`)
- Ladders placed in Tiled (`LevelBuilder.drawLadder`). The treehouse's own ladder is part of its
  picture.
- The lift rope (`Lift.ts`)
- Crack lines on obstacles
- The sprint bar
- HUD panels and the action prompt
- Bark rings
- The poofs and the sniff ring

Turning one of these into art takes a small code change: give it a texture key and a spec,
then load the picture. Do the sign board (a 9-slice) and the ladder (a repeating tile) first.
