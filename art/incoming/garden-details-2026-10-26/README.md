# Garden details — 26 October 2026

Eight replacement PNGs for the requested second art pass:

- Football goal: ivory frame and an open diamond net.
- Birdbath (the water fountain): carved limestone and animated turquoise water glints.
- Clothes line: weathered timber, pegs and shaded fabric across four frames.
- Wooden gate: detailed oak and ironwork, with closed/open frames.
- Plain bush and the gate's hedge surround: richer, more natural foliage.
- Heavy crate: textured oak, metal corners and the retained weight emblem.
- Treehouse: the two diagonal branches above the roof removed. The horizontal branch at eaves height remains.

## Claude integration

Copy `assets/` over the matching project-relative paths, preserving the replaced versions in `art/source/` first. This is a supplement to the previous 56-asset pack, not a replacement for that whole pack.

All eight PNGs keep their existing dimensions. The three animated sheets retain their frame counts, cell sizes and timing. No gameplay, map, collision or animation-layout changes are needed. The existing palette budgets are sufficient; no validator relaxation is included.

Run `npm run art:check`, `npm run review:capture`, and `npm run review:compare`. Keep the approved baselines intact. `review/before/` and `review/after/` are matching local game captures for this delivery, not a baseline approval.

`specs/manifest.json` lists exact sizes, colours and hashes. `source/` preserves generated masters and prompts. Only the PNGs under `assets/` are shipping candidates. GIFs are review aids for the animated frames.

The art was generated using the built-in ImageGen tool, then exported to the game's exact 2×2 grid, hard alpha and existing per-file palette budgets. Claude continues to own integration.
