# Transparent PNGs: making them, and how they're checked

## What a good game PNG is

- **PNG**: 8-bit RGBA, or a palette PNG with transparency. Never JPG: it has no transparency,
  and its blur ruins pixel art.
- **Real transparency.** The background pixels have alpha 0. A painted white box, or a painted
  grey-and-white checkerboard, is not transparency. That checkerboard is only how image
  programs and AI image makers *show* transparency.
- **Hard edges ("cutout").** Every pixel is fully solid (alpha 255) or fully see-through
  (alpha 0). There are no soft or anti-aliased edges, because they make pale or dark halos
  against the sky and look blurry next to everything else.
- **Flat glass.** A see-through net, window or water can use **one flat in-between alpha
  level** (the goal's net uses 170). The art rule for that picture has to allow it
  (`glassLevels` in `tools/art/assetRules.ts`).
- **Soft alpha only for effects:** light, shadow and air (`fx-*`).
- **Opaque tiles have no holes.** That means the ground fills and the sky.
- **On the 2×2 grid, with even sizes** (see the style guide).
- **No colour profile.** An embedded ICC profile or gamma setting makes browsers shift the
  colours slightly, so the art stops matching the palette. Export plain sRGB.
- **Not interlaced** ("Adam7"). It's pointless for games, and the checker can't read it.

## Exporting from drawing programs

Always draw at **half size** (1 art pixel = 1 pixel), then export at **200%** with
nearest-neighbour scaling.

| Program | How |
|---|---|
| **Aseprite / LibreSprite** | File → Export As... → `.png`, **Resize 200%**. Transparency is kept. |
| **Piskel** (free, in the browser) | Export → PNG → **Scale ×2** |
| **Pixilart** | Download → PNG, size ×2 |
| **Krita** | Image → Scale Image To New Size → 200%, filter **Nearest Neighbour**. Export PNG, untick "Embed sRGB profile". |
| **GIMP** | Image → Scale Image → 200%, Interpolation **None**. Export As PNG, untick "Save colour profile" and "Save gamma", and leave interlacing off. |
| **Photoshop** | Image → Image Size → 200%, **Nearest Neighbor (hard edges)**. Export As PNG, untick "Embed Color Profile". |
| **Paint (Windows)** | Has no transparency. Use it only to convert a reference to PNG, never for game art. |

## Pictures that weren't drawn as pixel art

This covers AI-generated pictures, paintings, photos and often the concept art itself. They
can be **references**, but they aren't game art until they've been redrawn.

1. Save the original in `art/reference/concept/` (or `style/` or `photos/`) and add it to
   `art/reference/README.md`.
2. Get its palette and pixel scale:
   ```
   npm run art:palette -- --from art/reference/concept/<file>.png --colours 24
   ```
   - It says whether the picture has real art pixels (and how big), or "none found" for
     painted, smoothed or AI art.
   - The `-preview.png` it writes shows the picture reduced to big pixels and a small
     palette. That's a starting point, not finished art.
3. Redraw it at half size in a pixel editor, over the preview if that helps. Use the house
   ramps, the outline rule and the agreed light direction.
4. Export at 200% and check it (below).

Downscaling a painting and calling it pixel art doesn't work. You get muddy, noisy colours
(art:check spots "lots of almost-identical colours") and an off-grid mess.

## The automatic checks: `npm run art:check`

It runs on every picture **the game loads** from `public/assets/`, plus all of
`src/assets/replacements/` and the decoration scales in the Tiled maps. It also runs inside
`npm test`, so GitHub tests it on every push. To check a new picture before it goes in:

```
npm run art:check -- --file path/to/new.png --as prop        (or item, character, tile, background, fx, ui)
npm run art:check -- --file path/to/boy.png --as boy         (against a placeholder's contract)
```

| Check | Error when... | Fix |
|---|---|---|
| decode | a picture the game loads isn't a readable PNG, or is interlaced | Re-export it as a plain PNG |
| profile (warning) | it embeds a colour profile or gamma | Untick "embed colour profile" / "save gamma" |
| size | a side is over 4096 (a warning over 2048), or a size the code relies on is wrong | Split it into parts; match the size given |
| grid | the size isn't even, or there's detail finer than an art pixel (a warning when there's only a little) | Draw at half size, export at 200% nearest-neighbour |
| alpha | a cutout has soft edges (part-transparent pixels), or an opaque tile has holes | Turn off anti-aliasing and soft brushes; fill the holes |
| background | the edge is a painted checkerboard, or one solid colour all the way round | Delete the background, so it's really transparent |
| colours (warning) | too many colours for its role, or lots of near-identical colours (noise, blur, JPEG, AI) | Use the house ramps; clean up the noise |
| seam (warning) | a repeating picture's edges don't join up | Make the left edge continue the right edge |
| sheet | a strip doesn't divide into its frames, frames bleed into the gaps, or a frame dips below frame 0 | Fix the frame size or gaps; keep the base still |
| feet | a character's grounded frame doesn't touch the bottom row | Move the drawing down so the feet sit on the bottom row |
| parts | a decoration part isn't the same size as its main picture | Draw parts on the same canvas as the main picture |
| solids (warning) | a decoration's solid top (`config/decorations.ts`) no longer has art under it | Redraw so the surface is at the same height, or move the solid on purpose |
| missing | the game loads a file that isn't there | Add the file |
| unused (warning) | a file in `public/assets` that nothing loads. It isn't checked, because it never shows, but it still ships with the game. | Delete it, or move old versions to `art/source/` |
| replacement | a replacement's name isn't a placeholder key, or its size breaks the contract | Use the right key (it suggests one); match the size |
| scale (warning) | a decoration in a Tiled map has a `scale` other than 1, so its art pixels come out a different size, or uneven | Use scale 1 and draw the picture at the size you need |

**Errors** fail `npm test`, because they'll look broken or change how the game plays.
**Warnings** are worth a look but don't fail anything.

Some pictures break particular rules on purpose. They're listed in `WAIVERS` in
`tools/art/assetRules.ts`, with the reason, and every report reminds you of them. Right now
there are none: the last one, Trevor's painted trampoline, went when the garden-overhaul pack
replaced it (2026-10-25). Keep the list short: each entry is a picture that doesn't match
the game yet.
