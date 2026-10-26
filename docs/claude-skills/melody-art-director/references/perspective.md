# Perspective rules

The camera looks at the garden **side-on and flat**, like a stage. There are no vanishing
points. Every object is drawn as if seen straight from the front, from about the boy's
eye height.

The side-on camera is **LOCKED**: the game is a side-scrolling platformer. The drawing
details marked **PENDING** below (how much of a top you see, faces, the planes' treatment)
are v1 values. Confirm them against the concept art (`calibration.md`).

## The rules

1. **Verticals are vertical, horizontals are horizontal.** Walls, posts, fences, doors and
   tree trunks don't lean or converge. Never draw buildings in two-point or three-point
   perspective.
2. **Fronts only.** Buildings, fences, the treehouse, the goal and the gate are seen dead
   front-on. You don't see their sides, and you don't see the tops of tall things.
3. **Low, round or flat-topped things show their top as a flattened ellipse or band:**
   - Tree stumps: rings on top.
   - Pots and planters: soil and plants on top.
   - The bird bath: water.
   - The trampoline: its mat.

   Draw the top about **1/4 to 1/3 as tall as it is wide**, as if seen from a little above
   (PENDING: match the concept art's viewing height). Never show an underside.
4. **The ground is a strip.** The walkable surface is the top edge of the ground tiles, drawn as
   a thin top band:
   - Grass tufts (`tile-grass-top`) sit 8 px above the surface.
   - Gravel (`tile-gravel-top`) sits 4 px above it.
   - The ground fill (`tile-dirt`, `tile-stone`) is the "cut-away" front of the earth below.
5. **Everything stands on the ground line.** Its lowest visible pixel touches the surface. The
   game stands decorations on their lowest visible pixel, and characters on their feet. Don't
   leave gaps under feet or posts. The game adds the soft contact shadow.
6. **Characters are side-on** and face right. The game mirrors them for left. Faces are in
   profile or three-quarter, never straight at the camera. (Melody's sheet is the model.)
   Facing right is LOCKED; the face angle is PENDING.
7. **One light for everything:** warm, from the upper left (CONFIRMED v2: see style-guide.md, Light).

## Depth planes (parallax)

Further planes scroll slower and are drawn smaller, lighter, bluer, simpler and without
outlines. These are the planes in the garden now. Scroll speed 1 means it moves with the
world. The scroll speeds and depths are code (`GARDEN_LAYERS`); the treatment column is
PENDING.

| Plane | What | Scroll (x / y) | Depth | Treatment |
|---|---|---|---|---|
| Sky | `bg-sky` gradient, sun glow | fixed | -60 | Dithered gradient, no outlines |
| Clouds | `cloud-1/2`, drifting | 0.05 | -50 | 3 tones, flat bottoms |
| Far birds | `bird-far` | fixed | -35 | Single dark colour, tiny |
| Far hills | `bg-far`: hills, fields, hedgerows, a farmhouse | 0.12 / 0.10 | -40 | Lightest and bluest, very low contrast, big simple shapes |
| Tree line | `bg-trees` | 0.30 / 0.25 | -30 | FOLIAGE_FAR ramp, no outlines, soft silhouettes |
| Fence and hedge | `bg-fence` | 0.60 / 0.60 | -20 | Mid detail, close to play-area colours but a touch lighter |
| Sunbeams (back) | `fx-sunrays` | fixed | -15 | ADD blend, about 0.55 alpha |
| **Play area** | Ground, props, items, Melody, the boy | **1.0** | -6 to 12 | Full contrast and saturation, outlined |
| Front decorations | Ferns, tall grass set to `front` | 1.0 | 40 | Darker and bigger; they frame the screen |
| Air and light | Motes, front beams, vignette | fixed | 36–45 | Subtle |

Rules for front decorations:

- They go at the bottom edge of the screen only, covering at most about a quarter of the
  screen's height.
- They must never cover a collectible, a ledge Melody needs to see, or a sign.
- They're darker than the play area, so they read as "nearer, in shade".

## Checking perspective in review

- Do vertical edges line up with the screen edges?
- Does every top you can see belong to something low (a stump, a pot or a bowl), seen from slightly
  above?
- Does anything float? Look for gaps between feet or posts and the ground. (`art:check` warns
  when a decoration's solid top doesn't line up with its picture.)
- Do background planes sit back? Their outlines should be gone and their contrast should
  be lower.
