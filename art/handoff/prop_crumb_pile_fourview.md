# Prop — crumb pile

Toy-scale tabletop prop for Tabletop Racer, authored next to Hero Car A (car top-down footprint **43×71 px**, **36 slices** tall).

## Files

| File | What it is |
| --- | --- |
| `prop_crumb_pile_fourview.png` | Source 1×4 sheet (TOP, SIDE, FRONT, BACK) |
| `prop_crumb_pile_preview.png` | Slicer check: extracted views, four angles, exploded |
| `prop_crumb_pile_turntable.gif` | 24-frame turntable, squash 0.75, spacing 1.0 |
| `prop_crumb_pile_slices.png` | Slice strip, ground slice on the left |
| `prop_crumb_pile_viewer.html` | Interactive viewer |

## Footprint vs the car

| | Plan W×L (px) | Height (slices) | `--round` | Source attempt |
| --- | --- | --- | --- | --- |
| This prop | **38×35** | **12** | false | 1 |
| Hero Car A | 43×71 | 36 | no | v1 (approved) |

Relative to the car: plan is 0.88× wide and 0.49× long; height is 0.33× the car.

## QA

PASS. Irregular plan, chunky crumbs, one broken cookie piece. Isolated crumbs in the TOP view merge into a solid low mound after carving (expected visual-hull behavior). Footprint 38×35×12 vs 36×32×12.

## Carve notes

Reads as a cookie-crumb heap from every angle. No thin_runs. Low obstacle, shorter than the car.

## Slice settings

```
python3 tools/sprite-stacking/scripts/views_to_slices.py \
  art/handoff/prop_crumb_pile_fourview.png art/handoff/prop_crumb_pile_slices.png \
  --slices 12 --shade 0.12 --colours 32 --order reading --top-nose down --side-nose left
```

Style lock: `art/STYLE.md`. Pipeline: `art/pipeline.md`.
