# Brief: the boy's sprite sheets

For the art director. Written 2026-10-26.

**The ask:** redraw the boy's animation frames so he looks as good as the new garden. His
moves are already in the game, drawn by a script as placeholders: walking, running, jumping,
climbing, picking up and throwing the ball, pulling levers, opening gates, calling Melody,
cheering and fidgeting. Keep the layout and the contracts below, and the game picks the new
art up with no code change. The style is `style-guide.md` v2 (in the Skill), section 10.

## Look at these first

| File | What it is |
|---|---|
| `art/briefs/boy-moves-in-game.png` | The placeholder frames photographed in the game: walking, the gate, jumping, the ladder, the ball, "Sit!" |
| `tools/sprites/boy_preview.png` | Every frame of both sheets, labelled, on a ground line |
| `public/assets/sprites/boy.png` | The sheet to redraw: the boy, every animation |
| `public/assets/sprites/boy_carry.png` | The same layout, holding the football in both hands |
| `src/characters/boy/boySheet.json` | The layout, speeds, and where the ball sits in each frame |
| `art/source/pre-boy-sheet-2026-10-26/src/assets/replacements/` | Your two boy frames from 25 Oct: his look (teal hoodie, dark shorts, light-soled shoes, brown hair) |
| `npm run dev`, then `http://localhost:5173/?gallery=boy` | Every animation playing. S switches to the carry sheet, C to Melody |

## The contract (keep this exactly)

- **Two PNGs, 540×752 each:** 8 columns × 9 rows of **64×80 frames**, with **4 px
  transparent gaps** between frames (none at the edges). Frames are numbered left to right, top
  to bottom, from 0. Frames 66–71 are unused: leave them empty.
- **2×2 art pixels:** draw each frame at 32×40 and export at 200%, nearest-neighbour.
  Hard-edged cutouts, alpha 0 or 255 only, no colour profile, at most 32 colours per sheet.
- **Facing right**, standing on the frame's **centre line** (x = 32). The game flips him to
  face left.
- **Feet on the bottom row** in every frame of a grounded animation (marked below). The game
  stands him on the bottom of the frame. In the air (jump, air, fall, cheer) he can lift off.
- **His size:** about 64 px tall standing, like now. His physics body is 24×58 at the bottom
  centre, whatever the picture shows, so a taller or wider boy would look wrong against
  ledges and doors.
- **Room to move:** the frame is bigger than he is, so arms can reach up and out (climbing,
  cheering, throwing).

## The animations

| Animation | Frames | Count | fps | Plays | Carry version | Feet on bottom row |
|---|---|---|---|---|---|---|
| `idle` | 0–3 | 4 | 4 | loops | yes | yes |
| `walk` | 4–11 | 8 | 10 | loops | yes | yes |
| `run` | 12–17 | 6 | 12 | loops | yes | yes |
| `jump` | 18 | 1 | - | holds | yes | |
| `air` | 19 | 1 | - | holds | yes | |
| `fall` | 20–21 | 2 | 6 | loops | yes | |
| `land` | 22 | 1 | - | once | yes | yes |
| `climb` | 23–26 | 4 | by distance | loops | | yes |
| `climb_idle` | 27 | 1 | - | holds | | yes |
| `pickup` | 28–32 | 5 | 14 | once | | yes |
| `catch` | 33–34 | 2 | 10 | once | | yes |
| `throw` | 35–38 | 4 | 14 | once | | yes |
| `throw_up` | 39–42 | 4 | 14 | once | | yes |
| `pull` | 43–46 | 4 | 10 | once | | yes |
| `open` | 47–49 | 3 | 10 | once | | yes |
| `call` | 50–52 | 3 | 8 | once | | yes |
| `point` | 53–55 | 3 | 10 | once | | yes |
| `cheer` | 56–59 | 4 | 8 | once | | |
| `wait` | 60–65 | 6 | 5 | once | yes | yes |

What each one is for:

- **idle:** standing, breathing, a blink in the last frame.
- **walk / run:** under about half his top speed he walks, above it he runs (most of the
  time). The game speeds the legs up and down with his speed.
- **jump:** take-off, rising fast. **air:** near the top. **fall:** coming down, arms up.
  **land:** the squash as he lands, held for 0.1 s.
- **climb:** on a ladder, **seen from behind**, hand over hand. One frame for every 12 px he
  climbs; ladder rungs are 24 px apart, so two frames per rung. The same frames play when he
  climbs down. **climb_idle:** just grabbed the ladder, both hands on.
- **pickup:** bends down for the ball lying at his feet (in front), grabs it, stands up holding
  it. Only when he's standing still; on the move he just scoops it up.
- **catch:** takes it out of the air, or from Melody's mouth when she brings it back.
- **throw:** the ball has **already left his hand in frame 0**, so frame 0 is the release, at
  about 13 px in front of him and 27 px up. Then the follow-through. **throw_up:** the same,
  thrown high (he's holding up).
- **pull:** reaches up and forwards to a lever and hauls it down. **open:** pushes a gate open,
  forwards.
- **call:** a hand to his mouth and a whistle: "Come on, Melody!" **point:** "Sit!", pointing
  down in front of him.
- **cheer:** a jump for joy with his arms up: GOAL!, a bone knocked down, the level done.
- **wait:** after 5 s standing still, every 7 s: hands behind his back, rock on his heels,
  look up, tap a foot.

## The football

The game draws the ball itself (24 px across), just behind the boy, so his arms wrap round it.

- **Carry sheet:** the animations marked "yes" hold it in both hands in front of his tummy. In
  every carry frame the ball's centre is within 8 px of **13 px in front, 27 px up** (from his
  feet at the bottom centre), because that's where a throw starts. A test checks it.
- **Every other frame** has a ball position too: where his near hand is (for picking up,
  catching, and climbing with it).
- The positions are `ball` in `boySheet.json`: `[x, y]` per frame, in px from the frame's
  bottom centre, x forwards, y up is negative. If your hands end up somewhere else, send the
  new positions (or mark them on a copy of the sheet) and Claude updates the file.

## What to improve

The placeholders get the timing and the poses right. They're stiff and plain to look at:

- **Raised arms hide his face** (cheer, catch, throw_up, the first pull frames). With his big
  head and short arms, arms straight up go across the face. Lean him back, or take the arms out
  to the side.
- **The run** wants more spring: a real airborne frame, bigger arm swing, and the hoodie
  bouncing.
- **The climb** from behind is just shapes: draw the hoodie's hood and the soles of his shoes
  as he climbs.
- **Expressions:** small, but they help. He's open-mouthed when he throws or calls, wide-eyed
  falling, happy cheering.
- **The carry poses** should look like he's hugging a football, not just holding his hands
  out.

## Delivering

- Same filenames and sizes: `public/assets/sprites/boy.png` and `boy_carry.png`, plus any
  changed ball positions.
- If an animation needs more or fewer frames, say so. The layout lives in `boySheet.json`, so
  it's a small change for Claude, not a redraw of everything.
- Claude runs `npm run art:check`, which checks the sheet size, the gaps, the grid, the edges
  and the feet. It then runs the tests and the screenshot review.
- `tools/sprites/make_boy.py` drew the placeholders. It won't overwrite hand-drawn sheets, so
  your art is safe.
