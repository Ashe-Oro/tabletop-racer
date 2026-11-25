# Artist v2 stack QA

Reviewed the game's stack renderer at squash 0.75, spacing 1, at race zoom (2×) and 4×. Mug and butter dish were rendered in a QA turntable (they stay off the default circuit because `TRACK_CONFIG.OBSTACLES` remains `false`). Flagged-angle contact sheet: `media/07-qa-props-v2.png`. In-game lap: `media/07-art-set-v2.png` and `media/gameplay-v2art.mp4`.

`npm run slice:artist` now installs the current shipped strips (`hero_car_a_slices.png` and `prop_*_slices.png`) and refuses any `_v1_` archive. It does not recarve four-views, so these slice-only revisions are preserved. The long pencil and ruler imported at 18×147×12 and 23×169×8. All ten public strips match the current handoff files and not the v1 archives.

| Asset | Verdict | Notes |
| --- | --- | --- |
| Mug | **Fixed** | No ink banding at 0°, 35°, 135°, or 225°. Cream walls throughout; coffee is only on the top two slices (a rim-level disc). Handle stays solid. |
| Butter dish | **Fixed** | The gold lid seam is a continuous 2-slice band at 135° and 225°, at 2× and 4×. The dark lid-corner clusters from v1 are gone. |
| Salt shaker | **Fixed** | Cap holes hold a stable pattern across 80°–100°. The earlier 90° shimmer (holes merging and splitting) is gone. A specular highlight still moves, which is expected. |
| Coin stack | **Fixed** | Clean, even disks. Rims stay consistent at 80°, 90°, and 100° with no lumpy ridge crawl. |
| Pencil | **Fixed** | Procedural hex body with a flush ferrule at 90°. Facets, graphite tip, crimp rings, and eraser read cleanly at 35° and 90°. No ferrule-to-body step. |
| Hero Car A (stripe) | **Fixed** | The doubled rear-deck stripe at 135° and 225° is gone. The white band stays on the top slices (hood, roof, trunk) and reads as a single stripe. |
| Hero Car A (shoulders) | **Improved** | Front fenders are softer than v1 at 35°/3/4, but a slight faceted step remains on the front quarters. |
| Ruler, cereal box, eraser, crumb pile | Unchanged, still clean | Spot-checked at 35°. No new issues. |
