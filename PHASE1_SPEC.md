# Tabletop Racer — Phase 1 Specification

Build Phase 1 of a SNES *Micro Machines*-style browser tabletop racer using sprite stacking in `/workspace/tabletop-racer`.

## Context & Tooling
- `tools/sprite-stacking/` already contains Daniel White's MIT-licensed `sprite-stacking` skill (`LICENSE`, `SKILL.md`, `references/engines.md`, `scripts/views_to_slices.py`, `scripts/viewer.html`). Read `tools/sprite-stacking/SKILL.md` and `tools/sprite-stacking/references/engines.md` before writing code.
- Maintain `CHANGELOG.md` and make clean incremental git commits as you complete milestones.
- Keep `art/handoff/` (with a short `art/handoff/README.md`) ready for Artist to drop 4-view sheets later.
- Use Vite + TypeScript + plain HTML5 Canvas 2D with nearest-neighbor pixel scaling (`imageSmoothingEnabled = false`, `image-rendering: pixelated`). Keep dependencies minimal (`vite`, `typescript`, `vitest` for unit tests).
- No paid image APIs, no `OPENAI_API_KEY`, no licensed assets, no deploy or remote push.

## 1. Asset Pipeline (One-Command Swapping)
1. **Placeholder 4-view sheets (`tools/generate_placeholders.py`)**:
   - Using Python 3 + Pillow + NumPy, draw 4-view orthographic pixel-art sheets at native resolution, add a 1px dark outline around each view, upscale 8x with `Image.NEAREST`, and lay out a `1x4` horizontal row (`TOP`, `SIDE`, `FRONT`, `BACK`) on flat near-white `(250, 250, 250)` with >= 40 px spacing between views (following `SKILL.md` Section 1c & `views_to_slices.py` conventions).
   - Orientation conventions: `TOP` looks straight down with front pointing DOWN (`+y`); `SIDE` has front pointing LEFT; `FRONT` and `BACK` match width & height pixel-for-pixel.
   - Generate sheets in `art/placeholders/` for:
     - `car`: sporty red Micro Machines-style racer with white racing stripe, dark cabin/windshield, 4 distinct dark tires, yellow headlights, red taillights, and a small rear spoiler (at least 2px thick parts so nothing blinks when rotating). Target ~20×36×16 slices.
     - `pencil`: classic yellow #2 wooden pencil with pink eraser, metal ferrule, and sharpened wood/graphite tip.
     - `coin`: gold/brass coin with raised rim (use `--round`).
     - `ruler`: wooden school ruler with clear dark inch/cm tick marks along the edge.
     - `mug`: ceramic coffee mug with dark coffee inside and a thick (2+ px) side handle (check `check.png` so the cylinder and handle carve cleanly without clipping the handle).
     - `cereal_box`: tall colorful cereal box with distinct front/side label panels.
2. **One-command asset importer (`tools/import_sheet.py` + `npm run slice`)**:
   - Create `tools/asset_presets.json` storing per-asset slicer settings (`slices`, `round`, `top_nose`, `side_nose`, `order`, `colours`, `shade`).
   - Create `tools/import_sheet.py <sheet_path> <asset_id> [optional overrides]` which:
     - Calls `tools/sprite-stacking/scripts/views_to_slices.py` to produce `public/assets/slices/<asset_id>.png` and `art/checks/<asset_id>_check.png`.
     - Verifies output dimensions (`sheet_width % slices == 0`).
     - Updates `public/assets/manifest.json` with `{ slices, sliceWidth, sliceHeight, source }` for `<asset_id>`.
   - Support `--all-placeholders` (or `npm run slice:all`) to build/re-slice all placeholder assets in one command, and ensure `npm run slice -- art/handoff/<file>.png <asset_id>` swaps in any new Artist sheet into `public/assets/slices/<asset_id>.png` + `manifest.json` in a single command!
   - Run `import_sheet.py` on all 6 assets and inspect the generated check sheets / slices to verify zero carving artifacts (no blinking 1px parts, no missing handle, nose direction verified).

