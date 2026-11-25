# Changelog

## Unreleased

- Corrected the car direction frames and added smooth rotation between them for both the car and its silhouette shadow. Tightened cornering grip, reduced chase camera lead, and suppressed low-speed steering jitter from rebounds.
- Enlarged stationary and walking ants to 2× with nearest-neighbor rendering and matching silhouette shadows. Their placement bounds keep them clear of props, the lane, and each other.

## 3.0.2

- Published the game at https://tabletop-racer.vercel.app from the public GitHub repo https://github.com/Ashe-Oro/tabletop-racer. Pushes to `main` deploy to production.

## 3.0.1

- Added 35% black silhouette shadows under props and cars. Direction-sheet shadows follow the active frame and stay on the ground as the car bounces.
- Baked the vertical squash into the wood, tablecloth, and grass tiles with nearest-neighbor sampling so ground pixels stay crisp at 1× and 2× zoom.
- Re-imported the F1 strip with the northeast frame inset one pixel from both sides.

## 3.0.0 — Artist v3 picnic art

- Installed eight-direction Stripe, Pickup, F1, and Taxi sheets with the Artist's east and west redraws. The stack placeholder remains available if a car sheet fails to load.
- Added native-scale picnic sprites, including the revised plate and condiment bottles, sandwiches, bottle caps, and walking ants. Solid sprite footprints use visible alpha bounds. Picnic setups leave the default route clear.
- Tiled the tablecloth, grass border, and wood with Artist's 128 × 128 textures.
- Updated the Artist importer and offline release for the v3 art. Added a gameplay close-up, car-select composite, and driving clip.

## 2.0.0 — Picnic Circuit

- Reduced Hero Car A's nominal footprint from 43 × 71 to 14.54 × 24 art px, with matching collision and tire effects. Retuned steering, speed, and handbrake grip.
- Expanded the table to 4,400 × 3,000 art px with an 8,465.48 px loop. Added a checkered tablecloth, grass and blanket border, and eight picnic props alongside the nine Artist props.
- Opened the table to free-roaming driving, with route cues, nine intermediate gates, a scaled minimap, a leading chase camera, and a full-table overview. The optional challenge configuration adds six in-lane obstacles.
- Added four selectable car liveries and support for clockwise 8-, 16-, or 32-frame direction sheets. The Artist importer recognizes v3 car, picnic, and ground filenames.
- Added the offline release and v2 screenshot, map overview, and gameplay clip. Verified a full keyboard-driven lap in Chromium from `file://`.

## Before 2.0.0

- `npm run build:single` generates `dist-single/tabletop-racer.html`, a self-contained game that opens directly in a browser.
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
