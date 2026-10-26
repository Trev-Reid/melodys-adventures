# Rendering and scaling: keeping pixel art crisp in Phaser 4

Everything here was checked against the Phaser the game actually uses, **4.2.1**, on
2026-10-25. The sources were its code in `node_modules/phaser/src`, and Phaser's own guide in
`node_modules/phaser/docs/Phaser 4 Pixel Art Guide/`. Check again after upgrading Phaser,
because Phaser 4's rendering differs from Phaser 3's in ways that matter here.

## How the game renders now

| Setting | Where | Value | Effect |
|---|---|---|---|
| Renderer | `src/main.ts` | `Phaser.AUTO` (WebGL) | Fine |
| Game size | `config/display.ts` | 960×540 | The art grid is 480×270 (2×2 art pixels) |
| Scale mode | `src/main.ts` | `Scale.FIT`, `CENTER_BOTH` | The canvas stays 960×540, and the **browser** stretches it to the window: 2× at 1920×1080, 1.42× at 1366×768, 1.6× at 1536×864 |
| `pixelArt` / `antialias` | `src/main.ts` | Not set, so antialias is **on** | The browser **smooths** the stretched canvas. At 1920×1080, `review:compare` finds no clean 4×4 art-pixel grid (verdict: SOFT) |
| `roundPixels` | `src/main.ts` | `true` | Cameras round each object to whole pixels when it's drawn. This only applies to objects that aren't scaled or rotated (see below). Good. |
| Texture filtering | `BootScene.create` | NEAREST for the garden, UI, Melody and replacement art; LINEAR for everything else | Hand-made art is sharp inside the canvas. Code-drawn placeholders, the glow and text are smooth. |
| Parallax | `GardenBackground.update` | `tilePositionX = scrollX × factor`, a **fraction** | Phaser doesn't round a TileSprite's texture offset, so layers step unevenly as the camera glides |
| Camera zoom | `config/camera.ts` | 1 | Good. Keep it a whole number. |
| Text | Many `add.text` calls | Arial Bold with a stroke, drawn at 1× | Readable, but it's smooth vector text next to pixel art |
| Pixel art at odd scales | See "No non-whole scales" | 1.2×, 1.3× | Uneven art pixels, never rounded |

## Phaser 4.2 facts that decide this

1. **`pixelArt: true`** turns on `antialias: false`, `antialiasGL: false` and
   `roundPixels: true` (`Config.js`). It works at the top level of the game config, or as
   `render: { pixelArt: true }`.
   - With `antialias: false`, every texture is created and updated with **NEAREST**
     filtering (`TextureSource`, `canvasToTexture`). That includes text and code-drawn
     placeholders. The canvas also gets the CSS `image-rendering: pixelated` /
     `crisp-edges` style (`CreateRenderer` calls `CanvasInterpolation.setCrisp`), so the
     browser's stretch to the window stays crisp.
   - With `antialiasGL: false` there's no multisampling. Shapes drawn live with `Graphics`
     (sign boards, HUD panels, rings, Tiled ladders) get hard, stepped edges.
2. **`smoothPixelArt: true`** is Phaser 4's mode for big pixels at non-whole scales: crisp
   texels with soft edges between them. It only works when the **GPU** scales sprites inside
   the canvas. It also switches `pixelArt` off and `antialias` on, so the browser would smooth
   the window stretch again. Our window scaling is done by the browser, so it doesn't help
   there.

   It can be set on **one texture** (`texture.setSmoothPixelArt(true)`, with LINEAR
   filtering), which might suit the single sprite shown at 1.3× (SUPER STRENGTH). Try that in
   the screen pass. A different per-texture setting breaks the render batch, which is fine for
   one sprite.
3. **Rounding happens per object, when it's drawn** (`GameObject.vertexRoundMode`, default
   `'safeAuto'`). An object is rounded only if it isn't scaled or rotated **and** the camera
   has `roundPixels` and no zoom. Positions in the game stay fractional, so movement is still
   smooth; only the drawing snaps. **Scaled sprites are never rounded**, which is another reason
   not to scale pixel art.
4. **`setFilter(LINEAR)` still works on a texture when antialias is off.**
   `WebGLRenderer.setTextureFilter` doesn't check it. That's how soft effects stay smooth under
   `pixelArt`.
5. **TileSprite texture offsets aren't rounded.** `tilePositionX/Y` goes straight into the UV
   matrix (`TexturerTileSprite`), so round it yourself.
6. **Scale manager.** `FIT` only sets the canvas's CSS size. `zoom` applies in `Scale.NONE`:
   `Phaser.Scale.MAX_ZOOM` picks the largest whole zoom that fits, and
   `game.scale.setMaxZoom()` recalculates it, for example on window resize. `autoRound`
   floors the CSS size to whole pixels.

## Recommended changes (tested 2026-10-25, NOT applied yet)

Apply these as the first step of the test-screen pass, as their own reviewed change:

```
npm run review:capture -- --display 1920x1080,1366x768     # on the unchanged game
npm run review:approve -- --all                             # (if not already this setup's baselines)
# ...make changes 1-3...
npm run review:capture -- --display 1920x1080,1366x768
npm run review:compare                                      # the 1920x1080 line must say "crisp"
```

### 1. Pixel-art mode (`src/main.ts`)

```ts
  // Pixel art: nearest-neighbour textures, sprites on whole pixels, and a crisp canvas when the
  // browser scales it up to the window. (Same as antialias: false, antialiasGL: false, roundPixels: true.)
  pixelArt: true,
```

This replaces the `roundPixels: true` line.

### 2. Keep the soft effects smooth (`BootScene.create`, after `createPlaceholderTextures(this)`)

