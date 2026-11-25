# Artist v1 stack QA

Reviewed 100 Chromium renders from the game's stack renderer at 0°, 35°, 90°,
135°, and 225°, at 2× race zoom and 4×, with squash 0.75 and slice spacing 1.
Compared the renders with the check sheets in `art/checks/` and spot-checked
adjacent 5° rotation frames at 2×. The body and shadow stayed within their
render buffers through the 5° sweep. Frames and contact sheets are in
`/tmp/stack-qa/`.

| Asset | Slices | Slice W × L (px) | Strip (px) | Race-zoom observations |
| --- | ---: | ---: | ---: | --- |
| Hero Car A | 36 | 43 × 71 | 1548 × 71 | Nose points down at 0° and the headlights, tires, and spoiler read clearly. Single-pixel window and roof highlights shift on turns. The silhouette stays intact. |
| Mug | 60 | 72 × 60 | 4320 × 60 | Coffee stays inside the rim and the solid handle survives every view. Dark vertical lines on the cream wall are conspicuous at 0°, 35°, 135°, and 225°, and shift as it turns. For a future revision, simplify the dark pixels along the curved side and handle junction. |
| Cereal box | 88 | 67 × 25 | 5896 × 25 | Clean. The gold panel faces down at 0°, the narrow side reads at 90°, and the top seam and corners stay continuous. |
| Pencil | 12 | 18 × 147 | 216 × 147 | Tip points down at 0°. Graphite, ferrule, and eraser read clearly, with expected tip occlusion in the rear three-quarter views. At 90° the ferrule joins the body at a visible step between the top and side faces. |
| Coin stack | 16 | 16 × 17 | 256 × 17 | Reads as a stack at 2×. Single-pixel rim highlights change across 80°–100° and the exposed ridges make the sides slightly lumpy. The full stack stays intact. |
| Ruler | 8 | 23 × 169 | 184 × 169 | Clean. The long edge and tick marks stay legible at the diagonal angles and the short ends stay square. |
| Eraser | 12 | 19 × 34 | 228 × 34 | Clean. The cream paper band wraps continuously and the rounded ends are stable. |
| Salt shaker | 44 | 25 × 25 | 1100 × 25 | Stable cylinder with a readable cap. A few cap dots and highlights merge or separate as it turns near 90°, which gives the cap a slight shimmer at 2×. |
| Butter dish | 26 | 54 × 37 | 1404 × 37 | The body and lid read clearly. The thin gold seam is strongest on the front at 0° and breaks into small steps or drops out on the far side at 135° and 225°. Dark lid-corner clusters remain visible at 2×. |
| Crumb pile | 12 | 38 × 35 | 456 × 35 | The main mass stays intact. At 2× it reads as a single craggy mound with tiny edge crumbs merging into the outline. Some edge pixels shift around 90°. |

All nine prop footprints and heights match their handoff sidecars. The
production build loaded the tile and all ten stacks, accepted driving input,
and reset with R. A forced tile-load failure reached the race with fallback
planks. The obstacle-enabled scene showed cast shadows on the mug, cereal box,
and salt shaker. Unit tests covered the clear default lane, outline spacing,
optional colliders, checkpoints, and three laps.
