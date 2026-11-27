# Tabletop Racer — Art pipeline record

Started: 25 November 2026, America/New_York (UTC-5).

## Tools

- **Image generation:** Codex CLI built-in `image_gen` / `image_gen__imagegen` on Ashe's ChatGPT subscription. This is the only allowed image generator.
- **Forbidden:** `OPENAI_API_KEY`, fal, PixelLab, Cursor `GenerateImage`, or any other paid image API. The Codex image-gen skill's CLI fallback (`scripts/image_gen.py`, needs `OPENAI_API_KEY`) was not used.
- **Slicer:** `/tmp/sprite-stacking/skills/sprite-stacking/scripts/views_to_slices.py` (mirrored at `tools/sprite-stacking/scripts/views_to_slices.py`).
- **QA helper:** `art/qa_sheet.py` (view split, proportion checks, edge-fringe score).
- **GPU:** not used. The RTX 4090 was not touched.
- **Usage check:** `/home/box/bin/llm-usage --fresh` before every Codex invocation.

## Style lock

- `/workspace/tabletop-racer/art/STYLE.md`
- Tier: detailed hi-bit, default **36 slices** (band 32–40).
- Light: form lighting from above and slightly in front; cool shadows, warm top highlights; no cast shadows on the sheet.
- Outline: 1 px `#1A1210` on each sheet view (stripped by the slicer); runtime outline once around the finished stack, never per slice.
- Hero vehicle: Car A "Stripe" — cherry-red toy sports coupe, white center stripe, dark teal glass, yellow hubs, short thick attached spoiler.

## Usage checks

| When (EST) | Codex weekly used | Resets | Notes |
| --- | --- | --- | --- |
| Before attempt 1 (11:41 AM) | 5.0% used | Dec 01 05:04 PM EST | Claude CLI could not be read (logged out). |
| Before attempt 2 (11:43 AM) | 5.0% used | Dec 01 05:04 PM EST | Unchanged after attempt 1. |
| Before attempt 3 (11:45 AM) | 5.0% used | Dec 01 05:04 PM EST | Unchanged after attempt 2. |
| After attempt 3 (11:47 AM) | 5.0% used | Dec 01 05:04 PM EST | Still unchanged. Image_gen may be metered separately, or the percentage is coarse. |

## Attempts

### Attempt 1 — new image — FAIL (scale)

- Codex session `01a21395-36d7-7601-87cc-c4a383f9188a`, 16,110 tokens, ~48 s.
- Source: `~/.codex/generated_images/01a21395-36d7-7601-87cc-c4a383f9188a/exec-d22fcb6d-370e-4331-a787-853afd52cbdf.png`
- Saved: `art/attempts/hero_car_a_attempt1.png` (2172×724)
- Prompt: skill four-view prompt with the "Stripe" coupe subject swapped in (full text in `art/pipeline-logs/codex-hero-car-prompt.md`). `transparent_background: false`. No reference images.
- Views: TOP 361×590, SIDE 657×336, FRONT 420×347, BACK 421×347.
- Failures: TOP length vs SIDE length 10.2% off; TOP width vs FRONT width 14.0% off. TOP was a shorter, fatter body than the SIDE. Orientation, edges, and thick spoiler were already good.
- Carve preview (for study): 36 slices of 43×70 px, turntable already read as a toy coupe, but volume used the narrower/shorter TOP so SIDE length was clipped.

### Attempt 2 — edit of attempt 1 — FAIL (scale worse)

- Codex session `01a21397-4c06-7e31-be81-b62d49fc9d17`, 20,739 tokens, ~54 s.
- Source: `~/.codex/generated_images/01a21397-4c06-7e31-be81-b62d49fc9d17/exec-cdc3df1a-4358-47ef-8eea-8b7fa5af1ba0.png`
- Saved: `art/attempts/hero_car_a_attempt2.png` (2172×724)
- `referenced_image_paths`: attempt 1. Prompt asked for one consistent body (length ≈ 1.6× width) and a true ortho SIDE.
- Views: TOP 328×499, SIDE 620×318, FRONT 394×329, BACK 391×329.
- Failures: TOP length vs SIDE 24% off; TOP width vs FRONT 20% off. The model again drew TOP too small. Design stayed clean.

