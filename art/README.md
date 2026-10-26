# art/: everything about the art that isn't shipped with the game

| Folder | What goes in it |
|---|---|
| `reference/concept/` | The approved concept art. Keep the originals, unedited, plus a PNG copy if they aren't PNG. List every reference picture in `reference/README.md`. |
| `reference/style/` | Inspiration from elsewhere (screenshots of other games, artists' work). For studying only: never copied or shipped. |
| `reference/photos/` | Photos of the real garden, Melody, the boys' things. |
| `reference/targets/` | One picture per review shot (`<shot>.png`, e.g. `garden-house.png`): what that screen should look like. It's usually a crop or mock-up of the concept art, in the same view as the shot (16:9, any size). |
| `reference/art-direction-v2.md` | The art director's confirmed v2 brief, word for word. The Skill's style guide is built from it. |
| `briefs/` | What we've asked the art director for, with the contracts to keep and pictures of the current placeholders, e.g. `boy-sprite-sheet.md`. |
| `incoming/<pack>/` | Art deliveries as they arrived: README, `assets/`, `specs/` (manifest, rules patch, brief), `source/` (prompts, masters, scripts), and the deliverer's own captures. The first is `garden-overhaul-2026-10-25` (34 MB; 22 MB of it is generated masters). |
| `source/` | Editable files (`.aseprite`, `.kra`, `.psd`) at half size, and old versions of pictures. Don't keep old versions in `public/assets/`, because everything there ships with the game. `source/pre-<pack>/` holds the pictures a delivery replaced, at their old paths, e.g. Trevor's painted trampoline in `source/pre-garden-overhaul-2026-10-25/public/assets/garden/`. |
| `palettes/` | `house.gpl` / `house.png`, the house palette (`npm run art:palette`), plus palettes pulled out of reference pictures. |
| `review/baselines/` | Approved screenshots of each shot (`npm run review:approve`), plus `_setup.json`, which records the computer and browser that took each one. They only compare exactly on that setup. |
| `review/out/` | The latest screenshots, comparison boards and `report.html`. Not kept in git, and made again any time. |
| `review/LOG.md` | One line per approved art change. |

How it all fits together is in `docs/ART-PIPELINE.md`.
