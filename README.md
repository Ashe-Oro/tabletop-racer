# Tabletop Racer v2

Drive a 24-pixel toy car around a picnic table in a three-lap time trial. Open
[the offline release](releases/tabletop-racer.html) directly in a desktop
browser. The game and artwork are embedded in that file.

## Play

| Input | Action |
| --- | --- |
| Arrow keys or WASD | Accelerate, reverse, and steer |
| Space or Shift | Handbrake and drift |
| 1–4, C, or the car buttons | Select Hero Red, Cobalt GT, Sunburst, or Emerald |
| R or Restart | Start a new race with the selected car |
| Overview | Toggle the full-table camera. Add `?overview=1` to open in this view. |

Follow the chevrons and crumb trails, or use the minimap to find the next
checkpoint. Pass all nine intermediate gates in order and cross the
checkered finish line to record a lap. You can roam across the whole
4,400 × 3,000 art-pixel table. Picnic props can be hit. The default racing
line stays clear, and setting `TRACK_CONFIG.OBSTACLES` in
[`src/game/track.ts`](src/game/track.ts) adds six in-lane obstacles.

The centerline is 8,465.48 art px long. The follow camera uses 2× zoom
when the game canvas is at least 670 × 420 CSS px, and 1× on smaller
canvases. At 2×, the nominal 24 art-pixel car length appears as 48 CSS px.

## Development

```sh
npm ci
npm test
npm run dev
npm run build
npm run build:single
```

Serve `dist/` as a static site, or open `dist-single/tabletop-racer.html`
directly. The versioned release is a copy of the single-file build.

See the [Artist handoff](art/handoff/README.md) for importing four-view
picnic props, 8-, 16-, or 32-direction cars, and tileable ground textures.
The four selectable cars currently use palette variants of the Hero
Car A stack. The asset tools require Python 3, Pillow, and NumPy.

## Media

- [Gameplay screenshot](media/09-tiny-car.png)
- [Picnic table overview](media/10-picnic-map-overview.png)
- [Driving and drifting clip](media/gameplay-v2.mp4)
