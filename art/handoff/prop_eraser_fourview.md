# Prop — eraser

Toy-scale tabletop prop for Tabletop Racer, authored next to Hero Car A (car top-down footprint **43×71 px**, **36 slices** tall).

## Files

| File | What it is |
| --- | --- |
| `prop_eraser_fourview.png` | Source 1×4 sheet (TOP, SIDE, FRONT, BACK) |
| `prop_eraser_preview.png` | Slicer check: extracted views, four angles, exploded |
| `prop_eraser_turntable.gif` | 24-frame turntable, squash 0.75, spacing 1.0 |
| `prop_eraser_slices.png` | Slice strip, ground slice on the left |
| `prop_eraser_viewer.html` | Interactive viewer |

## Footprint vs the car

| | Plan W×L (px) | Height (slices) | `--round` | Source attempt |
| --- | --- | --- | --- | --- |
| This prop | **19×34** | **12** | false | 1 |
| Hero Car A | 43×71 | 36 | no | v1 (approved) |

Relative to the car: plan is 0.44× wide and 0.48× long; height is 0.33× the car.

## QA

PASS. Oriented with the long axis front-to-back (a typical school eraser), rather than the original 28×16 wide-brick target. Carves cleanly. Cream paper band, no text.

## Carve notes

Rounded brick, band wraps, no thin_runs. Nice small obstacle, about half a car long.

## Slice settings

```
python3 tools/sprite-stacking/scripts/views_to_slices.py \
  art/handoff/prop_eraser_fourview.png art/handoff/prop_eraser_slices.png \
  --slices 12 --shade 0.12 --colours 32 --order reading --top-nose down --side-nose left
```

Style lock: `art/STYLE.md`. Pipeline: `art/pipeline.md`.
