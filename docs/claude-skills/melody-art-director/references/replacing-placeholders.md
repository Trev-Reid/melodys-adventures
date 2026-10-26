# Replacing art without changing the game

The rule: **the art changes, the gameplay numbers don't.** Every picture has a contract: its
size, where its feet or anchor are, and where its solid parts are. Real art keeps the contract.
If the art truly needs a different contract, that's a *gameplay change*. Make it on purpose,
separately, check it in play, and say so.

This process was tested end to end on 2026-10-25 with a stand-in heavy crate (110×110, drawn
on the 2×2 grid):

- `art:check` passed.
- The compare showed **2.27% of `garden-crate` changed, all inside x 530–640, y 366–476**,
  exactly the crate's box.
- The stand-in was then removed.

## A. A placeholder drawn by code (the boy, treats, crates, the cat...)

1. **Find its key and contract** in `src/assets/placeholderSpecs.ts`. There's a summary in
   `src/assets/replacements/README.md`. For example, `item-sausage` is about 30×16 (±4), and
   `obstacle-heavyCrate` is exactly 110×110.
2. **Photograph the game before anything changes** (`SKILL.md`, workflow A):
   - Run `npm run review:capture`, then `npm run review:compare`.
   - If compare says "approved on another setup", or there are no baselines, run
     `npm run review:approve -- --all` now, on the unchanged game.
3. **Draw it.**
   - Work at half size on the 2×2 grid, using the house ramps, the outline rule and the agreed
     light.
   - Keep the gameplay signs, such as the crate's weight icon and the cracks in a block.
   - Characters stand with their feet on the bottom row and face right.
   - Tinted effects are drawn in white.
4. **Check it before it goes in:**
   `npm run art:check -- --file path/to/new.png --as <key>` (for example `--as boy`).
5. **Save it** as `src/assets/replacements/<key>.png`. The game loads it instead of drawing the
   placeholder, with no code change. In `npm run dev`, the browser console warns if it's the
   wrong size.
6. **`npm run art:check`.** Fix every error.
7. **`npm run review:capture`, then `npm run review:compare`.** On the board:
   - The "What changed" panel should show magenta **only where that thing is**. `report.md`
     gives the changed area as x/y bounds.
   - Changes anywhere else mean something moved. Stop and find out why.
   - If no review shot shows the thing, add one (F9 in `npm run dev`, or edit
     `src/review/shots.json`).
8. **Play it.** Grab the item, push the crate, walk the boy around. It should feel the same.
9. **Approve:** `npm run review:approve -- <shot>`. Add a line to `art/review/LOG.md`, then
   commit the PNG with the new baseline.

To undo, delete the PNG, and the placeholder comes back.

## B. A garden picture that already exists (`public/assets/garden/*.png`)

1. **Keep the same canvas size** as the old picture, unless there's a reason not to. Keep the
   same ground point: the game stands it on its lowest visible pixel.
2. **Keep the parts lined up.** `treehouse-leaves` is the same 440×560 canvas as `treehouse`,
   drawn in place, and `big-tree-leaves` matches `big-tree`.
3. **Keep solid surfaces at the same height:** the stump top at 98 px, the trampoline mat at
   50 px, the treehouse deck at 262 px. art:check warns if a solid top loses its art.
4. **Strips** keep the same frame size and count, and the base doesn't move between frames.
5. **Save over the old file.** Keep the old one in `art/source/`, not in `public/assets/`.
   `make_garden.py` **won't overwrite a hand-made file**: it remembers the fingerprints of the
   files it drew and leaves any others alone. `--force` brings the drawn one back; never use it
   without asking.
6. Then follow steps 6–9 of A.

## C. Melody (`tools/sprites/make_melody.py`)

- Her art is drawn by code from a rig. Change the drawing functions or colours in
  `make_melody.py`, then run it. It writes both skins and `melodySheet.json`.
- **Contract:** 96×76 frames with 4 px gaps, the same layout for every skin, and her feet on the
  bottom row in grounded frames. art:check checks all of this.
- A hand-drawn Melody sheet must follow the same layout exactly. Otherwise
  `melodySheet.json` and the animations have to change too, and that's code.

## C2. The boy (`tools/sprites/make_boy.py`)

- His placeholder art is drawn by code from a rig, like Melody's. Change the poses or colours
  in `make_boy.py`, then run it. It writes both skins (`boy.png`, `boy_carry.png`) and
  `boySheet.json`.
- **Contract:** 64×80 frames with 4 px gaps, the same layout for both skins, feet on the bottom
  row in grounded frames, and the ball positions in `boySheet.json`. art:check and
  `tests/boyAnimation.test.ts` check them. The full brief is `art/briefs/boy-sprite-sheet.md`.
- Hand-drawn sheets replace the PNGs under the same names. After that, `make_boy.py` refuses
  to overwrite them (`--force` does, so ask first). If the hands move, update `ball` in
  `boySheet.json` to match.

## D. Something new (a new prop or character)

New things need code: a key, a spec, a place in the level, and maybe behaviour. The order is:

1. The spec first: role, size, anchor and solid parts.
2. Placeholder art or real art.
3. The code.
4. A review shot that shows it.
5. The checks.

Size it against the scale chart in `style-guide.md`. If it's loaded from `public/assets`, add
it to the lists in `src/assets/artAssets.ts`. Otherwise art:check calls it unused and doesn't
check it.

## When the art *should* change the contract

Sometimes the better picture is a different size. For example, the boy's real sprite might be
48×80. Then:

1. Say so, and agree it with Trevor. It changes the feel of the game.
2. Change the number in the config (`config/obstacles.ts`, `config/decorations.ts`, or the spec
   in `placeholderSpecs.ts`). Don't hack the picture to fit.
3. Run `npm test`. Gameplay tests may need deliberate updates, which keeps the change honest.
4. Play-test the parts it affects, then review and approve.
