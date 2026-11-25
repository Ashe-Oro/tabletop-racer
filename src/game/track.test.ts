import { describe, expect, it } from 'vitest'
import { overlaps } from './collision'
import type { Point } from './geometry'
import { Race } from './race'
import { TRACK_CONFIG, TRACK_HALF_WIDTH, buildTrack, gates, route, spawn } from './track'

const footprints = {
  mug: { sliceWidth: 44, sliceHeight: 69 },
  cereal_box: { sliceWidth: 31, sliceHeight: 48 },
  coin: { sliceWidth: 22, sliceHeight: 22 },
  pencil: { sliceWidth: 12, sliceHeight: 83 },
  ruler: { sliceWidth: 20, sliceHeight: 100 },
}

describe('track obstacles', () => {
  it('keeps the entire lane clear by default and with an explicit off setting', () => {
    expect(TRACK_CONFIG.OBSTACLES).toBe(false)
    const track = buildTrack(footprints)
    expect(buildTrack(footprints, { OBSTACLES: false })).toEqual(track)
    expect(new Set(track.props.map(prop => prop.asset))).toEqual(new Set(['coin', 'pencil', 'ruler']))
    expect(track.solids).toEqual(track.props.map(prop => prop.solid))

    for (const [i, point] of route.entries()) {
      const next = route[(i + 1) % route.length]
      for (const t of [0, 0.25, 0.5, 0.75]) {
        const lane = {
          x: point.x + (next.x - point.x) * t,
          y: point.y + (next.y - point.y) * t,
          radius: TRACK_HALF_WIDTH,
        }
        expect(track.solids.some(solid => overlaps(lane, solid, 0))).toBe(false)
      }
    }
  })

  it('restores the mug, its handle colliders, and the cereal box with an override', () => {
    const { props, solids } = buildTrack(footprints, { OBSTACLES: true })
    const mug = props.find(prop => prop.asset === 'mug')
    const box = props.find(prop => prop.asset === 'cereal_box')
    expect(mug).toMatchObject({ x: 1145, y: 348, solid: { radius: 22 } })
    expect(box).toMatchObject({ x: 728, y: 280, solid: { halfWidth: 15.5, halfLength: 24 } })
    expect(solids).toContain(mug?.solid)
    expect(solids).toContain(box?.solid)

    const propSolids = new Set(props.map(prop => prop.solid))
    const handle = solids.filter(solid => !propSolids.has(solid))
    expect(handle).toHaveLength(3)
    for (const solid of handle) {
      expect(solid).toMatchObject({ radius: 4.4 })
    }
    expect(TRACK_CONFIG.OBSTACLES).toBe(false)
  })

  it('preserves the checkpoint positions and spawn and completes three laps along the route', () => {
    expect(gates.map(({ x, y, halfWidth }) => [x, y, halfWidth])).toEqual([
      [701, 752, 86], [1190, 656, 86], [1211, 438, 86], [921, 201, 86], [656, 318, 86],
      [526, 201, 86], [186, 349, 86], [177, 566, 86], [278, 718, 86],
    ])
    const start = gates[0]
    expect(spawn).toEqual({
      x: start.x + 22 * start.forward.x,
      y: start.y + 22 * start.forward.y,
      heading: Math.atan2(start.forward.y, start.forward.x),
    })

    const race = new Race(gates, null)
    let previous: Point = spawn
    for (let lap = 0; lap < 3; lap++) {
      for (const point of [...route.slice(lap === 0 ? 4 : 1), route[0]]) {
        race.step(previous, point, 16)
        previous = point
      }
      expect(race.lapTimesMs).toHaveLength(lap + 1)
      expect(race.finished).toBe(lap === 2)
    }
  })
})
