# Artist handoff

Drop PNG sheets here. Use one row of four equally scaled orthographic views
with at least 40 px between them. Order them TOP, SIDE, FRONT, BACK. The top
nose points down and the side nose points left. Use a flat near-white or
transparent background, crisp pixel edges and a 1 px dark outline.

From the repository root, run `npm run slice -- art/handoff/my-car.png car`.
Use one of `car`, `pencil`, `coin`, `ruler`, `mug` or `cereal_box`.
Use `--slices N` to override the default height. Prefer transparent PNGs for
enclosed holes. For an opaque sheet with exact RGB (250, 250, 250) reserved
for the background, pass `--key-background`.

Review the output in `art/checks/` and reload the game. To restore all six
original placeholders, run `npm run slice:all`. The importer requires
Python 3 with Pillow and NumPy.
