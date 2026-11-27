# Prop — cereal box

Toy-scale tabletop prop for Tabletop Racer, authored next to Hero Car A (car top-down footprint **43×71 px**, **36 slices** tall).

## Files

| File | What it is |
| --- | --- |
| `prop_cereal_box_fourview.png` | Source 1×4 sheet (TOP, SIDE, FRONT, BACK) |
| `prop_cereal_box_preview.png` | Slicer check: extracted views, four angles, exploded |
| `prop_cereal_box_turntable.gif` | 24-frame turntable, squash 0.75, spacing 1.0 |
| `prop_cereal_box_slices.png` | Slice strip, ground slice on the left |
| `prop_cereal_box_viewer.html` | Interactive viewer |

## Footprint vs the car

| | Plan W×L (px) | Height (slices) | `--round` | Source attempt |
| --- | --- | --- | --- | --- |
| This prop | **67×25** | **88** | false | 1 |
| Hero Car A | 43×71 | 36 | no | v1 (approved) |

Relative to the car: plan is 1.56× wide and 0.35× long; height is 2.44× the car.

## QA

PASS. Clean ortho box, typography as color blocks only, no thin parts. Came out thinner and a bit wider than the 50×36 target (a more realistic cereal-box proportion) and carves perfectly.

## Carve notes

Very clean visual hull. No thin_runs. 67×25×88 — a tall landmark, about 1.5× car width and 2.4× car height.

## Slice settings

```
python3 tools/sprite-stacking/scripts/views_to_slices.py \
  art/handoff/prop_cereal_box_fourview.png art/handoff/prop_cereal_box_slices.png \
  --slices 88 --shade 0.12 --colours 32 --order reading --top-nose down --side-nose left
```

Style lock: `art/STYLE.md`. Pipeline: `art/pipeline.md`.
