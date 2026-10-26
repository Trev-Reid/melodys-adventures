# Validation

- Project art check: **0 errors, 1 existing unused-file warning, 0 waivers**. Warning: `trampoline_old.png`.
- Exact 248×114 canvas; 2×2 grid; genuine hard transparency; 63 opaque RGB colours within the existing 64-colour rule.
- Existing trampoline solid-coverage check passes. The bounce configuration remains unchanged: 216px-wide surface, 50px above the foot.
- Production preview build succeeded. Matching 960×540 review captures rendered without page errors; final sprite and game frame inspected visually.
- The initial fine-net design lost its mesh during downsampling. The final master was edited with ImageGen to use coarse open diamonds; the visible exported net was checked at game resolution.
- Shared shipping trampoline still matches the preserved original hash. This is an incoming art delivery for Claude; no live asset, gameplay code, palette rule or approved baseline was changed.

The captures validate appearance and automatic asset contracts; this was not a full interactive bounce playtest.
