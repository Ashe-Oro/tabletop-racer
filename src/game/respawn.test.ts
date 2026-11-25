import { describe, expect, it } from 'vitest'
import { Car } from './car'
import { Race } from './race'
import { Respawn } from './respawn'
import { gates } from './track'

const dt = 1 / 120

describe('checkpoint respawn', () => {
  it.each([{ x: 70, y: 2500 }, { x: 2200, y: 1500 }])('recovers after two seconds off track at %o', position => {
    const car = new Car()
    const race = new Race(gates, null)
    const respawn = new Respawn(car, race)
    race.checkpoint = 4
    const { x, y, forward } = gates[race.checkpoint]
    car.position = position
    car.velocity = { x: 27, y: 13 }
    car.heading = 0
    car.drifting = true
    car.slip = car.bump = car.spinTimer = 1

    for (let i = 0; i < 239; i++) expect(respawn.shouldRespawn(dt, false)).toBe(false)
    expect(respawn.shouldRespawn(dt, false)).toBe(true)
    respawn.toGate([car])

    expect(car.position).toEqual({ x, y })
    expect(car.heading).toBe(Math.atan2(forward.y, forward.x))
    expect(car.velocity).toEqual({ x: 0, y: 0 })
    expect(car.drifting).toBe(false)
    expect([car.slip, car.bump, car.spinTimer]).toEqual([0, 0, 0])
    expect(car.respawnBlink).toBe(1)
    expect(respawn.count).toBe(1)
    expect(race.checkpoint).toBe(4)
    expect(respawn.shouldRespawn(dt, false)).toBe(false)
  })

  it('requires 2.5 continuous seconds of throttle at low speed', () => {
    const car = new Car()
    const respawn = new Respawn(car, new Race(gates, null))
    expect(respawn.shouldRespawn(3, false)).toBe(false)
    expect(respawn.shouldRespawn(2, true)).toBe(false)
    car.velocity.x = 18
    expect(respawn.shouldRespawn(dt, true)).toBe(false)
    car.velocity.x = 0
    for (let i = 0; i < 299; i++) expect(respawn.shouldRespawn(dt, true)).toBe(false)
    expect(respawn.shouldRespawn(dt, true)).toBe(true)
  })

  it('clears the off-track timer when the car returns to the route', () => {
    const car = new Car()
    const respawn = new Respawn(car, new Race(gates, null))
    const offTrack = { x: 70, y: 2500 }
    car.position = offTrack
    expect(respawn.shouldRespawn(1.5, false)).toBe(false)
    car.position = gates[0]
    expect(respawn.shouldRespawn(dt, false)).toBe(false)
    car.position = offTrack
    expect(respawn.shouldRespawn(1.5, false)).toBe(false)
  })

  it('uses a clear lateral offset when another car occupies the gate', () => {
    const car = new Car()
    const other = new Car()
    const race = new Race(gates, null)
    const respawn = new Respawn(car, race)
    const gate = gates[0]
    other.position = { x: gate.x, y: gate.y }
    respawn.toGate([car, other])
    const dx = car.position.x - gate.x
    const dy = car.position.y - gate.y
    expect(Math.hypot(dx, dy)).toBeCloseTo(27)
    expect(dx * gate.forward.x + dy * gate.forward.y).toBeCloseTo(0)
    expect(other.position).toEqual({ x: gate.x, y: gate.y })
  })
})
