import { describe, expect, it } from 'vitest'
import { BEST_LAP_KEY, COUNTDOWN_BEAT, Race, gateCrossing, raceCountdown, raceProgress, rankRacers, readBestLap } from './race'
import type { Gate } from './race'
import { gates as circuitGates, gridSlot, progressWithinCheckpoint, ROUTE_LENGTH, sampleRoute } from './track'

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

describe('race standings', () => {
  it('orders the staggered grid behind racers that have crossed the line', () => {
    const grid = Array.from({ length: 4 }, (_, index) => ({
      index, race: new Race(circuitGates, null), progress: progressWithinCheckpoint(gridSlot(index), 0),
    }))
    const started = { index: 4, race: new Race(circuitGates, null), progress: progressWithinCheckpoint(sampleRoute(10), 0) }
    expect(grid.every(entry => entry.progress < 0)).toBe(true)
    expect(rankRacers([grid[3], grid[1], started, grid[2], grid[0]]).map(({ index }) => index))
      .toEqual([4, 0, 1, 2, 3])
    expect(raceProgress(grid[0], ROUTE_LENGTH)).toBeCloseTo(-20)
  })

  it('sorts by completed lap, validated checkpoint, then fractional progress', () => {
    const entry = (lap: number, checkpoint: number, progress: number) => {
      const race = new Race(gates, null)
      for (let i = 1; i < lap; i++) completeLap(race)
      race.checkpoint = checkpoint
      return { race, progress }
    }
    const lapDown = entry(1, 3, 390)
    const early = entry(2, 1, 110)
    const later = entry(2, 1, 175)
    const checkpointAhead = entry(2, 2, 200)
    expect(rankRacers([lapDown, later, checkpointAhead, early])).toEqual([checkpointAhead, later, early, lapDown])
    expect(raceProgress(later, 400)).toBe(575)
    expect(progressWithinCheckpoint(sampleRoute(300), circuitGates.length - 1)).toBe(ROUTE_LENGTH)
  })

  it('orders finished racers by exact crossing time, including in the same tick', () => {
    const finalCrossing = (start: number) => {
      const race = new Race(gates, null)
      completeLap(race)
      completeLap(race)
      for (const x of [100, 200, 300]) cross(race, x)
      race.step({ x: start, y: 0 }, { x: 1, y: 0 }, 8)
      return { race, progress: 0 }
    }
    const faster = finalCrossing(-1)
    const slower = finalCrossing(-3)
    const racing = { race: new Race(gates, null), progress: 100 }
    expect(faster.race.elapsedMs).toBe(slower.race.elapsedMs)
    expect(faster.race.finishTimeMs).toBe(5504)
    expect(slower.race.finishTimeMs).toBe(5506)
    expect(rankRacers([racing, slower, faster])).toEqual([faster, slower, racing])
  })

  it('shows each countdown beat and unlocks on GO', () => {
    expect([0, 1, 2, 3, 4].map(beat => raceCountdown(beat * COUNTDOWN_BEAT)))
      .toEqual([3, 2, 1, 'GO!', null])
  })
})
