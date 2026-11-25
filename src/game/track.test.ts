import { describe, expect, it } from 'vitest'
import footprints from '../../public/assets/manifest.json'
import { overlaps } from './collision'
import type { Point } from './geometry'
import { Race } from './race'
import {
  ANT_SCALE, ANT_WALK_DISTANCE, ROUTE_LENGTH, TABLE_HEIGHT, TABLE_WIDTH, TRACK_CONFIG, TRACK_HALF_WIDTH,
  antPlacementBounds, buildTrack, gates, propIds, route, spawn,
} from './track'
import type { PropId } from './track'

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
    for (const id of ['napkins', 'sandwich', 'mustard', 'bottle_cap']) {
      expect(track.props.filter(({ asset }) => asset === id).length).toBeGreaterThan(1)
    }

    for (const middleX of [false, true]) {
      for (const middleY of [false, true]) {
        const quadrant = track.props.filter(({ x, y }) =>
          (x > TABLE_WIDTH / 2) === middleX && (y > TABLE_HEIGHT / 2) === middleY,
        )
        expect(quadrant.length).toBeGreaterThan(12)
      }
    }
    const ants = track.props.filter(({ asset }) => asset === 'ant' || asset === 'ant_walk')
    expect(ants.length).toBeGreaterThan(20)
    expect(ANT_SCALE).toBe(2)
    const antBounds = ants.map(ant => antPlacementBounds(ant, footprints[ant.asset]))
    for (const [i, bounds] of antBounds.entries()) {
      const { x, y, angle, asset } = ants[i]
      const halfWalk = asset === 'ant_walk' ? ANT_WALK_DISTANCE / 2 : 0
      expect(bounds.x).toBeCloseTo(x + Math.cos(angle) * halfWalk)
      expect(bounds.y).toBeCloseTo(y + Math.sin(angle) * halfWalk)
      expect(bounds.radius).toBeCloseTo(Math.hypot(10, 6) + halfWalk)
      expect(bounds.x - bounds.radius).toBeGreaterThanOrEqual(0)
      expect(bounds.y - bounds.radius).toBeGreaterThanOrEqual(0)
      expect(bounds.x + bounds.radius).toBeLessThanOrEqual(TABLE_WIDTH)
      expect(bounds.y + bounds.radius).toBeLessThanOrEqual(TABLE_HEIGHT)
      expect(track.solids.some(solid => overlaps(bounds, solid, 0))).toBe(false)
      expect(antBounds.slice(0, i).some(other => overlaps(bounds, other, 0))).toBe(false)
    }
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
        expect(antBounds.some(bounds => overlaps(lane, bounds, 0))).toBe(false)
      }
    }
  })

  it('uses each picnic prop’s visible alpha bounds for its circle or oriented box', () => {
    const { props, solids } = buildTrack(footprints)
    const round: Partial<Record<PropId, number>> = {
      plate: 65.5, cup: 32.5, bottle_cap: 10.5, salt_shaker: 12.5,
    }
    const boxed: Partial<Record<PropId, [number, number]>> = {
      basket: [109.5, 102.5], ketchup: [11, 33], mustard: [12, 33],
      napkins: [30.5, 28], fork: [8, 48.5], sandwich: [39.5, 47.5], watermelon: [36.5, 41],
    }
    for (const { asset, x, y, angle } of props) {
      if (round[asset]) {
        expect(solids).toContainEqual({ x, y, radius: round[asset] })
      }
      const box = boxed[asset]
      if (box) {
        const [halfWidth, halfLength] = box
        expect(solids).toContainEqual({ x, y, angle, halfWidth, halfLength })
      }
    }

    const baskets = props.filter(({ asset }) => asset === 'basket')
    expect(baskets).toHaveLength(8)
    for (const [i, { x, y, angle }] of baskets.entries()) {
      const [halfWidth, halfLength] = boxed.basket!
      const extentX = Math.abs(Math.cos(angle)) * halfWidth + Math.abs(Math.sin(angle)) * halfLength
      const extentY = Math.abs(Math.sin(angle)) * halfWidth + Math.abs(Math.cos(angle)) * halfLength
      expect(x - extentX).toBeGreaterThanOrEqual(0)
      expect(y - extentY).toBeGreaterThanOrEqual(0)
      expect(x + extentX).toBeLessThanOrEqual(TABLE_WIDTH)
      expect(y + extentY).toBeLessThanOrEqual(TABLE_HEIGHT)
      for (const other of baskets.slice(i + 1)) {
        expect(overlaps({ x, y, angle, halfWidth, halfLength }, { ...other, halfWidth, halfLength }, 0)).toBe(false)
      }
    }
  })

  it('trims transparent margins from a stacked prop’s footprint bitmap', () => {
    const { coin } = footprints
    const footprint = new Uint8Array(coin.sliceWidth * coin.sliceHeight)
    footprint.fill(1, coin.sliceWidth, footprint.length - coin.sliceWidth)
    const { props, solids } = buildTrack({ ...footprints, coin: { ...coin, footprint } })
    const { x, y } = props.find(({ asset }) => asset === 'coin')!
    expect(solids).toContainEqual({ x, y, radius: 8 })
  })

  it('rotates the center offset of a sprite with asymmetric padding', () => {
    const { ketchup } = footprints
    const { props, solids } = buildTrack({ ...footprints, ketchup: { ...ketchup, width: ketchup.width + 4 } })
    const bottle = props.find(({ asset, x }) => asset === 'ketchup' && x === 2520)!
    const { x, y, angle } = bottle
    expect(solids).toContainEqual({
      x: x - 2 * Math.cos(angle), y: y - 2 * Math.sin(angle), angle,
      halfWidth: 11, halfLength: 33,
    })
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
    for (const ant of normal.props.filter(({ asset }) => asset === 'ant' || asset === 'ant_walk')) {
      const bounds = antPlacementBounds(ant, footprints[ant.asset])
      expect(extras.some(extra => overlaps(bounds, extra, 0))).toBe(false)
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
      expect(race.checkpoint).toBe(0)
      expect(race.lap).toBe(Math.min(lap + 2, 3))
      expect(race.finished).toBe(lap === 2)
    }
  })
})
