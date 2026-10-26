# Visual QA: reviewing the running game against its targets

Screens are compared in three ways:

- **Against the target**, which is the concept art or a mock-up of that screen. This is a
  matter of judgement: is it getting closer? It's measured by palette, brightness, contrast,
  colourfulness and detail.
- **Against the last approved photo** (the baseline). This is exact: what changed, and was it
  meant to?
- **At real window sizes.** Is it crisp when the browser scales it up?

## The shots

A **shot** is one screen of the game, set up exactly the same way every time. Shots are
defined in `src/review/shots.json`:

| Shot | Shows |
|---|---|
| `garden-house` | The start: the house, patio pots, the first sign and bone |
| `garden-gate` | The side gate in the hedge and the raised flower bed |
| `garden-trampoline` | The stump, the gnome, the trampoline and the high bones |
| `garden-crate` | The drain, power-ups, the heavy crate and the step up to the back lawn |
| `garden-treehouse` | The treehouse, its ladder, the basket lift, the egg chair and the bird bath |
| `garden-goal` | The football goal, the bark-break blocks and the big tree |

To open one in the browser, run `npm run dev`, then go to
`http://localhost:5173/?review=garden-house`. In review mode:

- Melody and the boy stand where the shot says.
- The camera holds still and the debug overlay is off.
- The game runs a fixed number of frames with the same "random" numbers and clock, so the
  picture comes out **identical, pixel for pixel, every time**. This was checked by capturing
  all six shots twice: 0 pixels differed.

To add a shot, press **F9** while playing in `npm run dev`. It saves a photo and copies a
ready-made shot description to the clipboard. Paste that into `shots.json`, then give it a
name and a note.

**Targets:** `art/reference/targets/<shot>.png`, the same view as the shot, in any 16:9 size.
See `calibration.md`. The current six (2026-10-25) are the art director's own captures of
the game with the garden-overhaul pack installed. They're asset-only targets: they show
where the art should end up, not a new composition. They were taken on Windows, so their
text renders differently from captures made on Linux (about 2% of pixels, all in text). The
board labels the panel "TARGET (CONCEPT ART)" whatever the target is.

## The loop

```
npm run review:capture          photograph every shot (or name some)  -> art/review/out/current/
npm run review:compare          boards + report.html + report.md        -> art/review/out/
  ...look, fix one thing, capture, compare, repeat...
npm run review:approve -- <shot>   when it's right: it becomes the new baseline
```

- `--display 1920x1080,1366x768` (on capture) also photographs what a player sees in those
  windows (`<shot>@1920x1080.png`). For whole scales, compare then gives a verdict: **crisp**
  (every art pixel the same size) or **SOFT** (the browser is smoothing it). Use it for any
  rendering or scaling change.
- `--fail-on-change 0.5` (on compare) exits with an error if any shot changed by more than
  0.5% since it was approved. Use it to prove a change doesn't touch the screen, for example
  tidying code or moving depths into one file.
- Capturing needs Playwright, once: `npm i -D playwright`. It uses Playwright's Chromium if
  that's installed, otherwise Edge or Chrome.

## Baselines and setups

Text and edges are drawn slightly differently by different computers, browsers and browser
versions. So a photo is only compared pixel for pixel with a baseline approved on **the same
setup**.

- Capture writes `art/review/out/current/_setup.json`, for example
  `"Windows · msedge 141.0 · software drawing"`.
- Approve records each shot's setup in `art/review/baselines/_setup.json`.
- Compare warns **"approved on another setup"** when they differ. Then re-make the baselines
  on the unchanged game (`review:capture`, then `review:approve -- --all`) before judging any
  change.
- Keep baselines in git, as the record of how the game looked. Never commit `art/review/out/`.

## Reading a board (`art/review/out/<shot>-board.png`)

```
+-------------------------+-------------------------+
| TARGET (concept art)    | NOW          [palette]  |
+-------------------------+-------------------------+
| LAST APPROVED           | CHANGES (magenta, boxed)|
+-------------------------+-------------------------+
```

- **Palette swatches** (top right of TARGET and NOW) are the 8 main colours of each. Do they
  match in warmth, brightness and saturation?
- **Changes:** magenta pixels have changed, and a yellow box surrounds them. The label gives the
  share of the screen. A placeholder swap should change only that thing's box. When this was
  tested with a stand-in crate, the change was 2.27%, all inside x 530–640, y 366–476: exactly
  the crate.
- **`report.md`** gives the numbers, notes in plain words against the target ("the target is
  brighter / more colourful / busier"), crispness verdicts for window photos, and setup
  warnings.
- **`report.html`** (open it in a browser) shows everything side by side, with a slider that
  fades between approved and now.

How to read the numbers:

| Number | Meaning | Rough "close enough" |
|---|---|---|
| brightness | Average lightness, 0–1 | Within 0.05 of the target |
| contrast | Spread of lights and darks | Within 0.03 |
| colourfulness | Average saturation | Within 0.06 |
| detail | Share of the screen on strong edges | Within 0.03. A *calmer* target usually means our art is too noisy. |

They're hints, not a score. A screen can match all four and still look wrong, so use the
checklist.

## The checklist (every review)

**Pixels**

- [ ] Everything is on the 2×2 grid: nothing smooth-scaled, blurry or extra-sharp, and no
      1-pixel detail.
- [ ] There are no soft or haloed edges around props or characters.
- [ ] The window photos say **crisp** at whole scales. There's no blur and no wobbling uneven
      pixels.

**Style** (against the style guide and the target)

- [ ] Colours come from the house ramps. Nothing is neon or muddy, and there's no pure black.
- [ ] The light comes from the agreed direction on everything new.
- [ ] Touchable things have the outline. Background layers don't.
- [ ] Detail density matches the neighbours: no very detailed prop next to a simple one.
- [ ] Perspective: front-on, verticals vertical, and only low things show their tops.

**Gameplay readability**

- [ ] Squint, or look in greyscale. Melody, the boy, items and ledges read first.
- [ ] What's solid looks solid. What isn't, doesn't.
- [ ] Collectibles aren't hidden behind front decorations.
- [ ] Signs and prompts can be read at a glance.
- [ ] Interactables show how they're used.

**Layering**

- [ ] Nothing is in front of something it should be behind: the basket halves, leaves, signs,
      the gate.
- [ ] Everything stands on the ground, with no gaps under feet or posts.

**Motion** (play it, because screenshots can't show this)

- [ ] Animations loop smoothly, and bases don't wobble.
- [ ] Parallax layers glide without shimmering.
- [ ] Nothing jitters when the camera moves.

## Signing off

Record each approved change in `art/review/LOG.md`. Keep it short:

```
## 2026-10-25 - garden-crate
Changed: real heavy-crate art (src/assets/replacements/obstacle-heavyCrate.png)
Checks: art:check clean; diff only inside the crate (530-640, 366-476); setup Windows · msedge
Target: palette close, ours slightly darker - fine
Approved by: Trevor + Leo
```

The kids are the real reviewers. If Leo or Daniel can't tell what something is, it isn't done.
