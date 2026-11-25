# Changelog

## Unreleased

- Installed Artist v2 slice revisions: hex pencil with a flush ferrule, unbanded mug, 2-slice butter-dish seam, stable salt-cap holes, clean coin disks, and Hero Car A with a top-only stripe and softer shoulders. `TRACK_CONFIG.OBSTACLES` stays off by default.
- `npm run slice:artist` now installs the current shipped strips for the car and all nine props, refuses archived `*_v1_*` files, and no longer recarves stale four-views.
- Imported Artist v1's nine props. The pencil, ruler, and coin stack outline the circuit with clearance for the driving lane. The mug, cereal box, eraser, salt shaker, butter dish, and crumb pile are bumpable with `TRACK_CONFIG.OBSTACLES` enabled. Obstacles are off by default.
- Replaced the procedural tabletop with Artist's nearest-neighbor oak tile and retained the edge, start/finish checks, and direction chevrons.
- The HUD uses Artist's ink, cream, teal, red, and gold palette with a pixel frame. Bitmap glyphs, the pre-race countdown, and position badges remain open.
- Swapped in Artist's Hero Car A as the default car with 36 slices at 43 × 71 px each.
- Added a runtime fallback to the original placeholder car when the primary car fails to load or validate.
- Added an Artist v1 bulk import and support for pre-carved strips. Bulk placeholder regeneration preserves all handoff-sourced stacks. The importer accepts `--bg-tol` for opaque sheets.

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
