# Prop — pencil (v2)

Toy-scale tabletop prop for Tabletop Racer, next to Hero Car A (43×71 px, 36 slices).

v1 (AI four-view, visual-hull carve) is archived as `prop_pencil_v1_*`. It read as a flat, lumpy, banded log, and Game Dev QA flagged a ferrule-to-body step at 90°.

## Files

| File | What it is |
| --- | --- |
| `prop_pencil_fourview.png` | Native 1×4 sheet (TOP, SIDE, FRONT, BACK), procedural |
| `prop_pencil_fourview_8x.png` | Same sheet, 8× nearest for humans |
| `prop_pencil_preview.png` | Slicer check |
| `prop_pencil_turntable.gif` | 24-frame turntable, squash 0.75, spacing 1.0, 5× |
| `prop_pencil_slices.png` | Slice strip, ground slice on the left |
| `prop_pencil_viewer.html` | Interactive viewer |
| `pencil_before_after.png` | v1 vs v2 on wood, 4×, squash 0.75, at 45° and 90° |

## Footprint

**18×147×12**, same drop-in as v1. About two car lengths (0.42× wide, 2.07× long, 0.33× tall vs the car).

## Method

Built in code from a clean flat-top hex profile (`art/build_hex_pencil.py`), locked STYLE.md palette. Discrete 18×12 hex (widths 10/12/14/16/16/18/18/16/16/14/12/10), sitting on a facet, with 3-tone wood bands (`#E8C48A` / `#C99554` / `#8A5A2B`) and 1px dark side-wall edges at the facet joints. Sections: graphite 6, wood cone 18, yellow body 103, silver ferrule 10 with two crimp rings, pink eraser 10 with a rounded cap. Ferrule and the start of the eraser use the **same hex profile** as the body so the join is flush at every z. Tip tapers in both x and z.

A 1×4 four-view was generated and fed to `art/carve_long_prop.py`. The visual hull recovered the prism but lumped the cone, so the **shipped slices are the procedural volume itself**. `thin_runs` empty. No image_gen for this redo.

## QA

- 3/4 (45°/135°/315°) reads as a hexagonal prism: 2–3 flat facets, light/mid/shadow bands, clean wood cone, graphite tip, distinct silver ferrule with 2 crimp lines, pink rounded eraser. Straight, no lumps.
- 90° silhouette is straight; ferrule-to-body join is flush.
- FRONT is a crisp hex; TOP shows three lengthwise bands.

Style lock: `art/STYLE.md`. Pipeline: `art/pipeline.md`. Generator: `art/build_hex_pencil.py`.
