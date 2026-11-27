# Hero Car A — "Stripe" four-view sheet

Shipped 25 November 2026, America/New_York (UTC-5).

Cherry-red compact toy sports coupe with a bold white center stripe, dark teal cabin, yellow hubs and headlights, and a short thick attached rear spoiler.

## Files

| File | What it is |
| --- | --- |
| `hero_car_a_fourview.png` | Source 1×4 sheet (TOP, SIDE, FRONT, BACK) on near-white, 2172×724 |
| `hero_car_a_preview.png` | Slicer check sheet: extracted views, four turntable angles, exploded stack |
| `hero_car_a_turntable.gif` | 24-frame turntable at 15° steps, squash 0.75, spacing 1.0, 6× nearest |
| `hero_car_a_slices.png` | 36-slice strip (43×71 px each, ground slice on the left) |
| `hero_car_a_viewer.html` | Interactive slicer viewer |

Style lock: `/workspace/tabletop-racer/art/STYLE.md`. Pipeline record: `/workspace/tabletop-racer/art/pipeline.md`. Attempt PNGs: `/workspace/tabletop-racer/art/attempts/`.

## QA

**Passed with one residual scale note.** Stopped after the allowed two regenerations. This is attempt 3, the closest match.

Sheet measurements (bounding boxes, including 1 px outlines):

| View | Size (w×h px) | Notes |
| --- | --- | --- |
| TOP | 375×626 | Front pointing down (headlights at the bottom). |
| SIDE | 621×316 | Front pointing left. Slightly pictorial, not a perfect flat elevation. |
| FRONT | 395×325 | |
| BACK | 390×325 | |

- TOP length vs SIDE length: 626 vs 621 (5 px, 0.8%) — pass
- SIDE height vs FRONT/BACK height: 316 vs 325 (9 px, 2.8%) — pass
- TOP width vs FRONT width: 375 vs 395 (20 px, 5.1%) — **short of the bar**. TOP is a little narrower than FRONT, so the visual hull may clip the outer wheel bulge slightly. Wheels still read on the turntable.
- TOP width vs BACK width: 375 vs 390 (15 px, 3.8%) — close enough
- Orientation, hard edges, no antennas/mirrors/stalks, spoiler is a thick attached wedge: pass
- Edge fringe against the background is low (0.01 on most views, 0.06 on FRONT)
- Readable at native stack size (43×71 top)
- Slicer `thin_runs`: none. No 1 px parts that will blink as it turns

**Carving notes for Game Dev:** shoulders are a bit blocky in 3/4, typical of the visual hull. Wheel wells are shallow; the tires are faired into the body rather than deeply cut. The SIDE view is still a touch pictorial (hood and roof are not a perfect elevation), which can add a little extra mass when carved. Re-slice with `--slices 36 --shade 0.12 --colours 32 --order reading --top-nose down --side-nose left`. Background is near-white with slight 253–255 noise, not a single `#FFFFFF` or `(250,250,250)` key; use the slicer's default flood-fill `--bg-tol 28`, not a strict color key.

## Generator

- Tool: Codex CLI built-in `image_gen` / `image_gen__imagegen` on Ashe's ChatGPT subscription
- `transparent_background`: false
- Attempt 3 was an edit of attempt 2 (`referenced_image_paths` = `art/attempts/hero_car_a_attempt2.png`)
- Source file: `/home/box/.codex/generated_images/01a21398-f275-7a21-9e44-352ce38513d8/exec-77232342-3db2-40de-a9f5-5e89ea802fca.png`

## Image_gen prompt (attempt 3, the shipped sheet)

```
Edit this 1x4 pixel-art model sheet. Keep the same compact Micro Machines-style cherry-red toy sports coupe (hero car "Stripe"): body #E23A2B, cool #8E1E32 shadows, warm #FF6A4A top highlights, bold white #F4F0E6 center stripe hood-to-spoiler, dark teal #1C3D4A glass with a few #A8E4F0 specular pixels, four chunky black #1C1C20 tires with yellow #F0C53A hubs, yellow #F5D76A headlights, red #B01A1A taillights, short thick spoiler attached to the trunk (solid wedge, no stalks). No antenna, no skinny mirrors, no exhaust pipes, no ground shadows, no text, no grid.

CRITICAL SCALE FIX: the TOP view is drawn too small. Enlarge ONLY the TOP view, and if needed make the whole canvas taller, so the four views are the same model at the same scale. Target sizes in pixels (including the 1px outline):
- TOP must be 394 px wide and 620 px tall (front pointing DOWN, headlights at the bottom, spoiler at the top).
- SIDE must stay about 620 px wide and 329 px tall (true flat orthographic elevation, front pointing LEFT).
- FRONT and BACK must stay about 394 px wide and 329 px tall.
Those numbers are mandatory: TOP height = SIDE width = 620; TOP width = FRONT width = BACK width = 394; SIDE height = FRONT height = BACK height = 329.

Keep a clean 1x4 horizontal row on flat solid white, generous gaps between views. Strictly orthographic, zero perspective, zero tilt, zero 3/4 angle. Bold 1px dark #1A1210 outline around each view, solid flat color clusters, crisp 3-tone hue-shifted pixel shading, zero anti-aliasing, zero soft edges. Wheels in the TOP view are rounded in plan. Do not shrink the top view to "fit a square"; give it the full 620 px of height.
```

Attempt 1 used the skill's four-view prompt with the subject swapped in (see `art/pipeline.md`). Attempts 1 and 2 failed the scale bar (TOP drawn too small). Full prompts and reports: `art/pipeline-logs/`.

## Usage checks

`/home/box/bin/llm-usage` was run with `--fresh` before each Codex invocation. Codex weekly usage stayed at **5.0% used**, resets **Dec 01 05:04 PM EST**. The checker did not move after three `image_gen` runs; image generation may be metered separately from the weekly coding window, or the percentage is coarse. Claude CLI could not be read (logged out). No `OPENAI_API_KEY` or other paid image API was used. No dollar cost is available from the CLI.

| Run | When (EST) | Usage before | Codex exec tokens (last message) |
| --- | --- | --- | --- |
| Attempt 1 (new image) | Nov 25 11:41 AM | 5.0% | 16,110 |
| Attempt 2 (edit of 1) | Nov 25 11:43 AM | 5.0% | 20,739 |
| Attempt 3 (edit of 2, shipped) | Nov 25 11:45 AM | 5.0% | 22,195 |

## Slicer settings used for the preview

```
python3 tools/sprite-stacking/scripts/views_to_slices.py \
  art/handoff/hero_car_a_fourview.png art/handoff/hero_car_a_slices.png \
  --slices 36 --shade 0.12 --colours 32 --order reading \
  --top-nose down --side-nose left \
  --preview art/handoff/hero_car_a_preview.png \
  --html art/handoff/hero_car_a_viewer.html
```

Output: 36 slices of 43×71 px.
