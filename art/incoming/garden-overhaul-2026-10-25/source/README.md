# Rebuilding the art pack

Requires Python, Pillow and NumPy. Run `python source/draw_native.py`, then `python source/export_generated.py` from this pack. Both write only this pack's `assets/` folder. The second step restores the selected generated hero assets over procedural alternatives. The preserved Melody sheet is an input only for the established portrait crop.

`native/` is a snapshot of the existing editable art source. Do not run its original main entrypoint with `--force` against a live project. `prompts.json` records ImageGen requests; the three initial requests have labelled brief summaries because their exact prompts were not retained in this work session. High-resolution masters in `generated/` are source art, not shipping PNGs.
