# Tabletop Racer — Art Quality Bar v3 (SNES Micro Machines Scale)

## Purpose
This quality bar defines what "good" looks like for the v3 scale overhaul of *Tabletop Racer*:
- **True SNES *Micro Machines* scale:** tiny ~24 px toy cars on a 32×32 px canvas, racing across a 10× larger picnic-table map littered with giant everyday picnic objects.
- **8-direction (and optional 16-direction) pre-rendered pixel sprites** for the 4 cars, plus **transparent top-down props** and **seamless ground/tablecloth tiles** at a unified pixel density.

---

## Reference Screenshots (`art/refs/`)
Three authentic SNES *Micro Machines* (1994) screenshots are saved in `art/refs/` as the visual north star:

1. `art/refs/snes_micro_machines_breakfast_bends.png` — *Breakfast Bends* (960×720 scaled from 256×224):
   - A tiny orange buggy (~20–24 px at native SNES res) on a huge blue-and-white checkered tablecloth.
   - Giant food obstacles (waffle, orange, Cheerios) tower over the vehicle; the orange casts a crisp shadow down-right (implying **top-left key light**).
2. `art/refs/snes_micro_machines_breakfast_blue.jpg` — *Breakfast Bends* (256×224 native):
   - Shows the blue buggy's crisp **1 px dark outline**, chunky 2–3 tone shading, and unmistakable silhouette even at native 1× size.
3. `art/refs/snes_micro_machines_desk_track.jpg` — *Desktop Drop-Off* (256×224 native):
   - Tiny red and blue sports cars racing on warm wood grain past a giant blue pencil, chalk stick, and metal pencil sharpener.
   - Demonstrates **high contrast** between saturated toy cars and the lower-contrast warm surface underneath.

---

## 1. Car Quality Bar (32×32 canvas, ~24 px body)

Every car asset must pass **all 7 gates** before shipping to `art/handoff/`:

1. **Micro Machines Scale & Framing:**
   - Canvas is **32×32 px** (transparent PNG per frame).
   - Car body length is **20–26 px** (~24 px target) in cardinal views, centered at `(16, 16)` (pivot = car center).
   - Camera angle is **high top-down (~35–45° / slight 3/4 overhead)** so roofs, hoods, windshields, spoilers/beds, and all four wheels/tires read clearly without looking like a flat top-down blueprint or a side-scroller.
2. **Readable Silhouette at 24 px:**
   - Shrunk/viewed at 1× (32×32), each of the 4 cars must have an **unmistakable silhouette** and clear facing direction (nose vs. tail):
     - **Stripe** (Hero): compact red sports coupe with bold white center racing stripe, dark teal windshield, rear spoiler.
     - **Red Pickup**: chunky wider/boxier pickup truck with distinct cab, dark/wood open cargo bed, and heavy front bumper.
     - **Blue F1 Racer**: sleek open-wheel formula racer with narrow nose cone, exposed front/rear tires, cockpit helmet, and wide rear wing.
     - **Yellow Taxi** (or Green Bug): boxy classic yellow cab with roof taxi sign and dark/checker accent band (high contrast on grass, wood, and red tablecloth).
3. **Distinct Color Identity:**
   - Each car owns a primary saturated hue that never blends into the ground tiles (cherry red `#E23A2B` + white stripe; deeper crimson/brick red `#B82824` + tan/dark bed; cobalt blue `#2868D8` + white/yellow wing; taxi yellow `#F0C53A` + dark cabin/checker).
