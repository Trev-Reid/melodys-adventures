# Garden art overhaul

This is an asset delivery for Claude to integrate. The `assets/` tree mirrors project paths. The shared project's shipping assets and gameplay source have not been overwritten by this delivery.

Start with `review/after/garden-house.png`, `garden-treehouse.png` and `garden-trampoline.png`: these are actual captures from an isolated copy of the game with this pack installed. All six before/after shots use the same 960×540 frame and local renderer.

## Integration

1. Preserve existing versions. Copy `assets/public/assets/` into the corresponding project folder and `assets/src/assets/replacements/` into the replacement folder. No asset-key or gameplay edits are required.
2. Adopt `specs/style-guide-v2.md` as the confirmed art-direction update. Review/apply `specs/assetRules.patch`: it increases only the listed colour budgets and removes the obsolete waiver for the new trampoline. All other checks remain enabled.
3. Copy `art/reference/targets/` into the project's matching folder. Run `npm run art:check`, `npm run review:capture`, and `npm run review:compare` in the integration workspace.
4. Use these after captures as the asset-only comparison targets, named by shot. Preserve the approved before baselines until Trevor approves the integrated result.
5. Complete the HUD/sign layout recommendations in the style guide separately. The mockup's framing differs from the playable level; do not change gameplay geometry to force a screenshot match.

`specs/asset-manifest.json` supplies every PNG's path, size, role, colours, hash and contract notes. `specs/validation.md` records checks and remaining limitations. `source/` preserves generator overrides and ImageGen prompts for future work.

This pack intentionally retains Melody's full animation sheets and the small ambient animal animations. It redraws the environment's hero assets, coordinates supporting procedural art and replaces the boy/obstacle placeholders. It is not a claim that every original texture has been repainted.
