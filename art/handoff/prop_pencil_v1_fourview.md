# Prop — pencil

Toy-scale tabletop prop for Tabletop Racer, authored next to Hero Car A (car top-down footprint **43×71 px**, **36 slices** tall).

## Files

| File | What it is |
| --- | --- |
| `prop_pencil_fourview.png` | Source 1×4 sheet (TOP, SIDE, FRONT, BACK) |
| `prop_pencil_preview.png` | Slicer check: extracted views, four angles, exploded |
| `prop_pencil_turntable.gif` | 24-frame turntable, squash 0.75, spacing 1.0 |
| `prop_pencil_slices.png` | Slice strip, ground slice on the left |
| `prop_pencil_viewer.html` | Interactive viewer |

## Footprint vs the car

| | Plan W×L (px) | Height (slices) | `--round` | Source attempt |
| --- | --- | --- | --- | --- |
| This prop | **18×147** | **12** | false | 2 |
| Hero Car A | 43×71 | 36 | no | v1 (approved) |

Relative to the car: plan is 0.42× wide and 2.07× long; height is 0.33× the car.

## QA

PASS (after 1 retry). Attempt 1 carved beautifully but was short (13×58, shorter than the car). Attempt 2 is a long barrier (18×147, about two car lengths). TOP was shorter than SIDE on the source sheet (~47%), so the slicer fit stretches the top view; the turntable still reads as a clean #2 pencil. The official slicer find_views drops the small FRONT/BACK ends (under 14% of the largest view's area); use the provided slices or art/carve_long_prop.py.

## Carve notes

Tip, ferrule and eraser all survive; thin_runs empty. Slightly fatter than the 12-px target (18 px) because of the TOP/SIDE length mismatch. Still a chunky log-like barrier.

## Slice settings

```
python3 tools/sprite-stacking/scripts/views_to_slices.py \
  art/handoff/prop_pencil_fourview.png art/handoff/prop_pencil_slices.png \
  --slices 12 --shade 0.12 --colours 32 --order reading --top-nose down --side-nose left
```

## Slicer note (long props)

The skill slicer's `find_views` drops any view whose bounding box is under 14% of the largest view's area. The FRONT/BACK ends of this long prop fall under that gate, so a naive `npm run slice` on the four-view sheet will fail with "Found 2 drawings".

Use the shipped `prop_pencil_slices.png`, or recarve with:

`python3 art/carve_long_prop.py art/handoff/prop_pencil_fourview.png pencil`

Style lock: `art/STYLE.md`. Pipeline: `art/pipeline.md`.
