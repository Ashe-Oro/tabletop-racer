# Prop — salt shaker

Toy-scale tabletop prop for Tabletop Racer, authored next to Hero Car A (car top-down footprint **43×71 px**, **36 slices** tall).

## Files

| File | What it is |
| --- | --- |
| `prop_salt_shaker_fourview.png` | Source 1×4 sheet (TOP, SIDE, FRONT, BACK) |
| `prop_salt_shaker_preview.png` | Slicer check: extracted views, four angles, exploded |
| `prop_salt_shaker_turntable.gif` | 24-frame turntable, squash 0.75, spacing 1.0 |
| `prop_salt_shaker_slices.png` | Slice strip, ground slice on the left |
| `prop_salt_shaker_viewer.html` | Interactive viewer |

## Footprint vs the car

| | Plan W×L (px) | Height (slices) | `--round` | Source attempt |
| --- | --- | --- | --- | --- |
| This prop | **25×25** | **44** | true | 1 |
| Hero Car A | 43×71 | 36 | no | v1 (approved) |

Relative to the car: plan is 0.58× wide and 0.35× long; height is 1.22× the car.

## QA

PASS. Almost exact target (24×24×44). Painted cap dots, not punched holes. Clean ortho cylinder.

## Carve notes

--round keeps it circular. A little cap speckle in 3/4. No thin_runs. Slightly taller than the car (44 vs 36).

## Slice settings

```
python3 tools/sprite-stacking/scripts/views_to_slices.py \
  art/handoff/prop_salt_shaker_fourview.png art/handoff/prop_salt_shaker_slices.png \
  --slices 44 --shade 0.12 --colours 32 --order reading --top-nose down --side-nose left --round
```

Style lock: `art/STYLE.md`. Pipeline: `art/pipeline.md`.
