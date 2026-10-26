# Validation

Eight requested replacement PNGs, all on the exact 2×2 pixel grid with alpha 0/255 and unchanged canvas dimensions. All fit the existing palette budgets: 48 colours per prop, 128 for the treehouse. No checker rules were changed.

Full project art check: **0 errors, 1 warning, 0 waivers**. The warning is the existing unused `trampoline_old.png`.

The gate keeps two 64×156 cells; the birdbath keeps two 80×88 cells; the clothes line keeps four 300×180 cells. Playback configuration is unchanged. Every exported frame was inspected; GIFs are included for animation review. AI generation can introduce small texture changes between frames, so these are not claimed to be mathematically identical outside the moving details.

The treehouse keeps its 440×560 registration, passes existing solid coverage checks and has no two diagonal branches above the roof. Its horizontal eaves branch and lower structural braces remain. The image edit also resynthesised some surface pixels; it is not a bit-for-bit removal mask.

The Vite preview built successfully. All six 960×540 before/after review shots were captured from the current game copy using Chromium/SwiftShader, with no page errors, and visually inspected. This validates rendering and the automated contracts, not every interactive gameplay sequence.

96 non-PNG source files match the shared project. All eight shared shipping assets still match their original hashes: this delivery is staged for Claude, not installed in the live shared game. No baseline approvals were changed.
