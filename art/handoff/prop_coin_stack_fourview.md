# Prop — coin stack

Toy-scale tabletop prop for Tabletop Racer, authored next to Hero Car A (car top-down footprint **43×71 px**, **36 slices** tall).

## Files

| File | What it is |
| --- | --- |
| `prop_coin_stack_fourview.png` | Source 1×4 sheet (TOP, SIDE, FRONT, BACK) |
| `prop_coin_stack_preview.png` | Slicer check: extracted views, four angles, exploded |
| `prop_coin_stack_turntable.gif` | 24-frame turntable, squash 0.75, spacing 1.0 |
| `prop_coin_stack_slices.png` | Slice strip, ground slice on the left |
| `prop_coin_stack_viewer.html` | Interactive viewer |

## Footprint vs the car

| | Plan W×L (px) | Height (slices) | `--round` | Source attempt |
| --- | --- | --- | --- | --- |
| This prop | **16×17** | **16** | true | 1 |
| Hero Car A | 43×71 | 36 | no | v1 (approved) |

Relative to the car: plan is 0.37× wide and 0.24× long; height is 0.44× the car.

## QA

PASS. Sheet proportions matched. A little smaller than the 22×22 target (16×17) but clearly readable next to the 43×71 car and carves cleanly with --round.

## Carve notes

Offset coins are somewhat lathed into a cylinder, but rims still read. No thin_runs. Good corner marker / curb.

## Slice settings

```
python3 tools/sprite-stacking/scripts/views_to_slices.py \
  art/handoff/prop_coin_stack_fourview.png art/handoff/prop_coin_stack_slices.png \
  --slices 16 --shade 0.12 --colours 32 --order reading --top-nose down --side-nose left --round
```

Style lock: `art/STYLE.md`. Pipeline: `art/pipeline.md`.
