# Prop — butter dish

Toy-scale tabletop prop for Tabletop Racer, authored next to Hero Car A (car top-down footprint **43×71 px**, **36 slices** tall).

## Files

| File | What it is |
| --- | --- |
| `prop_butter_dish_fourview.png` | Source 1×4 sheet (TOP, SIDE, FRONT, BACK) |
| `prop_butter_dish_preview.png` | Slicer check: extracted views, four angles, exploded |
| `prop_butter_dish_turntable.gif` | 24-frame turntable, squash 0.75, spacing 1.0 |
| `prop_butter_dish_slices.png` | Slice strip, ground slice on the left |
| `prop_butter_dish_viewer.html` | Interactive viewer |

## Footprint vs the car

| | Plan W×L (px) | Height (slices) | `--round` | Source attempt |
| --- | --- | --- | --- | --- |
| This prop | **54×37** | **26** | false | 1 |
| Hero Car A | 43×71 | 36 | no | v1 (approved) |

Relative to the car: plan is 1.26× wide and 0.52× long; height is 0.72× the car.

## QA

PASS. Smooth lid, no thin knob, butter sliver in the elevation seam. Footprint 54×37×26 vs target 48×36×26.

## Carve notes

Clean lidded box. Tiny dark corner pixels in 3/4, not structural. No thin_runs.

## Slice settings

```
python3 tools/sprite-stacking/scripts/views_to_slices.py \
  art/handoff/prop_butter_dish_fourview.png art/handoff/prop_butter_dish_slices.png \
  --slices 26 --shade 0.12 --colours 32 --order reading --top-nose down --side-nose left
```

Style lock: `art/STYLE.md`. Pipeline: `art/pipeline.md`.
