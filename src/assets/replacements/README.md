# Replacement art

Some things in the game are still drawn by code: sausages, power-up treats and
the cat. Their "placeholder" pictures are made in `src/assets/placeholders.ts`.
The heavy crate, the wooden barrier, the fence and both blocks have real art in
this folder, from the garden-overhaul pack (2026-10-25). The boy isn't a
placeholder any more: he's a sprite sheet (`public/assets/sprites/boy.png`, see
`art/briefs/boy-sprite-sheet.md`).

To swap one for real art, save a PNG in **this folder**, named after the
placeholder's key. The game loads it instead. You don't need to change any code,
and nothing about how the game plays changes.

| Save as | Replaces | Size (px) |
|---|---|---|
| `item-sausage.png` | sausage | about 30×16 (±4) |
| `item-super-sausage.png` | Super Sausage | about 42×22 (±4) |
| `item-sniff-treat.png` | sniff treat | about 36×22 (±4) |
| `item-bark-biscuit.png` | bark biscuit | about 28×28 (±4) |
| `item-squirrel-toy.png` | squirrel toy | about 40×36 (±4) |
| `item-ball.png` | Melody's ball | about 22×22 (±4) |
| `npc-cat.png` | the neighbour's cat (feet on the bottom row, facing left) | about 52×48 (±8) |
| `obstacle-heavyCrate.png` | heavy crate | **exactly** 110×110 |
| `obstacle-woodenBarrier.png` | wooden barrier | **exactly** 44×200 |
| `obstacle-fence.png` | fence post | **exactly** 28×150 |
| `obstacle-crackedBlock.png` | cracked block | **exactly** 48×48 |
| `obstacle-stoneBlock.png` | stone block | **exactly** 48×48 |

The full list, with notes on each one, is in `src/assets/placeholderSpecs.ts`.
The sizes come from the game: crates and blocks get their physics box from the
picture, and items get their pick-up box from it. The steps are in
`.claude/skills/melody-art-director/references/replacing-placeholders.md`
(summary in `docs/ART-PIPELINE.md`, section 4).

Before you play, check the picture:

```
npm run art:check
```

It tells you if the size is wrong, if the edges are soft, or if the
background isn't really transparent. It also tells you if the art isn't
drawn on the game's 2×2 pixel grid. (One art pixel is 2×2 screen pixels: draw
at half size and export at 200%.)

To go back to the placeholder, delete the PNG.