4. **Consistent Light Direction (Top-Left):**
   - Key light comes from **top-left** (`-1, -1`).
   - Upper-left roof/hood edges and fenders catch warm highlights; bottom-right flanks and under-bumpers hold cool shadows.
   - **No baked ground shadows** in the sprite PNGs (the game renderer draws offset drop shadows beneath cars/props so rotated sprites don't spin their cast shadow).
5. **Clean 1 px Dark Outline (`#1A1210`):**
   - Picked and locked: **1 px dark ink outline (`#1A1210`)** around the outer silhouette of every car and every prop (matching SNES *Micro Machines* and `STYLE.md`).
   - No broken/gapped outer silhouette, no thick 2–3 px muddy double outlines, no bright white halos.
6. **Zero AI Mush:**
   - Crisp pixel clusters (at least 2×2 for stripes, windshields, spoilers, wheels), hard binary alpha (`0` or `255` — no semi-transparent edge fringe), no pillow-shading, no noisy 1 px confetti.
7. **Consistent 8-Direction Rotation:**
   - Output order documented and locked as **`E, SE, S, SW, W, NW, N, NE`** (row of 8 cells, `256×32` px total).
   - Across all 8 angles, the car keeps the **same wheelbase length, body proportions, color values, and top-left lighting** — no shrinking/bloating between cardinal and diagonal views, and no mirror-flip artifacts that invert text/stripes asymmetrically.
   - If 16 directions are produced, the 8 half-step angles must preserve the same body scale and smooth angular progression without wobble.

---

## 2. Picnic Props & Ground Tiles Quality Bar

All picnic props share the **exact same pixel density** as the 24 px car (~4 cm real size = ~24 px -> ~6 px per cm, with mild toy-scale compression on huge containers):

### Scale Targets (car = 1.0× = ~24 px)
| Asset | Target Size (car-lengths) | Canvas / Sprite Footprint | Notes |
| --- | --- | --- | --- |
| Cars (4×) | ~1.0× (~24 px body) | 32×32 px per frame | Anchor scale |
| Ants | ~0.25–0.35× (~6–9 px) | 16×16 px (2-frame walk) | Tiny, crisp 3-segment silhouette |
| Bottle cap | ~0.75–1.0× (~18–24 px) | 24×24 or 32×32 px | Crimped metal edge, bright top |
| Fork | ~2.5–3.0× long (~60–72 px) | 32×80 or 80×32 px | Metallic tines + handle |
| Plastic cup | ~2.0× (~48 px) | 48×48 or 64×64 px | Red party cup / translucent rim |
| Ketchup bottle | ~2.5× (~60 px) | 48×64 or 64×64 px | Classic red squeeze bottle, nozzle |
| Mustard bottle | ~2.5× (~60 px) | 48×64 or 64×64 px | Classic yellow squeeze bottle, nozzle |
| Watermelon slice | ~2.5–3.0× (~60–72 px) | 64×64 or 72×48 px | Bright wedge, green rind, black seeds |
| Sandwich | ~2.5–3.0× (~60–72 px) | 64×64 px | Triangle cut, crust, lettuce/tomato |
| Napkins | ~3.0× (~72 px) | 72×72 or 80×80 px | Folded cloth/paper, slight corner curl |
| Paper plate | ~5.0× (~120 px) | 128×128 px | Fluted rim, clean white/cream center |
| Wicker basket | ~7.5–8.0× (~180–192 px) | 192×144 or 192×128 px | Woven texture, handle/lid, landmark |

### Prop & Tile Gates
1. **Unified Pixel Density:** No mixing 2×-coarse props with 1×-fine props. Every 1× art pixel in a prop equals 1× art pixel on a car.
2. **Same Outline & Top-Left Lighting:** 1 px dark outline `#1A1210` on all props; highlights upper-left, shading lower-right; transparent background (`RGBA`, binary alpha `0`/`255`), zero baked ground shadow.
3. **High Top-Down Perspective:** Props read from the same ~35–45° high top-down camera angle as the cars (so bottles, cups, and the basket show both top rim/lid and upper side wall).
4. **Seamless Ground Tiles (`ground_*.png`):**
   - Checkered red-and-white tablecloth tile (`ground_tablecloth.png`), grass ground tile (`ground_grass.png`), and wood plank tile (`ground_wood.png`).
   - Must tile cleanly with **zero visible edge seams** when repeated 3×3.
   - Controlled contrast: background texture must never overpower the 24 px cars or tiny 8 px ants.
