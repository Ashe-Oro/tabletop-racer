import { describe, expect, it } from 'vitest'
import { BEST_LAP_KEY, Race, gateCrossing, readBestLap } from './race'
import type { Gate } from './race'

const line = (x: number): Gate => ({ x, y: 0, forward: { x: 1, y: 0 }, halfWidth: 15 })
const gates = [line(0), line(100), line(200), line(300)]

function cross(race: Race, x: number, reverse = false, y = 0) {
  const direction = reverse ? -1 : 1
  race.step({ x: x - direction, y }, { x: x + direction, y }, 500)
}

function completeLap(race: Race) {
  for (const x of [100, 200, 300, 0]) cross(race, x)
}

describe('race checkpoints', () => {
  it('requires every gate in order and rejects crossings outside the gate width', () => {
    const race = new Race(gates, null)
    cross(race, 200)
    cross(race, 100, false, 19)
    expect(race.checkpoint).toBe(0)
    cross(race, 100)
    cross(race, 300)
    expect(race.checkpoint).toBe(1)
    cross(race, 0)
    expect(race.checkpoint).toBe(0)
    expect(race.lap).toBe(1)
    expect(race.lapTimesMs).toEqual([])
  })

  it('requires forward crossings and prevents counting laps by reversing over the line', () => {
    const race = new Race(gates, null)
    for (const x of [100, 200, 300]) cross(race, x)
    cross(race, 300, true)
    expect(race.checkpoint).toBe(2)
    cross(race, 300)
    cross(race, 0, true)
    cross(race, 0)
    expect(race.checkpoint).toBe(0)
    expect(race.lapTimesMs).toEqual([])
  })

  it('uses the intersection point on an oblique movement segment', () => {
    expect(gateCrossing({ x: -10, y: 30 }, { x: 10, y: -30 }, line(0))).toBe(1)
    expect(gateCrossing({ x: 10, y: -30 }, { x: -10, y: 30 }, line(0))).toBe(-1)
    expect(gateCrossing({ x: -10, y: 15 }, { x: -1, y: 0 }, line(0))).toBe(0)
  })

  it('finishes on lap three, retains the fastest lap and freezes the result', () => {
    const race = new Race(gates, 2150)
    race.step({ x: 20, y: 0 }, { x: 20, y: 0 }, 300)
    completeLap(race)
    expect(race.lap).toBe(2)
    expect(race.lapElapsedMs).toBe(0)
    expect(race.bestLapMs).toBe(2150)
    completeLap(race)
    expect(race.lap).toBe(3)
    expect(race.finished).toBe(false)
    completeLap(race)
    completeLap(race)
    expect(race.finished).toBe(true)
    expect(race.lap).toBe(3)
    expect(race.lapTimesMs).toEqual([2300, 2000, 2000])
    expect(race.elapsedMs).toBe(6300)
    expect(race.bestLapMs).toBe(2000)
  })

  it('reads the saved record and rejects junk', () => {
    expect(readBestLap({ getItem: key => key === BEST_LAP_KEY ? '18213' : null })).toBe(18213)
    for (const value of ['-1', 'NaN', '1.5', '', null]) {
      expect(readBestLap({ getItem: () => value })).toBeNull()
    }
  })
})
