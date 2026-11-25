import { describe, expect, it } from 'vitest'
import footprints from '../../public/assets/manifest.json'
import { overlaps } from './collision'
import type { Point } from './geometry'
import { Race } from './race'
import {
  ROUTE_LENGTH, TABLE_HEIGHT, TABLE_WIDTH, TRACK_CONFIG, TRACK_HALF_WIDTH,
  buildTrack, gates, propIds, route, spawn,
} from './track'

describe('picnic circuit', () => {
  it('lays out the table, route, and checkpoints at the tabletop scale', () => {
    expect([TABLE_WIDTH, TABLE_HEIGHT]).toEqual([4400, 3000])
    expect(ROUTE_LENGTH).toBeGreaterThan(8000)
    expect(ROUTE_LENGTH).toBeLessThan(9500)
    expect(gates.every(({ halfWidth }) => halfWidth >= 220 && halfWidth <= 260)).toBe(true)
    for (const { x, y } of route) {
      expect(x - TRACK_HALF_WIDTH).toBeGreaterThanOrEqual(0)
      expect(y - TRACK_HALF_WIDTH).toBeGreaterThanOrEqual(0)
      expect(x + TRACK_HALF_WIDTH).toBeLessThanOrEqual(TABLE_WIDTH)
      expect(y + TRACK_HALF_WIDTH).toBeLessThanOrEqual(TABLE_HEIGHT)
    }
  })

  it('scatters every prop type across the map and leaves the full driving line and spawn clear', () => {
    expect(TRACK_CONFIG.OBSTACLES).toBe(false)
    const track = buildTrack(footprints)
    expect(buildTrack(footprints, { OBSTACLES: false })).toEqual(track)
    expect(new Set(track.props.map(({ asset }) => asset))).toEqual(new Set(propIds))

    for (const middleX of [false, true]) {
      for (const middleY of [false, true]) {
        const quadrant = track.props.filter(({ x, y }) =>
          (x > TABLE_WIDTH / 2) === middleX && (y > TABLE_HEIGHT / 2) === middleY,
        )
        expect(quadrant.length).toBeGreaterThan(12)
      }
    }
    expect(track.props.filter(({ asset, x, y }) =>
      asset === 'ant' && !track.solids.some(solid => overlaps({ x, y, radius: 1 }, solid, 0)),
    ).length).toBeGreaterThan(20)
    expect(track.solids.some(solid => overlaps({ ...spawn, radius: TRACK_HALF_WIDTH }, solid, 0))).toBe(false)

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

  it('keeps the scattered scenery and adds collidable in-lane challenges only when enabled', () => {
    const normal = buildTrack(footprints)
    const challenge = buildTrack(footprints, { OBSTACLES: true })
    expect(challenge.props.slice(0, normal.props.length)).toEqual(normal.props)
    expect(challenge.solids.slice(0, normal.solids.length)).toEqual(normal.solids)
    const extras = challenge.solids.slice(normal.solids.length)
    expect(extras).toHaveLength(6)
    for (const extra of extras) {
      expect(route.some(point => overlaps({ ...point, radius: 6 }, extra, 0))).toBe(true)
      expect(overlaps({ ...spawn, radius: TRACK_HALF_WIDTH }, extra, 0)).toBe(false)
    }
    expect(TRACK_CONFIG.OBSTACLES).toBe(false)
  })

  it('crosses the gates in order each lap and finishes after three laps', () => {
    const race = new Race(gates, null)
    let previous: Point = spawn
    for (let lap = 0; lap < 3; lap++) {
      const passed: number[] = []
      for (const point of [...route.slice(lap === 0 ? 4 : 1), route[0]]) {
        const before = race.checkpoint
        race.step(previous, point, 16)
        if (race.checkpoint > before) passed.push(race.checkpoint)
        previous = point
      }
      expect(passed).toEqual(gates.slice(1).map((_, i) => i + 1))
      expect(race.lapTimesMs).toHaveLength(lap + 1)
      expect(race.finished).toBe(lap === 2)
    }
  })
})
