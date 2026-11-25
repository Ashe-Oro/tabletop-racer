# Artist handoff

Drop PNG sheets here. Use one row of four equally scaled orthographic views
with at least 40 px between them. Order them TOP, SIDE, FRONT, BACK. The top
nose points down and the side nose points left. Use a flat near-white or
transparent background, crisp pixel edges and a 1 px dark outline.

From the repository root, run `npm run slice -- art/handoff/my-car.png car`.
Use one of `car`, `car_placeholder`, `pencil`, `coin`, `ruler`, `mug`,
`cereal_box`, `eraser`, `salt_shaker`, `butter_dish` or `crumb_pile`.
Use `--slices N` to override the default height. Prefer transparent PNGs for
enclosed holes. For opaque sheets, `--bg-tol N` sets the integer color
tolerance for flood-fill background removal (default 28). For an opaque sheet
with exact RGB (250, 250, 250) reserved for the background, pass
`--key-background`.

Review the output in `art/checks/` and reload the game. If the `car` entry in
`public/assets/manifest.json` or its slice strip fails to load or validate, the
game logs a warning and uses the `car_placeholder` entry and
`public/assets/slices/car_placeholder.png`.

`npm run slice:artist` installs the current Artist strips for the hero car and
all nine props, then downsamples the table tile. It uses the exact current
filenames (`hero_car_a_slices.png`, `prop_*_slices.png`) and will refuse any
archived `*_v1_*` path. It does not recarve four-views, so slice-only revisions
are preserved. The official slicer still reports “Found 2 drawings” on the long
pencil and ruler fourviews; those stay on the shipped-strip path. To install one
strip on its own, run
`npm run slice -- --from-slices art/handoff/prop_pencil_slices.png pencil --slices 12`.

`npm run slice:all` regenerates the original placeholders and preserves every
installed stack whose manifest source starts with `art/handoff/`.
To explicitly restore the placeholder as the primary car, run
`npm run slice -- art/placeholders/car.png car`. The importer requires Python 3
with Pillow and NumPy.