## 2. Sprite-Stacking Canvas Renderer (`src/render/`)
Follow `tools/sprite-stacking/SKILL.md` Section 3 and `references/engines.md`:
- Render the game at crisp art-pixel resolution onto a backbuffer (or integer-scaled canvas, e.g. `scale = 3` or `4`) with `imageSmoothingEnabled = false` and CSS `image-rendering: pixelated`.
- Top-down camera following the car smoothly, at slight pitch: `squash = 0.75`, `spacing = 1.0`.
- Validate `sheet.width % asset.slices === 0` at load time.
- Software pixel-buffer (or 1x offscreen buffer) stack rasterizer:
  - Rotate each slice around symmetric centre `(w - 1) * 0.5, (h - 1) * 0.5` with `Math.round(...)` nearest sampling (no 0.5px wobble across 90° turns).
  - Draw ground shadow (union footprint offset `+2, +3` art px) before slice 0.
  - Draw slices bottom (`z = 0`) to top (`z = count - 1`), scaled vertically by `squash` and lifted by `-Math.round(z * spacing)`.
  - Trace a 1px dark outer outline ONCE around the finished 1x stack alpha silhouette (never per slice).
  - Verify heading math: since TOP front points `+y` (down), `turn = heading - Math.PI / 2` (confirm visually that driving forward moves the car nose-first!).
- Y-sort all stacks (car + every prop) by ground contact `y` each frame so stacks overlap cleanly and never interleave slices.
- Cache/bake static prop stacks at load time (since static props don't rotate per frame) while rendering the car dynamically at its live heading (and optional subtle bounce/lean).

## 3. Tabletop World, Track, Physics & Race Loop (`src/game/`)
- **Wood-grain kitchen table background**:
  - Procedural pixel-art wood-grain table surface (warm planks, wood grain streaks, subtle plank seams, a crisp table edge border with dark floor dropoff outside the playable table).
  - Painted/masking-tape checkered start/finish line and subtle corner/track markings so the loop direction is unmistakable at a glance.
- **Track loop & props**:
  - A closed-loop circuit on the table (wide enough for fun drifting, e.g., ~1400×950 art px table with a clear clockwise/counter-clockwise loop, straights, sweeping turns, and a chicane).
  - Track boundaries outlined by stacked **pencils** and **rulers**, **coins** marking corners/curbs, plus **one coffee mug** and **one cereal box** placed as prominent obstacles you steer around (e.g., cereal box island/chicane, mug near a bend).
  - Accurate collision shapes (OBB for rulers/pencils/cereal box, circle for mug/coins, plus table perimeter wall) with smooth push-out and elastic bounce impulse (no damage, brief car bounce/bump feedback).
- **Arcade car physics**:
  - Smooth acceleration, reverse/braking, speed-dependent steering, forward vs. lateral grip (natural drift when turning hard or holding Space/Shift for handbrake drift), tire skid marks on the table surface and small drift dust puffs.
  - Controls: Arrow keys or WASD to drive, Space (or Shift) to drift/handbrake, `R` to restart the race.
- **Checkpoints, 3-lap race & persistence**:
  - Ordered checkpoint gates around the track loop (must hit checkpoints in sequence before crossing start/finish counts a lap, preventing reverse-line exploits).
  - 3-lap race: current lap (`1/3` .. `3/3`), live current lap timer, last lap time, and Best Lap saved in `localStorage` (`tabletop_racer_best_lap_ms`).
  - Finish screen/banner on completing Lap 3 showing total race time, best lap, and "Press R to Race Again".
- **HUD & Debug hook**:
  - Clean retro pixel HUD showing Lap, Time, Best Lap, Speed/Gear or Drift indicator, and compact controls bar.
  - Expose read-only `window.__RACER_STATE__` (or `getState()`) with `{ x, y, heading, speed, lap, totalLaps, checkpoint, finished, collisions, lapTimesMs, bestLapMs }` for automated verification.

## 4. Verification & Deliverables
- Add Vitest unit tests (`npm test`) covering lap/checkpoint progression logic, collision/bounce math, and stack asset manifest validation.
- Build (`npm run build`) with zero TypeScript or Vite errors.
- Ensure everything is cleanly committed to git and `CHANGELOG.md` is updated.
- Print a concise summary of created files, commands, test results, and asset slicing results when finished.
