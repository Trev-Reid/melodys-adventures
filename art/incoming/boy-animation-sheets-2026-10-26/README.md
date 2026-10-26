# Boy animation sheets — 26 October 2026

Two finished PNG sheets for Claude to integrate: `boy.png` and `boy_carry.png`.
Each is 540×752, with 66 occupied 64×80 frames, eight columns, four-pixel gaps and six empty trailing cells. The 19 animation ranges are unchanged.

Art adapts the approved brown swept hair, teal hoodie, navy shorts and light-soled shoes to the existing native animation rig. The victory pose opens both arms so the face remains readable. These are pixel-scale adaptations of the design studies, not literal copies of the four study poses.

## Integration

1. Preserve the existing shipping boy PNGs in `art/source/`.
2. Copy only `boy.png` and `boy_carry.png` to `public/assets/sprites/`.
3. Keep the current `src/characters/boy/boySheet.json`, animations, physics and ball anchors. `boySheet.reference.json` is the unchanged contract snapshot for reference, not a replacement configuration.
4. Run `npm run art:check`, then capture and compare the review screens in Claude's current workspace. Do not approve new baselines automatically.

The football is separate; it is not painted into either PNG. Carry arms retain the original rig positions. The unused final six cells and every gutter are transparent. Grounded frames retain the bottom-row foot contact.

## Validation and previews

- Both sheets use 25 opaque colours from the approved study palette, exact 2×2 pixels and alpha 0/255. PNGs have no colour profile.
- Full project art checker on an isolated project copy: **0 errors, 1 existing warning** for unused `trampoline_old.png`.
- House review capture loaded with no browser errors. Gallery captures exercise normal and carrying animation variants.
- `all-frames.png` labels every frame. `animation-preview.gif` cycles all 19 animations at their specified rates (single poses remain still; action sequences loop for inspection). It shows the carrying arms without a football.
- `validation.json` records sheet dimensions and SHA-256 hashes. `art-check.json` is the full checker output.

This is a staged art delivery. No shipping game files, gameplay code, size rules or approved baselines were changed on the share.
