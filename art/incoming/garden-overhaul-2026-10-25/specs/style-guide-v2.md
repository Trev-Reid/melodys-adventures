# Melody's Adventures — art direction v2

Status: CONFIRMED art direction for this delivery, 25 October 2026. Trevor delegated art direction and explicitly authorised a larger palette. Claude owns code integration. This supersedes the provisional aesthetic values in v1; gameplay contracts remain locked.

## Visual target

A sunlit country garden: warm cream cottage, blue-grey slate, weathered honey timber, natural oak foliage, distant patchwork fields and a lake. The mockup establishes materials, depth and warmth. The six supplied in-game captures establish composition and gameplay geometry. Do not move platforms or enlarge characters to imitate the mockup's different composition.

## Locked production contracts

- 960×540 game frame. One art pixel is 2×2 screen pixels. Work at half resolution and export with nearest-neighbour 200% scaling.
- Keep texture names, canvas dimensions, sprite-frame layouts, anchors and collision geometry. All delivered replacements use the existing exact dimensions, including the two 36×64 boy frames and 110×110 crate.
- Cutouts use genuine alpha 0 or 255. The goal retains its existing single translucent net level; effects can use soft alpha. No painted checkerboards, baked floor shadows or colour profiles.
- Treehouse body/leaves stay 440×560 and share registration. Deck surface is 262 px above the foot; ladder remains x −90 through −48. Stump top is 98 px above its foot. Trampoline mat is 50 px above its foot, on the existing 248×114 canvas.
- Keep all animation timing, grids, gaps and frame counts. Existing Melody, robin, squirrel and butterfly animation sheets are retained.

## Confirmed palette and materials

Use hue-shifted material ramps; colour counts are budgets, not targets. Warm light comes from upper left. Shaded leaves lean forest teal; highlighted leaves lean yellow green. Reserve the brightest cream accents for flowers, collectibles and small material edges.

| Material | Dark → light reference ramp |
|---|---|
| Foliage | `#173b30 #23513b #3b693e #557f40 #749547 #9bb04e #c0cc68 #e4dc8b` |
| Grass | `#183c30 #28513b #416839 #63833b #86a744 #acc857 #cbd775 #e7e9a1` |
| Limestone | `#363e37 #525b50 #707667 #92957c #b4b298 #cdc6a6 #e4d8b7 #f3e6c8` |
| Timber | `#3c2c22 #614331 #92613d #bf8c54 #e4bd7c` |
| Bark | `#332b25 #51402f #745637 #997247 #bc935d #dfbd84` |
| Soil | `#302a24 #44362a #5c4530 #765737 #947248 #b39465` |
| Terracotta | `#663c32 #99553e #c07b52 #e2a577` |
| Boy hoodie | `#173e40 #25858a #318f94 #59b6b4` |
| HUD | `#142c29 #29463c #64765a #e0c68e` |
| Heart | `#693c39 #b74d4c #ed7464 #ffa58a #ffe4bd` |

These ramps govern the editable procedural art. Generated hero assets use related adaptive palettes; their exact exported colours are listed in `asset-manifest.json`. They are not falsely described as using only the reference ramp values.

### Per-file palette exceptions

Keep the existing role defaults for files not listed below. Add specific rules before the existing wildcard rules; do not relax grid, alpha, size, seam or collision checks.

| Files | Maximum opaque RGB colours |
|---|---:|
| house, treehouse | 128 |
| bg-far, bg-trees, bg-fence | 96 |
| big-tree, big-tree-leaves, treehouse-leaves, bush-berries, bush-hydrangea, egg-chair, trampoline, stump | 64 |
| tile-stone, tile-dirt | 32 |

The delivery includes a narrowly scoped validator patch. Remove the old trampoline waiver only when installing the new trampoline candidate. The old user-made trampoline remains in the shared project's shipping folder until integration.

## Shape, texture and depth

- Use selective dark material edges to separate important silhouettes; continuous brown outlines on every leaf are unnecessary.
- Use readable clusters rather than scattered one-pixel noise. Avoid symmetrical ball-shaped foliage where a more natural silhouette is possible.
- Keep the distant landscape lower in contrast than the cottage and oak trunk. Leave an open central view through the middle tree layer.
- Background layers must repeat horizontally. Ground fills repeat both ways. Lighting is restrained: avoid the previous strong diagonal white ray wash.
- Preserve visible landing surfaces. Decoration can become richer without adding apparent platforms or hiding the traversable edge.
- Props should have believable material detail at their actual game size. High-resolution generated originals are source art; only the quantised, registered 2× exports are integration assets.

## HUD and characters

The delivered badges form one round forest-and-gold family, using the existing four keys and readable power symbols. The boy wears a teal hoodie, dark shorts and light-soled shoes. Melody's established lurcher silhouette, patches and animations are retained.

The mockup's consolidated HUD panel, title treatment and quieter tutorial signs require code changes. Claude should retain all existing counter values and controls, use integer display scales, and apply the forest/cream/gold treatment without covering landing areas. Those layout changes are not represented as completed in this asset-only preview.

## Review and provenance

The six `review/after/` PNGs are actual 960×540 game captures, not AI-painted screenshots. Compare them with `review/before/`, captured on the same Windows browser and renderer. The supplied Linux captures remain the user's approved historical baselines; do not replace those baselines automatically.

Generated source images were made with the built-in ImageGen tool. Other assets were drawn from the project's editable generator with the included art-direction overrides. Preserve source provenance; do not claim all PNGs were manually pixel-painted. Changes to art direction belong in this rulebook and the asset manifest.
