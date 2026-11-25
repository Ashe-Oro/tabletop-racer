import { describe, expect, it } from 'vitest'
import footprints from '../../public/assets/manifest.json'
import { overlaps } from './collision'
import type { Point } from './geometry'
import { Race } from './race'
import { TRACK_CONFIG, TRACK_HALF_WIDTH, buildTrack, gates, route, spawn } from './track'

describe('track obstacles', () => {
  it('keeps the entire lane clear by default and with an explicit off setting', () => {
    expect(TRACK_CONFIG.OBSTACLES).toBe(false)
    const track = buildTrack(footprints)
    expect(buildTrack(footprints, { OBSTACLES: false })).toEqual(track)
    expect(new Set(track.props.map(prop => prop.asset))).toEqual(new Set(['coin', 'pencil', 'ruler']))
    expect(track.solids).toEqual(track.props.map(prop => prop.solid))

    track.solids.forEach((solid, i) => {
      expect(track.solids.slice(i + 1).some(other => overlaps(solid, other, 4))).toBe(false)
    })

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

  it('restores the mug and cereal box at their original positions and adds four off-lane obstacles', () => {
    const { props, solids } = buildTrack(footprints, { OBSTACLES: true })
    const mug = props.find(prop => prop.asset === 'mug')
    const box = props.find(prop => prop.asset === 'cereal_box')
    expect(mug).toMatchObject({ x: 1145, y: 348, solid: { radius: 30 } })
    expect(box).toMatchObject({ x: 728, y: 280, solid: { halfWidth: 33.5, halfLength: 12.5 } })
    expect(solids).toContain(mug?.solid)
    expect(solids).toContain(box?.solid)

    const propSolids = new Set(props.map(prop => prop.solid))
    const handle = solids.filter(solid => !propSolids.has(solid))
    expect(handle).toEqual([expect.objectContaining({ angle: 3.93, halfWidth: 7, halfLength: 9.6 })])
    const handleTip = { x: 1145 - 35 * Math.cos(3.93), y: 348 - 35 * Math.sin(3.93), radius: 1 }
    expect(overlaps(handleTip, handle[0], 0)).toBe(true)
    expect(overlaps(handleTip, mug!.solid, 0)).toBe(false)

    for (const id of ['eraser', 'salt_shaker', 'butter_dish', 'crumb_pile'] as const) {
      const prop = props.find(item => item.asset === id)!
      const { sliceWidth, sliceHeight } = footprints[id]
      expect(prop.solid).toMatchObject(id === 'salt_shaker'
        ? { radius: 12.5 } : { halfWidth: sliceWidth / 2, halfLength: sliceHeight / 2 })
      expect(solids).toContain(prop.solid)
      expect(route.some(point => overlaps({ ...point, radius: TRACK_HALF_WIDTH }, prop.solid, 0))).toBe(false)
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