### Attempt 3 — edit of attempt 2 — SHIPPED (pass with a residual width note)

- Codex session `01a21398-f275-7a21-9e44-352ce38513d8`, 22,195 tokens, ~73 s.
- Source: `~/.codex/generated_images/01a21398-f275-7a21-9e44-352ce38513d8/exec-77232342-3db2-40de-a9f5-5e89ea802fca.png`
- Saved as `art/attempts/hero_car_a_attempt3.png` and copied to `art/handoff/hero_car_a_fourview.png` (2172×724)
- `referenced_image_paths`: attempt 2. Prompt gave mandatory pixel targets (TOP 394×620, SIDE 620×329, FRONT/BACK 394×329) and told the model to enlarge only the TOP view.
- Views: TOP 375×626, SIDE 621×316, FRONT 395×325, BACK 390×325.
- Length match 0.8% (pass). Height match 2.8% (pass). TOP still 5.1% narrower than FRONT (the only automated fail, about two art pixels after downsample). Two regenerations used up; this is the best sheet.
- Slicer: `--slices 36 --shade 0.12 --colours 32 --order reading --top-nose down --side-nose left` → 36 slices of 43×71 px. `thin_runs` empty. Turntable and exploded views look like a readable Micro Machines toy coupe.
- Residual carve concerns: TOP slightly narrower than FRONT (outer wheel bulge may clip a little); SIDE still slightly pictorial; shoulders a bit blocky in 3/4; shallow wheel wells.

## Costs / usage

Codex `image_gen` is billed against the ChatGPT subscription, not a metered API key. No separate dollar cost is available from the CLI. Weekly Codex usage remained **5.0% used**, reset **Dec 01 05:04 PM EST**, after all three runs. Combined last-message token counts from the three `codex exec` sessions: 16,110 + 20,739 + 22,195 = **59,044**.

## Stop line (pass 1)

Hero car only was generated in the first pass. Props, table, HUD and the contact sheet were added after Ashe approved Hero Car A as v1.

## Pass 2 — props, table, HUD, contact sheet (25 Nov 2026, afternoon, EST)

Ashe approved Hero Car A as v1. This pass adds nine toy-scale props, a wood tile, a HUD style sheet, and a same-scale contact sheet. Same rules: Codex `image_gen` on the ChatGPT subscription only, `/home/box/bin/llm-usage --fresh` before every Codex run, no paid APIs, no 4090.

### Pencil and ruler decision

Both are **sprite stacks**, not floor decals. At car scale a pencil is a log-like barrier and a ruler is a low curb; the track uses them as walls with height, shadows and Y-sort. They were thickened (pencil diameter 18 px, ruler thickness 8 slices) so they carve. Painted table markings can still be decals later.

### Usage checks (all remained 5.0% used, reset Dec 01 05:04 PM EST)

| When (EST) | Before which run | Codex exec tokens |
| --- | --- | --- |
| 12:01 PM | Nine-prop batch | — |
| 12:05 PM | Table tile + HUD (parallel) | 16,825 |
| 12:08 PM (after props batch) | — | props batch 44,185 |
| 12:08 PM | Retry mug, ruler, pencil | 25,819 |

Weekly usage still reported **5.0% used** after every run. Combined new exec tokens ≈ 86,829, plus the earlier hero-car 59,044.

### Prop attempts

