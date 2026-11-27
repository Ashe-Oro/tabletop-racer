# Prop — mug

Toy-scale tabletop prop for Tabletop Racer, authored next to Hero Car A (car top-down footprint **43×71 px**, **36 slices** tall).

## Files

| File | What it is |
| --- | --- |
| `prop_mug_fourview.png` | Source 1×4 sheet (TOP, SIDE, FRONT, BACK) |
| `prop_mug_preview.png` | Slicer check: extracted views, four angles, exploded |
| `prop_mug_turntable.gif` | 24-frame turntable, squash 0.75, spacing 1.0 |
| `prop_mug_slices.png` | Slice strip, ground slice on the left |
| `prop_mug_viewer.html` | Interactive viewer |

## Footprint vs the car

| | Plan W×L (px) | Height (slices) | `--round` | Source attempt |
| --- | --- | --- | --- | --- |
| This prop | **72×60** | **60** | true | 2 |
| Hero Car A | 43×71 | 36 | no | v1 (approved) |

Relative to the car: plan is 1.67× wide and 0.85× long; height is 1.67× the car.

## QA

PASS (after 1 retry). Attempt 1 leaked coffee down the sides because the elevations showed the interior. Attempt 2 hides the coffee in SIDE/FRONT/BACK (cream walls, coffee disc on TOP only) and uses a solid handle ear with no finger hole.

## Carve notes

Handle is a solid blocky ear and survives at every angle. Mild vertical banding on the cylinder from --round. Coffee stays on the top disc. Footprint 72×60 includes the handle (target was 64×64 body).

## Slice settings

```
python3 tools/sprite-stacking/scripts/views_to_slices.py \
  art/handoff/prop_mug_fourview.png art/handoff/prop_mug_slices.png \
  --slices 60 --shade 0.12 --colours 32 --order reading --top-nose down --side-nose left --round
```

Style lock: `art/STYLE.md`. Pipeline: `art/pipeline.md`.
