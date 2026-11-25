# Artist handoff

## v3 asset naming

The import conventions below also apply when the Artist delivery includes a
`README_v3.md`. Drop source PNGs in this directory and run
`npm run slice:artist` from the repository root. To install a single v3 PNG,
pass its path to `npm run slice --`.

| File | Format | Single-file import |
| --- | --- | --- |
| `cars_v3_<name>_8dir.png`, `_16dir.png` or `_32dir.png` | Horizontal strip of 32 × 32 px frames | `npm run slice -- art/handoff/cars_v3_cobalt_gt_16dir.png` |
| `picnic_<item>.png` | Four equally scaled orthographic views | `npm run slice -- art/handoff/picnic_watermelon.png` |
| `ground_<name>.png` | Seamless PNG texture tile | `npm run slice -- art/handoff/ground_checkered_tablecloth.png` |

Keep the car pivot at the center of each frame and the body about 24 art px
long. Frame 0 faces east (+X), and each frame advances clockwise by one equal
angle. The eight compass points are E, SE, S, SW, W, NW, N, NE. For 16 or 32
frames, draw the evenly spaced intervening angles. Leave the background
transparent and keep cast shadows out of the frames.

The names `hero_red`, `cobalt_gt`, `sunburst` and `emerald` map to
`car_1` through `car_4`. You can also name the sheets by slot
(`cars_v3_car_1_8dir.png`) or pass a slot as the second argument. Bulk import
assigns unrecognized names to the remaining slots in filename order. Supply
one sheet per slot.

Picnic preset names are `plate`, `cup`, `basket`, `watermelon`, `ketchup`,
`napkin`, `fork` and `ant`. Supported ground names are
`checkered_tablecloth`, `blanket`, `grass` and `wood_planks`.
The importer keeps ground tiles at their native size.

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
directory and downsamples `table_wood_tile.png`. It skips legacy originals
absent from a checkout when their installed copies are available. It uses
the shipped strips to preserve slice-only revisions and skips archived
`*_v1_*` material. To install one pre-carved strip, run
`npm run slice -- --from-slices art/handoff/prop_pencil_slices.png pencil --slices 12`.

`npm run slice:all` regenerates the placeholder sheets and restores their
strips where there is no Artist override. Both bulk commands regenerate the
stack liveries for slots without installed direction sheets. The importer
requires Python 3 with Pillow and NumPy.
