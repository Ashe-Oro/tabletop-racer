# Tabletop Racer v3 art handoff

## Scale and style

The v3 pack uses true SNES *Micro Machines* scale. A roughly 4 cm toy car has a target visible body length of roughly 24 px, or about 6 px/cm. Cars, picnic props, and ground tiles share the same 1× art pixel density. The sprite style calls for a 1 px dark ink outline (`#1A1210`), a top-left key light (`-1, -1`), zero baked cast shadows, and binary alpha (`[0, 255]`).

## Cars

| Name | Design | Horizontal strip |
| --- | --- | --- |
| `stripe` | Hero red coupe with a white racing stripe | `cars_v3_stripe_8dir.png` |
| `pickup` | Chunky red pickup | `cars_v3_pickup_8dir.png` |
| `f1` | Cobalt blue open-wheel F1 racer | `cars_v3_f1_8dir.png` |
| `taxi` | Golden yellow cab | `cars_v3_taxi_8dir.png` |

Each frame uses a 32×32 px canvas with the car pivot at `(16, 16)`. Each `cars_v3_<name>_8dir.png` strip is 256×32 px. The locked left-to-right order runs clockwise from east (+X): `E, SE, S, SW, W, NW, N, NE`. The Artist delivery also includes individual frames under `cars_v3/<name>/`.

The handoff contains eight directions per car. The optional 16-direction quality bar requires the 22.5° intermediate steps to preserve body scale and produce smooth angular progression. The Stripe intermediate-angle test preview shows uneven contours at the proposed half-steps. A later pass replaced the original E and W side profiles with high top-down 3/4 views so the roof and hood read from above. Visible E/W sizes are Stripe 26x15, Pickup 27x18, F1 30x16, and Taxi 28x16. Each W frame is an exact horizontal mirror of that car's E frame (so key light is mirrored to the top-right on W). The rejected side-profile frames are in `cars_v3/_rejected/`.

The importer maps `stripe`, `pickup`, `f1` and `taxi` to `car_1` through `car_4`. Run `npm run slice:artist` to install the pack. To refresh the four direction sheets, run `npm run slice -- art/handoff/cars_v3_stripe_8dir.png`, optionally followed by the matching `car_1` slot. See the [artist import guide](README.md).

## Picnic props

The `art/handoff/picnic_<item>.png` files are transparent top-down sprites at 1× art pixel density. Each frame shows a single view. The importer copies their original pixels and dimensions.

Visible bounds are `(left, top, right, bottom)` in pixels, with right and bottom exclusive. The size ratio is the longer visible dimension divided by the 24 px car anchor. For the walk strip the bounds cover the whole strip and the ratio applies to each frame.

| File | PNG size (px) | Visible bounds | Car-length ratio | Notes |
| --- | --- | --- | ---: | --- |
| `picnic_basket.png` | 223×209 | `(2, 2, 221, 207)` | 9.12× | Wicker picnic basket. |
| `picnic_plate.png` | 133×135 | `(2, 2, 131, 133)` | 5.46× | Nearest-neighbor 4/5 scale of the 161×164 original (archived in `../v3-work/ew_fix/props_before/`). Removed 114 stray rim pixels and added a 1 px `#1A1210` outline before scaling. |
| `picnic_sandwich.png` | 83×99 | `(2, 2, 81, 97)` | 3.96× | Sandwich sprite. |
| `picnic_watermelon.png` | 77×86 | `(2, 2, 75, 84)` | 3.42× | Watermelon slice. |
| `picnic_ketchup.png` | 26×70 | `(2, 2, 24, 68)` | 2.75× | Nearest-neighbor 2/3 scale of the 33×99 original (archived in `../v3-work/ew_fix/props_before/`). |
| `picnic_mustard.png` | 28×70 | `(2, 2, 26, 68)` | 2.75× | Nearest-neighbor 2/3 scale of the 36×99 original (archived in `../v3-work/ew_fix/props_before/`). |
| `picnic_fork.png` | 20×101 | `(2, 2, 18, 99)` | 4.04× | Fork sprite. |
| `picnic_napkins.png` | 65×60 | `(2, 2, 63, 58)` | 2.54× | Napkin sprite. |
| `picnic_cup.png` | 46×69 | `(2, 2, 44, 67)` | 2.71× | Picnic cup. |
| `picnic_bottle_cap.png` | 25×24 | `(2, 3, 23, 21)` | 0.88× | Canvas padded to at least 24 px on each axis. |
| `picnic_ant.png` | 16×16 | `(3, 5, 12, 11)` | 0.38× | First walk frame, facing east, with a 9×6 px visible footprint. |
| `picnic_ant_walk.png` | 32×16 | `(3, 5, 28, 11)` | 0.38× per frame at 1× | Two side-by-side 16×16 px frames with alternating legs and shifting antennae. |

The pack uses the `napkins` item ID and adds `mustard`, `sandwich` and `bottle_cap`.

## Ground tiles

| File | PNG size (px) | Pattern and palette | Wrap MAD (L–R / T–B) |
| --- | --- | --- | --- |
| `ground_tablecloth.png` | 128×128 | 2×2 red and cream checks, 64 px per check, four colors | 0.000 / 0.000 |
| `ground_grass.png` | 128×128 | Four greens | 0.000 / 0.000 |
| `ground_wood.png` | 128×128 | Eight oak tones | 0.000 / 0.000 |

All three seamless tiles were inspected in 3×3 repeats. The tablecloth wrap metric compares the weave across the intentional red-to-cream edge flip. The installed tile keys are `tablecloth`, `grass` and `wood`.

## Previews

- The delivery includes `cars_v3_contact.png` (1168×860 px), which shows all four cars in all eight directions at 4× and native 1× scale.
- The delivery includes `scale_sheet_v3.png` (1480×4146 px), which shows cars and picnic props at native scale on the three ground tiles and compares Stripe with each prop at 4×.

The v3 pack’s checksum check confirmed that pre-existing handoff files, including the v1 and v2 assets, were preserved.