```ts
    // Soft light and shadow stay smooth (pixelArt makes every texture NEAREST): they're stretched to fit.
    for (const key of [gardenKey('fx-vignette'), gardenKey('fx-shadow'), gardenKey('fx-sunrays'), gardenKey('fx-shade-top'), TEXTURES.glow]) {
      if (this.textures.exists(key)) this.textures.get(key).setFilter(Phaser.Textures.FilterMode.LINEAR);
    }
```

This needs `import { TEXTURES } from '@/assets/keys';`. The NEAREST loop already in
BootScene becomes redundant, but it does no harm.

### 3. Whole-pixel parallax (`GardenBackground.update`)

```ts
      // Whole pixels: roundPixels doesn't reach a TileSprite's texture offset.
      sprite.tilePositionX = Math.round(camera.scrollX * def.scrollX);
      sprite.y = Math.round(def.bottom + below * def.scrollY);
```

### What the test showed

The test was run on `garden-house` and `garden-crate`, using Linux / Chromium / software
drawing. The changes were applied to a scratch copy only.

- **1920×1080:** before, the verdict was *"SOFT - no clean 4x4 art-pixel grid"*. After, it was
  *"crisp - every art pixel is 4x4 (85% of edges on the grid)"*. The other 15% are text,
  code-drawn shapes, and art standing on an odd pixel. That last kind is still crisp, just
  offset by one pixel from its neighbours.
- **1366×768:** crisp, but the art pixels are uneven, some 2 and some 3 screen pixels. That
  can't be avoided at 1.42× with `FIT` (see "The scaling choice").
- **Inside the 960×540 frame,** 0.90% (`garden-house`) and 0.65% (`garden-crate`) of pixels
  changed. All of it was text and code-drawn shapes:
  - Sign text gets sharper.
  - The placeholder crate's diagonal straps and rounded corners show 1-pixel steps.

  The garden art and Melody were already NEAREST, so they didn't change.
- Typecheck, tests and build passed.
- Still to check by playing, because screenshots can't show it: shimmer while the camera
  moves.

### 4. No non-whole scales of pixel art

| Where | Now | Options |
|---|---|---|
| SUPER STRENGTH Melody (`config/powerUps.ts`, `appearance.scale`) | 1.3× | **(a)** Draw the buff sheet bigger in `make_melody.py` and use scale 1. This is the best fix. **(b)** Use 1.5× for now: even 3×3 art pixels, but chunkier than everything else. **(c)** Keep 1.3× and try per-texture `smoothPixelArt` on `melody-buff`. Her hitbox grows with the scale, so (a) and (b) are gameplay changes. Trevor decides. |
| HUD bone (`HudScene.ts`) | 1.3× | Draw a HUD-size bone in `public/assets/ui/` on the 2×2 grid, and use scale 1 |
| HUD hearts (`HudScene.ts`) | 1.2× | Draw the hearts at their shown size, and use scale 1 |
| Pause cursor (`PauseScene.ts`) | 1.2× | Use the HUD-size bone at scale 1 |
| Tiled decorations (`scale` property) | None used | `art:check` warns if one appears |

### 5. Text (the UI pass)

With `pixelArt`, Arial is drawn at 1× and then nearest-scaled. It's crisp but blocky at 2×,
and its smoothed edge pixels become visible blocks. The proper fix is a **pixel font drawn on
the 2×2 grid** (BitmapText, or a pixel TTF), together with real 9-slice sign boards. There are
free pixel fonts made for readability, for example Daniel Linssen's m5x7 and m6x11, or
datagoblin's monogram. Check each font's licence before adding it.

## The scaling choice

| Option | How | Good | Bad |
|---|---|---|---|
| **A. FIT + pixelArt** (recommended first) | Changes 1–3 above | Fills the window and is crisp. Measured crisp at 2×. | At non-whole sizes (1.42×, 1.6×), some art pixels are a screen pixel wider than others. That's hardly visible at 2× and above. |
| B. Whole-number zoom | `scale: { mode: Phaser.Scale.NONE, zoom: Phaser.Scale.MAX_ZOOM, autoCenter: Phaser.Scale.CENTER_BOTH }`, plus `window.addEventListener('resize', () => game.scale.setMaxZoom())` | Perfectly even pixels at every size | Black borders. At 1366×768 the game is only 960×540 in the middle. *Sketch, not yet tested.* |
| C. Hybrid | B when the window allows 2× or more, A below that (a small resize handler using `setZoom`) | Even pixels on big screens, full screen on laptops | More code. *Sketch, not yet tested.* |
| D. Render at window size | `Scale.RESIZE` or `EXPAND`, every scene's camera zoomed to fit, with `smoothPixelArt` | Even, crisp, smooth-edged at any size | Touches every scene's camera, the HUD layout and input. A big change. |

Start with A. Capture `--display 1366x768`, which is the common laptop size. Move to C only if
the unevenness bothers the kids.

## Rules to keep it crisp

1. Leave rounding to `roundPixels`. Don't add half-pixel offsets, and keep picture sizes even
   so centred origins land on whole pixels.
2. Show pixel art at scale 1. Other scales are only for brief tweens. Never mix densities.
3. Pixel art uses NEAREST. Only soft `fx` textures and the glow use LINEAR.
4. Don't rotate pixel art, except brief wobbles. Flipping with `setFlipX` is fine.
5. Keep the camera zoom a whole number, and round TileSprite offsets.
6. Check every rendering change: capture with `--display 1920x1080,1366x768`, then compare.
   The 2× verdict must say **crisp**. Then play it, to check for shimmer.
