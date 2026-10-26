# Delivery validation

- **56 changed replacement PNGs**, with complete paths, dimensions, colours and SHA-256 hashes in `asset-manifest.json`.
- Every delivered PNG is on the exact 2×2 grid. All existing asset dimensions are retained; new placeholder replacements use exact contract dimensions.
- Project art check with confirmed per-file v2 palette budgets: **0 errors, 1 warning, 0 waivers**. The warning is the pre-existing unused `trampoline_old.png`, which this pack does not ship.
- Original-rule report is also included: 0 errors, 15 warnings, 1 waived finding. The additional warnings concern the explicitly authorised larger palettes. The delivered validator patch changes those per-file palette limits only and removes the obsolete trampoline waiver.
- Vite production preview built successfully with the existing installed dependency versions. All six final 960×540 review shots rendered without page errors. One final goal capture timed out; an isolated retry succeeded. This was a rendering/capture retry, not a change to gameplay.
- **95 gameplay/configuration source files match the shared project byte-for-byte**. Art replacement PNGs are the only changes under `src/`. No map, shot definition, collision, anchor, frame layout or animation-timing changes were made.
- Rebuilt the full 56-PNG pack from the included native sources and generated masters: **all 56 SHA-256 hashes matched**.
- Inspected all six final frames for asset placement, layering and readability. Automated solid-coverage, sheet-layout, alpha and seam checks pass. This is not a full interactive playtest of every mechanic.

## Comparison provenance

Before and after are captured locally on Windows, at 960×540, 90 review frames, using headless Chromium/SwiftShader and the game's review capture hook. The production build was opened locally because the earlier local-server approach was restricted. These are actual rendered game frames, not concept paintovers.

The user's earlier Linux baseline remains unchanged. Cross-platform renderer differences must not be presented as art changes. Use the matching local before/after pairs for this delivery.

| Shot | Pixels changed against matching local before |
|---|---:|
| garden-house | 94.16% |
| garden-gate | 91.25% |
| garden-trampoline | 97.01% |
| garden-crate | 94.66% |
| garden-treehouse | 95.24% |
| garden-goal | 92.97% |

These percentages measure change, not artistic quality or similarity to the mockup.

## Remaining integration work

Claude must install this pack into the shipping project and run its normal capture/compare loop. The consolidated HUD, typography and less intrusive tutorial signs from the mockup need code changes; this delivery supplies their art-direction brief and updated texture family. The playable level retains its existing composition. Melody and ambient animal animation sheets are intentionally retained.
