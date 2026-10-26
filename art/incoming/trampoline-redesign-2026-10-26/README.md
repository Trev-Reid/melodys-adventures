# Trampoline redesign — 26 October 2026

One replacement for `public/assets/garden/trampoline.png`.

The redesign uses thicker jade padding with visible seams, padded graphite posts, warm metal highlights, a clearer entrance/ladder and a coarse open safety net intended to remain readable at game size.

## Integration for Claude

1. Preserve the current trampoline in `art/source/`.
2. Copy `assets/public/assets/garden/trampoline.png` to the matching project path.
3. Run `npm run art:check`, `npm run review:capture` and `npm run review:compare`.

The texture remains **248×114**, exported from **124×57** logical pixels. Bottom-centre anchor and bounce surface 50 px above the foot are retained. No gameplay numbers, animation settings, asset keys or checker rules need changing. Existing palette budget: 64 colours; cutout alpha only.

`trampoline-comparison.png` shows the old and new sprites enlarged with nearest-neighbour sampling. `review/` contains matching actual game captures from an isolated copy. Do not automatically approve new baselines.

The source artwork was generated with built-in ImageGen; the prompt and master are included. Only the PNG under `assets/` is a shipping candidate. The live shared asset has not been overwritten.
