# Artist handoff

Drop PNG sheets here. Use one row of four equally scaled orthographic views
with at least 40 px between them. Order them TOP, SIDE, FRONT, BACK. The top
nose points down and the side nose points left. Use a flat near-white or
transparent background, crisp pixel edges and a 1 px dark outline.

From the repository root, run `npm run slice -- art/handoff/my-car.png car`.
Use one of `car`, `car_placeholder`, `pencil`, `coin`, `ruler`, `mug` or `cereal_box`.
Use `--slices N` to override the default height. Prefer transparent PNGs for
enclosed holes. For opaque sheets, `--bg-tol N` sets the integer color
tolerance for flood-fill background removal (default 28). For an opaque sheet
with exact RGB (250, 250, 250) reserved for the background, pass
`--key-background`.

Review the output in `art/checks/` and reload the game. If the `car` entry in
`public/assets/manifest.json` or its slice strip fails to load or validate, the
game logs a warning and uses the `car_placeholder` entry and
`public/assets/slices/car_placeholder.png`.

`npm run slice:all` regenerates the placeholder props and `car_placeholder`.
It also regenerates `car` when its source is outside `art/handoff/` or missing.
To explicitly restore the placeholder as the primary car, run
`npm run slice -- art/placeholders/car.png car`. The importer requires Python 3
with Pillow and NumPy.
