# Changelog

## Unreleased

- Swapped in Artist's Hero Car A as the default car with 36 slices at 43 × 71 px each.
- Added a runtime fallback to the original placeholder car when the primary car fails to load or validate.
- Preserved handoff cars during bulk placeholder regeneration and exposed `--bg-tol` for opaque sheets.

## 0.1.0 — Phase 1

- Added six original orthographic placeholder sheets, carved sprite strips, and visual check sheets.
- Added a one-command sheet importer, per-asset presets, and artist handoff instructions.
- Built the Kitchen Circuit with a procedural wood table, stacked prop boundaries, and a cereal-box chicane.
- Added keyboard driving, arcade drift, tire effects, and collision bounce.
- Added a three-lap race with directional checkpoints, lap splits, a live circuit map, saved best lap, and a finish screen.
- Matched prop and car collision dimensions to the loaded sprite strips for artist swaps.
- Widened the carved mug handle opening and matched its collision footprint.
- Added Vitest coverage for checkpoint order, lap records, collision math, and sprite strip validation.
- Verified placeholder regeneration, artist swaps, and a full race in Chromium against the production build.
