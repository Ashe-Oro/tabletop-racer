# Artist handoff

## v3 asset naming

The source PNGs described in [README_v3.md](README_v3.md) use the conventions
below. Drop source PNGs in this directory and run `npm run slice:artist`
from the repository root. To import by filename, pass the path to
`npm run slice --`.

| File | Format | Single-file import |
| --- | --- | --- |
| `cars_v3_<name>_8dir.png`, `_16dir.png` or `_32dir.png` | Horizontal strip of 32 × 32 px frames | `npm run slice -- art/handoff/cars_v3_stripe_8dir.png` |
| `picnic_<item>.png` | Transparent top-down sprite at native pixel size | `npm run slice -- art/handoff/picnic_watermelon.png` |
| `ground_<name>.png` | Seamless 128 × 128 px tile | `npm run slice -- art/handoff/ground_tablecloth.png` |

Keep the car pivot at the center of each frame and the body about 24 art px
long. Frame 0 faces east (+X), and each frame advances clockwise by one equal
angle. The eight compass points are E, SE, S, SW, W, NW, N, NE. For 16 or 32
frames, draw the evenly spaced intervening angles. Leave the background
transparent and keep cast shadows out of the frames.

| v3 car | Slot |
| --- | --- |
| `stripe` | `car_1` |
| `pickup` | `car_2` |
| `f1` | `car_3` |
| `taxi` | `car_4` |

When the v3 sheets are together, importing a named car refreshes all four
supplied sheets, including when you pass its matching slot explicitly
(`npm run slice -- art/handoff/cars_v3_stripe_8dir.png car_1`). Bulk import
uses the same mapping. Legacy names `hero_red`, `cobalt_gt`, `sunburst` and
`emerald` remain aliases. A standalone custom sheet can use its slot in
the filename or accept the slot as the second argument. For bulk import,
supply one sheet per slot.

The v3 picnic set uses `basket`, `plate`, `sandwich`, `watermelon`,
`ketchup`, `mustard`, `fork`, `napkins`, `cup`, `bottle_cap`, `ant` and
`ant_walk`. Use a centered pivot, with one art pixel per world pixel. The
importer copies the PNG and records its visible alpha bounds from the
frames. Each PNG has one frame except `picnic_ant_walk.png`, which has two
side-by-side 16 × 16 px frames facing east. Cars and flat sprites bypass
the orthographic slicer.

Ground tile names are `tablecloth`, `grass` and `wood`. The importer copies
them at native size.

## Orthographic sheets and existing stacks

Put the views in one row with at least 40 px between them, in TOP, SIDE,
FRONT, BACK order. The top nose points down and the side nose points left.
Use crisp pixel edges, a 1 px dark outline and a transparent background to
preserve enclosed holes. For opaque sheets, use `--bg-tol N` to override the
flood-fill tolerance (default 28) or `--key-background` for the exact matte
RGB (250, 250, 250).

For custom filenames, pass an asset ID after the path. Existing IDs are
`car`, `car_placeholder`, `pencil`, `coin`, `ruler`, `mug`, `cereal_box`,
`eraser`, `salt_shaker`, `butter_dish` and `crumb_pile`, plus the picnic
presets. Use `--slices N` to set the stack height. Review the output in
`art/checks/` and reload the game. Importing the legacy `car` slot also
refreshes the stack liveries where no direction sheet is installed.

The bulk Artist command also installs any current legacy strips in this
directory. It skips legacy originals absent from a checkout when their
installed copies are available. It uses the shipped strips to preserve
slice-only revisions and skips archived
`*_v1_*` material. To install one pre-carved strip, run
`npm run slice -- --from-slices art/handoff/prop_pencil_slices.png pencil --slices 12`.

`npm run slice:all` regenerates the placeholder sheets and restores their
strips where there is no Artist override. Both bulk commands regenerate the
stack liveries for slots without installed direction sheets. The importer
requires Python 3 with Pillow and NumPy.
