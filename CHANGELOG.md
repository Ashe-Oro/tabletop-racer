# Changelog

## 3.2.0 — Items

- Added five pickup items in Race mode: **Nitro**, **Oil Slick**, **Bullet**, **Shotgun**, and **Bomb**. Each pickup shows its item on the track inside a turning gold ring, so you can steer toward the one you want.
- Five rows of three pickups sit across the lane around the loop. A taken pickup returns after 4 seconds and may show a different item.
- Each car holds one item at a time. A car that already holds an item drives over pickups without taking them. Press E or Enter to use the item. The HUD shows the held item.
- Nitro raises the top speed by 45% for 1.6 seconds with an immediate kick, then tapers off. Bullet fires a long single shot. Shotgun fires a short three-shot spread. Oil Slick and Bomb drop behind the car. Oil lasts 14 seconds. A bomb arms after 0.45 seconds and goes off on contact or after 2.6 seconds. Its blast throws every car within 52 px. Bullets set off bombs.
- Hits spin the car out and cut its speed. A short grace period after each hit stops chain stuns.
- Rivals pick up and use items. They fire at cars lined up ahead, drop traps on cars close behind, save nitro for straights, and steer around dropped hazards. Autopilot uses the same rules.
- Time Trial has no items. Add `?items=0` to switch them off in Race mode.

## 3.1.2

- Drive the player car automatically in Race or Time Trial with `?autopilot=1` for QA. The HUD shows when autopilot is active.
- Set a player-only top-speed multiplier from 0.25 to 1 with `?speed=0.5` or another numeric value. This works with manual driving and autopilot.
- Added the remaining Artist handoff source files to the public repo, including v1 and current four-views, previews, turntables, viewers, HUD and wood-tile references, cars_v3 frames, style and quality-bar docs, and the art helper scripts.

## 3.1.1

- Return cars to the last checkpoint after sustained time off track or a stall. Use T or Backspace to reset during a run. Cars briefly blink on return.
- Set one to nine laps with `?laps=N` in Race and Time Trial. The HUD and lap splits follow the selected distance.
- Fixed full-throttle launch order to F1, Stripe, Taxi, then Pickup, with each car reaching 270 px/s at its listed acceleration time.
- Enlarged and spaced Overview markers and added a cream tick to show each car’s heading.

## 3.1.0 — AI Rivals

- Added RC Pro-Am-style launches with a smooth taper to top speed, gentler coasting, and four car setups with distinct acceleration, weight, and handling. The garage shows each car’s stats, weight affects bumps, and a segmented tach shows speed building through the launch.
- Made four-car Race the default with a staggered starting grid, a 3–2–1–GO countdown, live position, and standings that update as each car finishes. Time Trial starts on throttle and keeps the same saved best lap.
- Added three rivals that use the player’s driving physics. They choose passing lanes, brake for corners, avoid traffic and props, reverse out of stalls, and adjust pace to the player’s progress.
- Added car-to-car bumps and future boost and spin-out hooks. All cars cast silhouette shadows, depth-sort with scenery, and can leave skid marks and dust.
- Added rival markers and a player heading arrow to the minimap, visible car markers in Overview, and the build version and commit in the footer.
- Restored low-speed steering with throttle or reverse held so cars can turn free of props and table edges.
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
