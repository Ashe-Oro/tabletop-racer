import { describe, expect, it } from 'vitest'
import footprints from '../../public/assets/manifest.json'
import { RivalController, rubberBandScale } from './ai'
import { Car } from './car'
import { cars } from './cars'
import type { Solid } from './collision'
import { Race } from './race'
import { buildTrack, gates, gridSlot, projectRoute, sampleRoute } from './track'

const dt = 1 / 120

function drive(car: Car, controller: RivalController, race: Race, solids: readonly Solid[], seconds: number) {
  let stall = 0
  let maxStall = 0
  let reversed = false
  for (let i = 0; i < seconds / dt && !race.finished; i++) {
    const from = { ...car.position }
    const controls = controller.controls(car, projectRoute(car.position), dt, solids, [])
    reversed ||= controls.throttle === -1 && car.speed < 60
    car.step(dt, controls, solids)
    race.step(from, car.position, dt * 1000)
    stall = car.speed < 18 ? stall + dt : 0
    maxStall = Math.max(maxStall, stall)
  }
  return { maxStall, reversed }
}

describe('rival driving', () => {
  it.each(cars.map((spec, index) => ({ spec, index })))('finishes three brisk laps at neutral pace with $spec.name', ({ spec, index }) => {
    const { heading, ...position } = gridSlot(index)
    const car = new Car(spec)
    car.position = position
    car.heading = heading
    const race = new Race(gates, null)
    const { solids } = buildTrack(footprints)
    const { maxStall } = drive(car, new RivalController(index, false), race, solids, 135)
    expect(race.lapTimesMs).toHaveLength(3)
    expect(Math.max(...race.lapTimesMs)).toBeLessThan(45_000)
    expect(maxStall).toBeLessThan(3)
  })

  it.each([0, 1, 2])('completes the obstacle configuration without a prolonged stall (driver %i)', index => {
    const { solids } = buildTrack(footprints, { OBSTACLES: true })
    const car = new Car()
    const race = new Race(gates, null)
    const { maxStall } = drive(car, new RivalController(index, false), race, solids, 45)
    expect(race.lapTimesMs).toHaveLength(1)
    expect(maxStall).toBeLessThan(3)
  })

  it('routes around an obstacle in its preferred lane', () => {
    const car = new Car()
    const race = new Race(gates, null)
    const obstacle = { ...sampleRoute(250, -23), radius: 26 }
    drive(car, new RivalController(0, false), race, [obstacle], 45)
    expect(race.lapTimesMs).toHaveLength(1)
    expect(car.collisions).toBe(0)
  })

  it('reverses out of a blockade and goes on to complete a lap', () => {
    const car = new Car()
    const race = new Race(gates, null)
    const obstacle = { x: car.position.x + 20, y: car.position.y, angle: 0, halfWidth: 6, halfLength: 62 }
    const { maxStall, reversed } = drive(car, new RivalController(0, false), race, [obstacle], 45)
    expect(reversed).toBe(true)
    expect(race.lapTimesMs).toHaveLength(1)
    expect(maxStall).toBeLessThan(3)
  })

  it('bounds catch-up and leader pace changes', () => {
    expect(rubberBandScale(0)).toBe(1)
    expect(rubberBandScale(1000)).toBeCloseTo(1.08)
    expect(rubberBandScale(-1000)).toBeCloseTo(0.94)
  })
})
