# Tabletop Racer v3

Play the current build at [tabletop-racer.vercel.app](https://tabletop-racer.vercel.app/).
Pushes to `main` on [Ashe-Oro/tabletop-racer](https://github.com/Ashe-Oro/tabletop-racer)
deploy there automatically.

Drive a 24-pixel toy car around a picnic table in a three-lap time trial. Open
[the offline release](releases/tabletop-racer.html) directly in a desktop
browser. The game and artwork are embedded in that file.

## Play

| Input | Action |
| --- | --- |
| Arrow keys or WASD | Accelerate, reverse, and steer |
| Space or Shift | Handbrake and drift |
| 1–4, C, or the car buttons | Select Stripe, Pickup, F1, or Taxi |
| E or Enter | Use your item (Race mode) |
| R or Restart | Start a new race with the selected car |
| Overview | Toggle the full-table camera. Add `?overview=1` to open in this view. |

Follow the chevrons and crumb trails, or use the minimap to find the next
checkpoint. Pass all nine intermediate gates in order and cross the
checkered finish line to record a lap. You can roam across the whole
4,400 × 3,000 art-pixel table. Picnic props can be hit. The default racing
line stays clear, and setting `TRACK_CONFIG.OBSTACLES` in
[`src/game/track.ts`](src/game/track.ts) adds six in-lane obstacles.

## Items

In Race mode, item pickups sit on the track in rows of three. Each pickup
shows the actual item, so you can steer toward the one you want. You hold
one item at a time. Press E or Enter to use it.

| Item | Type | Effect |
| --- | --- | --- |
| Nitro | Boost | A short burst above top speed |
| Bullet | Fires ahead | Long-range single shot that spins out the first car it hits |
| Shotgun | Fires ahead | Short-range three-shot spread |
| Oil Slick | Drops behind | A puddle that spins out cars for 14 seconds |
| Bomb | Drops behind | Explodes on contact or after a short fuse and throws nearby cars |

Rivals use items too. Time Trial has no items, and `?items=0` turns them
off in Race mode. Tuning values are at the top of
[`src/game/items.ts`](src/game/items.ts).

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

Run `npm run slice:artist` to install the Artist pack. Stripe, Pickup, F1,
and Taxi use eight-direction sheets. Picnic props use native-scale flat
sprites, including napkins, sandwiches, mustard bottles, bottle caps, and
two-frame walking ants. Tablecloth, grass, and wood use 128 × 128 tiles.
The asset tools require Python 3, Pillow, and NumPy. See the
[Artist import guide](art/handoff/README.md) and the
[v3 art handoff](art/handoff/README_v3.md).

## Media

- [Picnic gameplay close-up](media/11-v3-art-ingame.png)
- [Four car selections](media/12-v3-car-select.png)
- [Driving and drifting clip](media/gameplay-v3.mp4)

## License

This project is released under the MIT License. The sprite-stacking tools in
`tools/sprite-stacking/` are MIT-licensed work by Daniel White; that
copyright and permission notice is preserved in `tools/sprite-stacking/LICENSE`.
