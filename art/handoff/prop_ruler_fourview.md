# Prop — ruler

Toy-scale tabletop prop for Tabletop Racer, authored next to Hero Car A (car top-down footprint **43×71 px**, **36 slices** tall).

## Files

| File | What it is |
| --- | --- |
| `prop_ruler_fourview.png` | Source 1×4 sheet (TOP, SIDE, FRONT, BACK) |
| `prop_ruler_preview.png` | Slicer check: extracted views, four angles, exploded |
| `prop_ruler_turntable.gif` | 24-frame turntable, squash 0.75, spacing 1.0 |
| `prop_ruler_slices.png` | Slice strip, ground slice on the left |
| `prop_ruler_viewer.html` | Interactive viewer |

## Footprint vs the car

| | Plan W×L (px) | Height (slices) | `--round` | Source attempt |
| --- | --- | --- | --- | --- |
| This prop | **23×169** | **8** | false | 2 |
| Hero Car A | 43×71 | 36 | no | v1 (approved) |

Relative to the car: plan is 0.53× wide and 2.38× long; height is 0.22× the car.

## QA

PASS (after 1 retry). Attempt 1 had the TOP drawn sideways (long axis horizontal) and FRONT/BACK were dropped by the slicer. Attempt 2 has a vertical TOP (front/short end down), a long low SIDE, and separate end views. Length is within ~6% of the 180 target (169). Same 14% area-filter issue as the pencil — use the provided slices or art/carve_long_prop.py. Slight source-sheet softness on the thin edges, but the carved stack is crisp.

## Carve notes

Ticks survive as a dark edge of 2-px clusters. 8 slices, no thin_runs. A slightly thick wooden curb, about 2.4 car lengths.

## Slice settings

```
python3 tools/sprite-stacking/scripts/views_to_slices.py \
  art/handoff/prop_ruler_fourview.png art/handoff/prop_ruler_slices.png \
  --slices 8 --shade 0.12 --colours 32 --order reading --top-nose down --side-nose left
```

## Slicer note (long props)

The skill slicer's `find_views` drops any view whose bounding box is under 14% of the largest view's area. The FRONT/BACK ends of this long prop fall under that gate, so a naive `npm run slice` on the four-view sheet will fail with "Found 2 drawings".

Use the shipped `prop_ruler_slices.png`, or recarve with:

`python3 art/carve_long_prop.py art/handoff/prop_ruler_fourview.png ruler`

Style lock: `art/STYLE.md`. Pipeline: `art/pipeline.md`.
