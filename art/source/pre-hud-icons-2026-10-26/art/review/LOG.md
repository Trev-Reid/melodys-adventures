# Art review log

One entry per approved change: what changed, what the checks said, how it compares with the
target, and who approved it. The review process is in `docs/ART-PIPELINE.md`.

## 2026-10-25 - pipeline set up
Changed: nothing visible. Added art:check, review mode (?review=), capture/compare/approve,
the replacements folder and the melody-art-director Skill.
Checks: art:check clean (trampoline.png waived: Trevor's painted art). The same shot, captured
twice, gives identical pixels.
Approved by: (baselines to be made on Trevor's computer: npm run review:capture, then
npm run review:approve -- --all)

## 2026-10-25 - pipeline checked, Skill updated
Changed: nothing visible. The Skill is updated (style guide v1 marked LOCKED/PENDING, new
calibration.md); it waits in docs/claude-skills/ until it's moved to .claude/skills/.
art:check only flags unused files (npm test was failing on trampoline_old.png). Review:
setup recorded per photo (_setup.json), --display takes several sizes and gets a crisp/soft
verdict. art:palette --from reports a reference picture's art-pixel size.
Checks: npm test 180/180, typecheck and build clean; art:check 0 errors (1 unused file);
two captures of all six shots identical. Stand-in crate: change confined to x 530-640,
y 366-476. Rendering fixes tested on a copy: 1920x1080 went from SOFT to crisp 4x4.
Approved by: (baselines still to be made on the computer doing the art work)

## 2026-10-25 - "before" baselines for ChatGPT's targets and deliveries
Changed: nothing. Captured the six review shots of the unchanged game (0.16) and approved
them as the baselines, so every delivered asset shows exactly what it changes on screen.
Checks: art:check 0 errors (1 warning: trampoline_old.png unused). The captures match the
earlier captures today pixel for pixel. Taken on Linux · chromium 153.0 · software drawing
(Claude's workspace, from a copy checked identical to the project).
Next: ChatGPT makes art/reference/targets/<shot>.png in the same framing (960x540, or
1920x1080 at exactly 2x).
Approved by: Claude, as the "before" picture of the unchanged game - not an art sign-off.

## 2026-10-25 - garden-overhaul pack installed (not approved yet)
Changed: 56 pictures from ChatGPT as art director (art/incoming/garden-overhaul-2026-10-25/):
42 garden pictures (including the trampoline), the 7 HUD pictures, the boy (both frames)
and the five obstacles. Style guide v2 adopted (brief kept in
art/reference/art-direction-v2.md). assetRules.ts: v2 colour budgets for 15 files, and the
trampoline waiver removed (the patch as delivered, plus removing the two old tile rules it
left unreachable). Six asset-only targets in art/reference/targets/. Replaced files kept in
art/source/pre-garden-overhaul-2026-10-25/, including Trevor's painted trampoline.
Checks: every size matches the file it replaces or its contract, and every hash matches the
pack's manifest. Decorations keep the same bottom row. art:check 0 errors (1 warning:
trampoline_old.png unused); npm test 180/180, typecheck and build clean. Compare against the
"before" baselines: 87-95% of each shot changed (sky, backgrounds, tiles, props, HUD).
Against the pack's own after-captures, only text differs (2% of pixels, Windows vs Linux
fonts), the same as between its before-captures and our baselines. The physics bodies
line up with the new art in all six shots: stump top, trampoline mat, treehouse deck and
railing, crate, blocks, walls.
Known: obstacle debris colours in Obstacle.smash still match the old placeholders; dark
badges are hard to read over foliage (inactive badges are tinted grey at 80%); badges show
at 56 px from 60 px art. These go with the HUD/sign pass.
Approved by: not yet. Baselines are still the "before" pictures, waiting for Trevor.

## 2026-10-26 - the boy's animations (not approved yet)
Changed: the boy had two pictures for everything; now he has a full animation set in two
sprite sheets (public/assets/sprites/boy.png, boy_carry.png; 64x80 frames): idle, walk, run,
jump, air, fall, land, climb seen from behind (one frame per 12px climbed), pickup, catch,
throw, throw_up, pull, open, call, point, cheer, wait, and carrying the football. Placeholder
art drawn by tools/sprites/make_boy.py in the delivered look; brief for the art director in
art/briefs/boy-sprite-sheet.md. His old two frames are kept in
art/source/pre-boy-sheet-2026-10-26/. TeamworkSystem plays his actions; the held ball follows
his hands. Gameplay unchanged: same speed, jump, body (24x58) and throw release point.
Checks: art:check 0 errors (1 warning: trampoline_old.png); npm test 187/187 (7 new);
typecheck and build clean. Review shots: only the boy's box changed (0.19-0.20% per shot).
Played through in the game: walk/run, gate, jump, ladder, pickup, throw, catch, Sit!, call.
Approved by: not yet.

## 2026-10-26 - garden-details pack installed (not approved yet)
Changed: 8 pictures from ChatGPT as art director (art/incoming/garden-details-2026-10-26/):
goal (open diamond net), bird bath, washing line, gate, bush, hedge arch, heavy crate (weight
icon kept), treehouse (the two diagonal branches above the roof removed). Same sizes, frame
layouts and footprints; no rule changes. Replaced files kept in
art/source/pre-garden-details-2026-10-26/.
Checks: hashes match the pack's manifest, and each picture was made from the current file.
art:check 0 errors (1 warning: trampoline_old.png); npm test 187/187; build clean. What
changed on screen matches the pack's own before/after captures pixel for pixel (overlap 1.00
in five shots, 0.98 in garden-goal, where our boy differs).
Approved by: not yet. Baselines are still the "before" pictures from 25 Oct.

## 2026-10-26 - trampoline redesign installed (not approved yet)
Changed: public/assets/garden/trampoline.png from ChatGPT as art director
(art/incoming/trampoline-redesign-2026-10-26/): thicker jade padding, padded graphite posts,
a clearer ladder and a coarse open safety net. Same 248x114 canvas and footprint; the bounce
mat is still 50px above the foot, with art across the whole 216px solid. The previous one is
kept in art/source/pre-trampoline-redesign-2026-10-26/.
Checks: hash matches the pack's spec and it was made from the current file. art:check 0 errors
(1 warning: trampoline_old.png); npm test 187/187; build clean. Only garden-trampoline
changed (2.82%, x 332-573, y 402-513), matching the pack's own before/after (overlap 0.996).
Approved by: not yet.

## 2026-10-26 - the boy's animation sheets drawn (not approved yet)
Changed: public/assets/sprites/boy.png and boy_carry.png from ChatGPT as art director
(art/incoming/boy-animation-sheets-2026-10-26/), drawn from art/briefs/boy-sprite-sheet.md:
swept brown hair, textured teal hoodie, navy shorts, light-soled shoes; the cheer opens both
arms so his face stays clear. Same layout (66 frames of 64x80), same boySheet.json; the
ball positions still sit in his hands. The placeholder sheets are kept in
art/source/pre-boy-animation-sheets-2026-10-26/; make_boy.py now refuses to overwrite these.
Checks: hashes match the pack's validation.json; frames within 2px of the placeholders' height
and 4px of their centre. art:check 0 errors (1 warning: trampoline_old.png); npm test 187/187;
build clean; the gallery loads with no errors. Review shots: only the boy's box changed
(0.20% per shot).
Approved by: not yet.
