# Calibrating to the concept art

Do this as soon as the approved concept art or reference screenshots are added, and before any
art change that depends on style. It turns pictures into decisions: a target for each screen,
and a style guide with every PENDING value settled.

**Done once, on 2026-10-25.** The art director (ChatGPT, delegated by Trevor) supplied the v2
brief and six asset-only targets with the garden-overhaul pack. `style-guide.md` is now v2. Run
this again when new approved concept art arrives, and write v3 the same way.

## 1. Register the references

| Folder | What goes in it | Authority |
|---|---|---|
| `art/reference/concept/` | Approved concept art for this game: originals, unedited | **Wins** over the style guide |
| `art/reference/style/` | Inspiration from elsewhere: screenshots of other games, artists' work | Study only. Never trace, copy or ship it |
| `art/reference/photos/` | Photos of the real garden, Melody, the family's things | Shapes, colours, details |
| `art/reference/targets/` | One picture per review shot (step 2) | What that screen should look like |

- **Names:** `<subject>[-<variant>].png`, in lowercase kebab-case. For example `garden-house.png`,
  `melody-turnaround.png`, `hud.png`.
- **PNG for the tools.** The tools read PNG only. If a reference came as a JPG or WebP, keep
  the original next to a PNG copy with the same name. Any converter works, for example Paint's
  "Save as PNG", or Python's Pillow:
  ```
  python -c "from PIL import Image; Image.open('x.jpg').save('x.png')"
  ```
- **Index every file** in `art/reference/README.md`: what it shows, its status (approved, mood
  only, or superseded), who approved it and when, and notes ("Melody's colours are final;
  ignore the boy"). Only **approved** concept art can override the style guide. If two
  approved pictures disagree, list the conflict and ask Trevor. Don't pick one quietly.

## 2. Make a target for each review shot

A target is what one exact screen should look like: `art/reference/targets/<shot>.png`, 16:9,
any size (960×540 or 1920×1080 is easiest). Shots are in `src/review/shots.json`.

- **The concept art shows that place:** crop it to the shot's framing. Use
  `art/review/out/current/<shot>.png` as the guide, with the same ground line, horizon and
  objects in view.
- **The concept art shows a different view:** crop the closest region. Or make a mock-up by
  painting over the capture in the concept's colours and style. Mark it as a mock-up in the
  index.
- **There's no concept art for that shot:** leave it without a target. It still compares with
  its baseline.
- **The concept art has a screen the shots don't cover:** add a shot (F9 in `npm run dev`),
  then make its target.

## 3. Measure

For each approved concept picture:

```
npm run art:palette -- --from art/reference/concept/<file>.png --colours 32
```

This writes its palette (`art/palettes/<file>.gpl` / `.png`) and a pixel preview, and prints
its **art-pixel size**:

- **"Art pixels: N×N … X game pixels per art pixel".** The concept is pixel art. If it shows a
  whole game screen, compare X with the game's 2.
  - About 2: it matches.
  - Clearly different: **stop and ask**. Either the concept was drawn at another resolution, or
    the game's pixel scale would have to change. That would touch every picture and every size
    contract, so it's never done quietly.
- **"Art pixels: none found".** It's painted, smoothed or AI art. Use it for palette, light,
  composition and mood, not for pixel density.

Then, for every shot that has a target:

```
npm run review:capture
npm run review:compare
```

`report.md` gives brightness, contrast, colourfulness, detail and main colours, now against the
target, with notes in plain words. The boards show them side by side.

Proportions are measured by eye on the target: Melody against the door, the boy against
Melody, props against the scale table in `style-guide.md`.

## 4. Settle each PENDING value

Go down the "At a glance" table in `style-guide.md`: palette, outlines, light, texture, depth,
proportions, text and UI. For each one:

1. Write what the concept art shows, in hex colours and px sizes.
2. Decide: keep v1, change it to the concept's value, or **ask Trevor**. Ask when the concept
   is unclear, when approved pictures disagree, or when matching it would change gameplay
   (sizes, solid surfaces, readability).
3. Proportions and sizes are contracts. If the concept's Melody is a different size from
   ours, that's a gameplay decision for Trevor, not a redraw.

## 5. Write style guide v2

- In `style-guide.md`, mark each settled row **CONFIRMED (v2)** with its concrete values,
  update the "At a glance" table, and add a change-log line.
- **Palette changes** go in the ramps at the top of `tools/art/make_garden.py` and
  `tools/sprites/make_melody.py`, because the house palette is generated from them. Then run
  `npm run art:palette`. Regenerating art with `make_garden.py` redraws generated files only;
  it keeps hand-made ones.
- **Limits:** change colour budgets or other rules in `tools/art/assetRules.ts` if v2 needs
  it, then run `npm test`.
- **The Skill:** update the "Status" section of `SKILL.md`, saying which references were added
  and when, and that the style guide is v2.
- **The log:** add an entry to `art/review/LOG.md`, for example "Calibrated to concept art
  (files…): palette ramps X and Y warmer; outlines stay; light moved to the upper right…".

## 6. Plan the screens

For each shot that has a target, list the differences biggest first: rendering, then palette
and light, then background planes, then props, then details. Mark the ones that would change a
contract. Then improve one test screen with `SKILL.md` workflow C (`garden-house` is the
suggested first one) before rolling the changes out to the rest.

## Don't

- Put concept art in the game. It's a target, not an asset.
- Copy or trace pictures from `style/`. Learn from them, and draw our own.
- Change the pixel scale, Melody's or the boy's size, or any solid surface to match a picture
  without Trevor's say-so.
