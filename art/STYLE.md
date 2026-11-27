# Tabletop Racer — Art Style Lock

A SNES *Micro Machines*-style tabletop racer: tiny toy cars drifting around a kitchen table past a mug, cereal box, pencils, coins and rulers. Every car and prop is a fake-3D sprite stack carved from a four-view sheet (Daniel White's sprite-stacking skill). This document locks the look before any hero sheet is approved.

The working title of the game is Tabletop Racer. Do not mix this with other shelved projects.

## Look in one line

Hand-painted toy miniatures: crisp hi-bit pixel art, fat readable color blocks, three-tone hue-shifted shading, and a single ink outline around the finished stack.

## Tier: detailed hi-bit

- **Slices:** slice count **is the object's art-pixel height**. The car is locked at **36**. Mid-size props often land in the 24–40 band. Short props (coins, eraser, ruler thickness, crumbs) use fewer slices so they stay lower than the car. Tall landmarks (mug, cereal box, salt shaker) may go above 40 so they actually tower over the car — do not force them to 36.
- **Native hull:** design in art pixels at the game scale in the Prop scale table below. Source sheets may be larger "fat pixel" drawings; the slicer downsamples to the target height.
- **Display scale:** integer 4–6× in-game (nearest-neighbor).
- **Carving:** `views_to_slices.py --slices <height> --shade 0.12 --colours 32 --order reading --top-nose down`. Add `--round` only for bodies of rotation (mug, coin stack, salt shaker) — never for cars, pencils, rulers, boxes, the butter dish or the crumb pile.
- This is not the chunky-retro 15–20 slice tier. Game placeholders may be coarser; Artist sheets replace them at this density.

## Palette

Use these hex values. Midtones carry the identity; shadows shift cool, highlights shift warm. No gradients, no new hues for a one-off highlight — pick the nearest swatch.

### Ink, paper, and neutrals

| Role | Hex | Notes |
| --- | --- | --- |
| Outline ink | `#1A1210` | 1 px sheet outline and the runtime stack outline |
| Soft black / tire | `#1C1C20` | Rubber, deep cabin, tire sidewall |
| Tire highlight | `#3A3A44` | A 1–2 px rim of form light on the tire, not a gray fill |
| Chrome mid | `#8A9098` | Hubs, bezels, ferrules |
| Chrome shadow | `#4A5058` | |
| Chrome highlight | `#E8ECF0` | 1–2 crisp pixels only |
| White / stripe mid | `#F4F0E6` | Racing stripe, tape, porcelain |
| White shadow | `#C9C2B4` | |
| Sheet background | `#FFFFFF` | Flat white only. Pale gray `#E8E6E1` is allowed if white fringing is a problem; never textured |

### Hero body (Car A, "Stripe")

| Role | Hex | Notes |
| --- | --- | --- |
| Body mid | `#E23A2B` | The readable color block at small size |
| Body shadow | `#8E1E32` | Cool, slightly purple-red. Wheel wells, lower flanks, under bumpers |
| Body highlight | `#FF6A4A` | Warm top highlight on hood, roof and upper lip |
| Stripe mid | `#F4F0E6` | 3–4 px center stripe, hood-to-spoiler |
| Stripe shadow | `#C9C2B4` | |

### Glass, lights, and rims

| Role | Hex | Notes |
| --- | --- | --- |
| Glass mid | `#1C3D4A` | Dark teal cabin / windshield |
| Glass shadow | `#101820` | |
| Glass specular | `#A8E4F0` | A few crisp pixels on the windshield only |
| Headlight mid | `#F5D76A` | |
| Headlight highlight | `#FFF4C2` | |
| Taillight mid | `#B01A1A` | |
| Taillight glow | `#FF3B3B` | Small, not a bloom |
| Hub / rim accent | `#F0C53A` | Yellow toy hubs so wheels read at size |

### Table and kitchen props (locked now so later sheets match)

| Role | Hex | Notes |
| --- | --- | --- |
| Wood mid | `#C99554` | Table planks, pencil body, ruler body |
| Wood shadow | `#8A5A2B` | Grain streaks, plank seams, table edge |
| Wood highlight | `#E8C48A` | |
| Pencil eraser | `#E890A0` | |
| Graphite / tick marks | `#2A2A2E` | Pencil tip, ruler ticks |
| Coin gold mid | `#D4A017` | |
| Coin gold shadow | `#8A6410` | |
| Coin gold highlight | `#F0D060` | |
| Mug ceramic | `#F4F0E6` | Same family as stripe white |
| Coffee | `#3B2218` | |
| Cereal box teal | `#2A8F8A` | One bold panel color |
| Cereal box gold | `#F0C53A` | Same as hubs, for box typography blocks (no real text) |
| Floor dropoff | `#2B1C14` | Beyond the table edge, not used on sheets |
| Cookie / toast crust | `#6B3A1F` | Crumb pile darks, toast crust |
| Butter | `#F5D76A` | Butter dish contents (same family as headlights) |
| Eraser body | `#E890A0` | Pink school eraser, pencil cap |
| HUD cream | `#F4F0E6` | Digit fill, countdown |
| HUD ink | `#1A1210` | Chunky font outline |
| HUD accent red | `#E23A2B` | GO, position 1, warnings |
| HUD accent teal | `#2A8F8A` | Lap, secondary labels |

If a later car needs a second livery, keep the same shadow/highlight logic and pick one saturated mid that still reads against the wood table (avoid brown-on-brown).

## Light direction

This is **form lighting**, baked into the sheet, not a world-space sun. Highlights stay on the toy's own ridges as it turns, which is the Micro Machines / painted-miniature read.

- Key light is from **above and slightly in front** of the object.
- Warm highlights land on roofs, hoods, upper lips and the top of rims.
- Cool-shifted shadows fill undersides, wheel wells, and the lower third of flanks.
- On the FRONT view, the upper surfaces are lighter than the bumper. On the SIDE view (nose left), the roofline and hood catch the warm band; the rocker and under-spoiler stay cool.
- Specular pixels only on glass and chrome, 1–2 px, never a soft bloom.
- **No cast ground shadows** on the four-view sheet. The renderer draws a stack footprint shadow at runtime (offset +2, +3 art px, before slice 0).
- Do not relight each view as if a studio softbox sat at the upper-left of the frame. Keep the same material ramps so carved slices do not stripe when they turn.

## Outline rule

- **On the sheet:** a bold **1 px** outline in `#1A1210` around each of the four views. The slicer strips this outline before carving (`--dark-thresh` default). Do not hide silhouette edges in midtones; the outline must be a continuous hard loop.
- **At runtime:** outline the **finished stack once** around the composite 1× alpha, then scale up. Never outline per slice — that draws seams and speckle through the body.
- Internal drawing is panel shading and 2–3 px stripes, not a second outline. Isolated 1 px interior lines smear once slices rotate; redraw them as 2 px clusters or drop them.
- Every structural part is **at least 2 px wide** (3–4 px preferred for spoilers, handles, mirrors, pencil tips). 1 px posts, antennas, wing stalks and mug-handle inner gaps blink in and out as the stack turns.

## Sheet recipe

One PNG, **1×4 row** in this exact order: **TOP, SIDE, FRONT, BACK**, on flat white, with generous empty space (at least 40 px at the upscaled sheet, or a clearly empty gutter at native size) between views.

1. **TOP** — straight down, front pointing **down** (+y). Wheels are real ellipses/circles in plan, not boxes. The stripe runs down the center, nose at the bottom of the view.
2. **SIDE** — front pointing **LEFT**. This is the car's right flank. Four wheel contact patches sit on the same ground line.
3. **FRONT**
4. **BACK**

Strictly orthographic: zero perspective, zero tilt, zero 3/4 angle. Identical scale across all four views so length, width and height match pixel for pixel:

- TOP length = SIDE length
- TOP width = FRONT width = BACK width
- SIDE height = FRONT height = BACK height

Center each object in its view. The stack spins about the middle of its bounding box.

## Quality bar — car sheets

A car sheet ships only if all of these pass. If a generated sheet fails, regenerate (do not blur, sharpen or liquify a salvage). Up to two regenerations after the first attempt.

1. **Same scale across views.** Measured pixel length/width/height match as above, within 1–2 px. A long TOP and a short SIDE will carve a crushed hull.
2. **Clean silhouette.** Hard edges, solid flat color clusters, no anti-aliasing, no airbrushed halos, no JPEG ringing, no ground shadow, no grid, no captions, no watermark. White background is actually flat.
3. **No thin parts that carve badly.** No antennas. No floating wings on stalks. Spoilers are a short, thick wedge **attached** to the trunk, at least 3 px thick in SIDE and BACK. Mirrors, if present, are 3 px blocks faired into the body, or they are omitted. Exhaust is a block in the bumper, not a pipe. Gaps (wheel wells, spoiler cutouts) must open to the outside of the view or they fill solid.
4. **Readable color block at small size.** Shrink the TOP and SIDE to ~24–32 px on the long side. You should still name the car (red body, white stripe, dark cabin) and tell which way it faces. If the livery turns to noise, simplify.
5. **Orientation and completeness.** Four views, correct noses, four distinct tires with contact patches, headlights on FRONT, taillights on BACK, cabin visible in all views that should show it. Wheels in TOP are round.

## Hero Car A — "Stripe"

The first locked vehicle: a compact toy sports coupe. Cherry-red body, a bold white center racing stripe from hood to spoiler, dark teal glass cabin, four chunky tires with yellow hubs, yellow headlights, red taillights, and a short thick attached rear spoiler. No antenna, no skinny mirrors, no raised wing on posts. **Approved by Ashe as v1** on 25 November 2026. Native carved footprint: **43×71 px** top-down, **36 slices** tall. All props are authored relative to this hull.

## Prop scale (relative to Hero Car A)

The car's carved top-down footprint is **43×71 px**, height **36 slices**. Props use a compressed toy scale so a lap around a mug and a cereal box still fits on a kitchen table. Real-world scale would make a cereal box a skyscraper; do not use it.

Target footprints after carving (width × length in plan, then height in slices). Length is the TOP vertical / SIDE horizontal axis (front points down / left).

| Prop | Plan W×L (px) | Slices (H) | `--round` | Notes |
| --- | --- | --- | --- | --- |
| mug | 64×64 | 60 | yes | Cylinder plus a **solid** handle ear (no finger hole). Landmark. |
| cereal_box | 50×36 | 88 | no | Tall box, front is the labeled face. Color blocks only, no readable text. |
| pencil | 12×160 | 12 | no | **Stack, not a floor decal.** At car scale a pencil is a log-like barrier. Chunky diameter so it holds 12 slices; tip and ferrule at least 3 art px. Front = graphite tip. |
| coin_stack | 22×22 | 16 | yes | Five or six coins in a slightly irregular stack. Visible rims in SIDE. |
| ruler | 16×180 | 8 | no | **Stack, not a floor decal.** A low curb / track wall. Slightly thicker than a real ruler so 8 slices survive; ticks are 2 px clusters, not 1 px hairlines. Front = one short end. |
| eraser | 28×16 | 12 | no | Pink rectangular school eraser, optional cream paper band. |
| salt_shaker | 24×24 | 44 | yes | Glass or ceramic cylinder, metal cap. Cap holes painted as dots, not punched through. |
| butter_dish | 48×36 | 26 | no | Ceramic dish with a thick lid. No thin lid knob (omit it, or a squat 4 px bump). |
| crumb_pile | 36×32 | 12 | no | Low pile of cookie crumbs and one broken chunk. Irregular plan in TOP. No 1 px crumbs. |

### Pencil and ruler: stacks, not decals

Both are sprite stacks. A flat floor decal would be easier to author and would never blink, but at this scale they are 3D barriers the car drives *past* — a pencil is a log, a ruler is a curb — and the track uses them as walls with height, shadows and Y-sort. To make that carve, they are deliberately chunky (pencil diameter 12 px, ruler thickness 8 px), not paper-thin. If a later pass needs painted table markings (tape, stains), those can be decals; these two objects are not.

## Quality bar — prop sheets

Same five gates as car sheets, plus:

6. **Footprint near the table above.** After carving, plan size should land within ~15% of the target W×L, and slice count must be the target height. A mug that comes out the same height as the car has failed.
7. **Handles, holes and long sticks.** Mug handle is a solid attached ear or D, at least 4 art px thick, with **no finger hole** (enclosed holes fill solid anyway). Pencil tips, ferrules and ruler edges stay ≥ 3 art px. Salt-shaker cap holes are painted dots. Crumb piles use chunky bits, not speckles.
8. **`--round` only for revolved bodies.** Mug, coin stack, salt shaker. Never on the box, pencil, ruler, eraser, butter dish or crumbs (it will lathe them into sausages).
9. **`--top-nose down`** on every prop. Auto nose-detection is for vehicles.

Regenerate a failed sheet (do not salvage with blur or stretch) up to two times.

## Table surface

A seamless, tileable warm kitchen-wood texture, **low contrast** so the red car and teal box pop. Stay in the wood mid/shadow/highlight family, but pull the three values closer together than a dramatic plank render. Readable grain and occasional plank seams at the racer's zoom (about 4–6×). No plates, crumbs, text, logos, or strong knot holes that could be mistaken for track markings. Tile size around 128–256 art px.

## HUD

Chunky SNES-era numerals and labels from the palette (HUD cream, ink, accent red, accent teal, gold). No soft shadows, no gradients, no modern UI chrome. Needed pieces: lap counter, position, timer, and a countdown **3 / 2 / 1 / GO**. Author as a style sheet of elements on a flat or transparent ground, then document placement in `HUD.md`.

## Shipped v1 footprints (carved)

Ashe approved Hero Car A as v1 on 25 November 2026. Props below are the carved hulls shipped in `art/handoff/`. Slice count is the art-pixel height.

| Asset | Plan W×L (px) | Slices | `--round` | Notes |
| --- | --- | --- | --- | --- |
| hero_car_a | 43×71 | 36 | no | Approved v1. |
| mug | 72×60 | 60 | yes | Solid handle ear, no finger hole. Coffee on TOP only. |
| cereal_box | 67×25 | 88 | no | Thinner than the first target; carves cleanly. |
| pencil | 18×147 | 12 | no | Stack, not a decal. Long barrier, ~2 car lengths. |
| coin_stack | 16×17 | 16 | yes | Slightly smaller than the first target. |
| ruler | 23×169 | 8 | no | Stack, not a decal. Long curb. |
| eraser | 19×34 | 12 | no | Long axis is front-to-back. |
| salt_shaker | 25×25 | 44 | yes | |
| butter_dish | 54×37 | 26 | no | Smooth lid, no knob. |
| crumb_pile | 38×35 | 12 | no | Isolated crumbs merge into a low mound. |

For the pencil and the ruler, the skill slicer's `find_views` drops the small FRONT/BACK ends (under 14% of the largest view area). Recarve with `art/carve_long_prop.py`, or use the shipped slice strips.