| Prop | Attempt 1 | Retry | Shipped | Carved W×L×H | QA |
| --- | --- | --- | --- | --- | --- |
| mug | Coffee bled down the sides (elevations showed the interior). | Attempt 2: cream walls, coffee on TOP only, solid handle. | 2 | 72×60×60, `--round` | PASS after 1 retry |
| cereal_box | Clean box, typography as color blocks. Thinner than the first target. | — | 1 | 67×25×88 | PASS |
| pencil | Beautiful carve but short (13×58). | Attempt 2 longer (18×147). Official `find_views` drops the tiny ends; recarved with `carve_long_prop.py`. | 2 | 18×147×12 | PASS after 1 retry |
| coin_stack | Clean, a bit small (16×17 vs 22×22). | — | 1 | 16×17×16, `--round` | PASS |
| ruler | TOP drawn sideways; slicer found only 2 views. | Attempt 2: vertical TOP, long SIDE. Same 14% area-filter; injected-view carve. | 2 | 23×169×8 | PASS after 1 retry |
| eraser | Long-axis front-to-back, cream band, clean carve. | — | 1 | 19×34×12 | PASS |
| salt_shaker | Exact-ish target, painted cap dots. | — | 1 | 25×25×44, `--round` | PASS |
| butter_dish | Smooth lid, no knob, butter sliver. | — | 1 | 54×37×26 | PASS |
| crumb_pile | Chunky crumbs; hull merges strays into a mound. | — | 1 | 38×35×12 | PASS |

No prop used a second retry. `thin_runs` was empty on every shipped carve.

### Table and HUD

- `table_wood_tile.png` (1254×1254) and `table_wood_tile_3x3.png` — attempt 1 shipped. Low-contrast oak, faint plank seams. Edge diffs ~1.6 (L-R) and ~4.2 (T-B); seams are not obvious at race zoom.
- `hud_style.png` + `HUD.md` — attempt 1 shipped. Lap 1/3–3/3, position 1st–3rd, timer + BEST, countdown 3-2-1-GO. Chunky SNES letterforms in the locked palette. Captions on the sheet are labels, not in-game art.

### Contact sheet

`art_set_v1_contact.png` composites the carved stacks (squash 0.75, 4× nearest, shared art-pixel scale) onto a tiled wood table: car in the middle, pencil and ruler as barriers, mug and cereal box as landmarks, the smaller props around them.

### Costs / usage

Still no dollar figure from the CLI. Codex weekly usage remained **5.0% used**, resets **Dec 01 05:04 PM EST**.


---

# v2 revision (2026-11-25)

Ashe flagged the pencil (flat/lumpy/banded like a log). Game Dev in-game QA (commit 96dc60f, `ARTSET_V1_QA.md`) also flagged a 90° ferrule-to-body step, plus mug banding, butter-dish seam/corners, salt-cap shimmer, coin-stack ridges/crawling rims, and car issues (narrow TOP, blocky shoulders, doubled stripe at 135/225).

Hard rules unchanged: no paid APIs, no 4090, STYLE.md palette, squash 0.75. This pass used **no Codex image_gen**; every revision is procedural or a cleaned recolor of the v1 occupancy. v1 assets are archived as `prop_*_v1_*` / `hero_car_a_v1_*`.

## Pencil (procedural hex volume)

Generator: `art/build_hex_pencil.py`. Discrete 18×12 flat-top hex, 147 long (graphite 6, wood cone 18, body 103, ferrule 10, eraser 10). Ferrule uses the **same hex profile** as the body so the 90° join is flush. 3-tone wood bands + side-wall facet edges. Four-view was generated and carved with `carve_long_prop.py`; the visual hull lumped the cone, so **shipped slices are the procedural volume** (12 of 18×147, `thin_runs` empty). 3/4 reads as a hexagonal prism.

## Mug (recolored occupancy)

`art/clean_mug.py` / `art/revise_v2.py`. Same 60×72×60 hull. Interior filled with cream (v1 had coffee down the shaft and ink cracks in the wall). Coffee is a disk on the top 3 slices with a cream lip. Wall uses a broad 3-tone cream ramp; the handle inherits the wall shade at the attachment. No baked ink. Bands at 0/35/135/225 no longer crawl.

## Butter dish (recolored occupancy)

Gold lid seam is a **2-slice belt** around the full perimeter (v1's 1px gold on z=10 dropped out at 135/225). Dark lid-corner ink clusters recolored to cream shadow. Same 26×54×37 footprint.

## Salt shaker (recolored occupancy)

Same 44×25×25 hull. Cream body, metal cap on the top 12 slices with a **fixed 5-hole pattern** and one broad highlight wedge (no 1px sparkles). Cap is stable near 90°.

## Coin stack (procedural disks)

Rebuilt as 4 clean disks in the same 16×17×16 box. Smooth sides (no lumpy ridges); each coin has a stable top-face and a wide lit-rim highlight that does not crawl between 80–100°.

## Hero Car A (cleaned slices)

Same 36×43×71 occupancy. The white center stripe is kept only on the top 1–2 slices of each column (v1 painted it as a slab, which doubled at 135/225). Conservative 1px spur chamfer on mid-height silhouette. Roof still tapers (plan width 43 at the body, narrower at the cabin) — that is the cabin, not a sheet-scale error.

## Contact / game

`art/handoff/art_set_v1_contact.png` regenerated at 1840×1640, 4×, squash 0.75. New slices were also copied to `public/assets/slices/` (drop-in footprints) so the game can load v2. Before/after sheets: `pencil_before_after.png`, `mug_before_after.png`, `butter_dish_before_after.png`, `salt_shaker_before_after.png`, `coin_stack_before_after.png`, `hero_car_a_before_after.png`.

Usage this pass: **no image_gen**. Codex week ~6.0% used (other sessions), resets Dec 01 05:04 PM EST.


---

# v3 revision — SNES Micro Machines scale (2026-11-25)

## Reference and quality bar

The v3 target is a roughly 24 px toy car on a 32×32 px canvas, with cars, oversized picnic props, and ground tiles at a shared 1× art pixel density. [The v3 quality bar](QUALITY_BAR_v3.md) specifies readable silhouettes and facing, distinct palettes, a top-left key light, a 1 px `#1A1210` outline, binary alpha, zero baked cast shadows, and seamless ground repeats.

The three 1994 SNES *Micro Machines* screenshots in [`art/refs/`](refs/) provide the reference. [`snes_micro_machines_breakfast_bends.png`](refs/snes_micro_machines_breakfast_bends.png) shows the car-to-prop scale and top-left light, [`snes_micro_machines_breakfast_blue.jpg`](refs/snes_micro_machines_breakfast_blue.jpg) shows the outline and 1× silhouette, and [`snes_micro_machines_desk_track.jpg`](refs/snes_micro_machines_desk_track.jpg) shows saturated cars against subdued wood grain.

## Generation and source selection

- **Cars.** The pack reads Stripe from `v3-work/stripe_8dirObj/` and Pickup, F1, and Taxi from `v3-work/cars/`. The four subjects are a red striped coupe, a chunky red pickup, a cobalt open-wheel racer, and a golden taxi. The working files also contain a separate Stripe set in `stripe_flash/` and an intermediate-angle test in `stripe_16test/`. The test preview shows uneven contours across the proposed intermediate angles. The shipped strips use eight directions. The optional 16-direction spec requires smooth 22.5° steps at a consistent body scale. [Stripe angle test](v3-work/stripe_16test_8x.png)
- **Picnic props.** The pack uses the nine revised basket, plate, cup, ketchup, mustard, watermelon, sandwich, napkins, and fork PNGs from `v3-work/props_v2/`. Their earlier counterparts in `v3-work/props/` have more empty canvas around the subject. The bottle-cap input is byte-identical in both directories.
- **Ant.** The 16 saved 20×20 candidates have visible widths of 18–19 px. The packer draws two east-facing 9×6 px silhouettes on 16×16 px canvases using `#1A1210`, `#3B2218`, `#6B3A1F`, and `#8A5A2B`, a palette present in the saved candidates. It exports frame 0 as the still sprite and both frames as a 32×16 walk strip. [Ant walk preview](v3-work/ant_walk_8x.png)
- **Ground tiles.** Codex’s built-in `image_gen` produced three 1254×1254 source textures for red-and-cream tablecloth, grass, and oak. `process_tiles.py` box-downsamples them to 128×128, aligns the wrap edges, and assigns the final four-, four-, and eight-color palettes. It writes `ground_tablecloth.png`, `ground_grass.png`, `ground_wood.png`, and a sheet of 3×3 repeats. [Tile generation report](v3-work/codex-tiles-out.txt) · [Processing script](v3-work/process_tiles.py) · [3×3 check](v3-work/tiles_3x3_check.png)

### PixelLab & Codex usage ledger (v3)

- **PixelLab account & budget:** Tier 2 (Pixel Artisan), cycle allowance 5,000, expires `2026-12-10`. Live `get_balance` before pass: **2,542** remaining (`2,458` used). Budgeted ~600 generations; live `get_balance` after pass: **2,375** remaining (`2,625` used) -> **167 generations spent**.
- **Codex CLI & `image_gen`:** Model `gpt-6.2-sol` on ChatGPT subscription (no `OPENAI_API_KEY` or `ANTHROPIC_API_KEY`, `~/.codex/config.toml` untouched, 4090 untouched). `/home/box/bin/llm-usage --fresh` moved from `6.0%` used before v3 to `8.0%` used (resets Dec 01 05:04 PM EST); Claude CLI was logged out.
- **Cars (46 gens — 40 kept, 6 rejected):**
  - *Rejected:* `create_object_pro_flash` Stripe test (`03f85e84-7cb7-4a75-86dd-9b7c028f4b25`, 32x32, 6 gens) — flat overhead angle and wavy stripe on E/W.
  - *Kept:* `create_8_direction_object` (`size=32` -> 34x34 raw output, `view="high top-down"`, 10 gens each = **40 gens**):
    - `stripe` (`17709092-a3a6-4dab-9ed5-8fb857ceafeb`): red coupe, white center stripe, dark teal windshield, rear spoiler.
    - `pickup` (`2ed973ef-335a-42d1-b593-d44dd94afcb6`, `style_object_id="17709092-a3a6-4dab-9ed5-8fb857ceafeb"`): chunky crimson pickup, wooden bed, silver bumper.
    - `f1` (`c1d134b6-0dcd-42a6-bee2-adadc46c297a`, `style_object_id="17709092-a3a6-4dab-9ed5-8fb857ceafeb"`): cobalt open-wheel F1, yellow helmet, white wings.
    - `taxi` (`eaeff0ca-d880-4ae1-9d55-26592f95af5d`, `style_object_id="17709092-a3a6-4dab-9ed5-8fb857ceafeb"`): yellow cab, white roof sign, B&W checker band.
- **16-direction experiment (2 gens — dropped for quality):**
  - `rotate_image` (`ff1fe2b9-b1b7-4169-ac18-d1e20022d80b`, 1 gen) on 22.5-degree rotated Stripe snapped back toward cardinal E/N and lost high top-down tilt.
  - `create_image_pixflux` (`39ad3567-06a3-42f6-a6ab-8443d4c3a7c1`, 1 gen) on 22.5-degree SSE Stripe was noisy/mushy at 32x32. Stopped at the crisp 8-direction sheets rather than burning ~160 gens on `edit_image_pro_flash`.
- **Picnic props Pass 1 (52 gens — 5 kept, 47 rejected):** 9 `create_image_pro_flash` runs (51 gens) + 1 `create_image_pixen` 16x16 ant (`966f7561...`, 1 gen, mushy). Pro Flash margins left 8 of 9 props 40–50% undersized vs. the 24 px car. Kept only `bottle_cap` (`c19fbbbc...`, 36x36 raw, 5 gens).
- **Picnic props Pass 2 (57 gens — all 9 kept):** `create_image_pro_flash` anchored to Stripe `south-east.png` with larger raw canvases and "filling 80-85% of canvas" prompts: `basket` (`13f9b57c...`, 9 gens), `plate` (`205f0a60...`, 6 gens), `cup` (`b1b0de0a...`, 5 gens), `ketchup` (`2080bd6c...`, 6 gens), `mustard` (`1fbeacc4...`, 6 gens), `watermelon` (`6e2f8e88...`, 6 gens), `sandwich` (`f0c65500...`, 6 gens), `napkins` (`09834caf...`, 6 gens), `fork` (`118d8510...`, 6 gens).
- **Ants (10 gens):** `create_image_pro` (`a5d50ac4-61d9-4c4a-b950-eefe6ca735ca`, 20x20, 64 candidates, 10 gens) gave 18–19 px ants (too large for ~0.25–0.35x car). `pack_v3.py` used their exact `#1A1210` / `#3B2218` / `#6B3A1F` / `#8A5A2B` palette to draw the 9x6 px `picnic_ant.png` and 2-frame `picnic_ant_walk.png`.
- **Reconciliation:** `6 + 40 + 2 + 52 + 57 + 10 = 167` PixelLab generations (`2,542 - 167 = 2,375` remaining). [Tile task](codex-tiles-task.md)

## Packing and verification

Codex’s `pack_v3.py` converts the 34×34 car source frames to binary-alpha 32×32 frames. It removes the transparent one-pixel border where possible and centers border-touching bodies while preserving visible pixels. It packs four 256×32 strips in the locked `E, SE, S, SW, W, NW, N, NE` order. The packer trims props with padding, removes 114 stray warm rim pixels from the plate and adds its 1 px `#1A1210` outline. It also writes the 1168×860 car contact sheet and 1480×4146 scale sheet. [Packing script](v3-work/pack_v3.py) · [Packing report](v3-work/codex-pack-out.txt) · [Car contact sheet](handoff/cars_v3_contact.png) · [Scale sheet](handoff/scale_sheet_v3.png)

- All 54 checked PNGs passed binary-alpha verification. The three 128×128 tiles measured 0.000 wrap MAD on both axes, accounting for the intentional red-to-cream check flip on the tablecloth. The tile report records no visible seams in the 3×3 repeats. Pack checksums confirmed preservation of the pre-existing handoff files. [Packing report](v3-work/codex-pack-out.txt) · [Tile report](v3-work/codex-tiles-out.txt)
- Silhouette readability, palette identity, top-left lighting, outline thickness, and absence of baked cast shadows are visual quality gates. The pack log verifies dimensions, alpha and bounds. The plate, ants, and all 32 car frames contain the specified `#1A1210` ink. The other nine still props contain zero pixels of that exact color, so the pack does not meet the exact-color outline requirement across all props.
- The pack preserves the supplied art scale. Using the longer visible bound divided by 24 px, ketchup and mustard measure 4.12× each against a 2.5× target, plate 6.83× against 5.0×, and basket 9.12× against 7.5–8.0×. Sandwich is 3.96× and watermelon 3.42× against 2.5–3.0×, fork is 4.04× against 2.5–3.0×, cup is 2.71× against 2.0×, and ant is 0.38× against 0.25–0.35×. Napkins measure 2.54× against 3.0× and bottle cap measures 0.88× within its 0.75–1.0× range. [Quality bar](QUALITY_BAR_v3.md) · [Measured handoff sizes](handoff/README_v3.md#picnic-props)

## E/W overhead-angle fix and prop rescales (2026-11-25, later the same day)

Artist review of `cars_v3_contact.png` found that the E and W frames of all four cars were flat side profiles (Stripe/F1 26-29x14, Pickup 29x18, Taxi 27-28x17) while S, N, and the diagonals used a high top-down 3/4 camera. This pass replaces only those eight frames and rescales three oversized picnic props. Pre-existing v1/v2 files and the other six car directions were left untouched.

### PixelLab usage

- Live `get_balance` before: **2,375** remaining. After: **2,335** remaining (of 5,000, Tier 2, resets `2026-12-10`) -> **40 generations spent** (8 Pro Flash jobs x 5 gens, within the ~60 budget). No further generation was spent on props.
- Two candidates per car, then W was made as an exact horizontal mirror of the kept E (no extra generation, lighting on W is therefore mirrored to top-right):
  - **Candidate A (kept for all 4), `create_image_pro_flash` 32x32, style-anchored to that car's SE frame, `no_background=true`:** Stripe `4c708fc1-629f-4fd4-82f7-b346534ec361` / `98e03a2b-864f-5c34-9c59-f082d7eafedf` (seed 11); Pickup `e812b3cd-a003-42ff-90e3-66d224139a60` / `75ce1466-9357-57c5-900a-25c7cdf8d1e1` (seed 12); F1 `4ec02632-4424-4ce2-8d6c-dd9a4878e7e1` / `31da2bb7-579e-5eaf-8eef-cbd89b931525` (seed 13); Taxi `4e028f18-e1bf-4cf7-9296-3d3321e5af39` / `0723c813-39b2-55e7-bd42-6cad4fa81e76` (seed 14).
  - **Candidate B (rejected for all 4), `edit_image_pro_flash` on a 90-degree CW rotated N frame, method=reference to SE, palette correction on:** Stripe `887668cb-3a26-485b-9a9b-833c3d575e8a` / `ec06b997-cd22-54f9-ac87-a103e4ecef49` (seed 21, vis 23x16); Pickup `51925493-8937-41bf-a48c-385fda4c82ec` / `e393261f-2fef-51ec-8a8e-6b7dda3658a6` (seed 22, vis 24x17); F1 `492997da-84c4-4a2d-a527-03ca965cfe4c` / `e403b045-5c21-5726-9cdb-6c20e67e8c20` (seed 23, vis 23x20); Taxi `2655df9f-7419-458f-9c66-54a2bf14d8f3` / `47812353-71a5-567a-acec-b44a203f5914` (seed 24, vis 24x17). These read as flat orthographic top-down plan views (a rotated N), not the slight 3/4 of the other six directions. Working files remain in `art/v3-work/ew_fix/` (`*_A.png`, `*_B.png`, `ew_candidates_8x.png`).

### Shipped E/W sizes (32x32, pivot ~(16, 16), binary alpha, W = exact X-flip of E)

| Car | Old E visible | New E/W visible | Notes |
| --- | --- | --- | --- |
| Stripe | 26x14 side profile | 26x15, bbox center (16, 15.5) | Roof, hood, windshield, and white center stripe visible from above. |
| Pickup | 29x18 side profile | 27x18, E center (15.5, 16), W center (16.5, 16) | Cab roof, hood, and wooden bed visible from above. |
| F1 | 29x14 side profile | 30x16, center (16, 16) | Body, helmet, and both white wings visible from above. Length is 2 px over the 24-28 px target; the F1's SE/NE frames are already 30 px on the long side, so the extra length was kept. |
| Taxi | 27-28x17 side profile | 28x16, center (16, 16) | Roof, white taxi sign, windshield, and checker band visible from above. |

Old E/W frames were moved to `art/handoff/cars_v3/_rejected/`. The four `cars_v3_<name>_8dir.png` strips and `cars_v3_contact.png` were rebuilt. The new E/W outlines are 1 px near-black but not the exact `#1A1210` ink used on the other six directions (candidate palettes were preserved rather than remapped).

### Picnic prop rescales (nearest-neighbor only; no PixelLab regen)

Originals copied to `art/v3-work/ew_fix/props_before/`. `scale_sheet_v3.png` was regenerated.

| Prop | Before (visible / ratio vs 24 px) | After | Method |
| --- | --- | --- | --- |
| `picnic_ketchup.png` | 33x99 / 4.12x | 22x66 on a 26x70 canvas / **2.75x** | NN scale by exactly 2/3, 2 px pad |
| `picnic_mustard.png` | 36x99 / 4.12x | 24x66 on a 28x70 canvas / **2.75x** | NN scale by exactly 2/3, 2 px pad |
| `picnic_plate.png` | 161x164 / 6.83x | 129x131 on a 133x135 canvas / **5.46x** | NN scale by exactly 4/5, 2 px pad |

The 2/3 bottle scales stay crisp (labels still read). The 4/5 plate keeps a clean 1 px outline; the fluted rim is slightly less regular than the 1x original but still reads as a paper plate, so it was not regenerated.
