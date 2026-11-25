import { describe, expect, it } from 'vitest'
import { Car } from './car'
import { TABLE_WIDTH } from './track'

const dt = 1 / 120
const idle = { throttle: 0, steer: 0, handbrake: false }

describe('picnic-scale car', () => {
  it.each([['left', -1], ['right', 1]])('tracks a held %s turn and stops steering on release', (_, steer) => {
    const car = new Car()
    const forward = { ...idle, throttle: 1 }
    const turning = { ...forward, steer }
    for (let i = 0; i < 90; i++) car.step(dt, forward, [])
    const initialHeading = car.heading
    for (let i = 0; i < 120; i++) {
      const heading = car.heading
      const { x, y } = car.velocity
      car.step(dt, turning, [])
      expect((car.heading - heading) * steer).toBeGreaterThan(0)
      expect((car.heading - heading) * steer).toBeLessThan(0.035)
      expect((x * car.velocity.y - y * car.velocity.x) * steer).toBeGreaterThan(0)
      expect(Math.abs(car.slip) / car.speed).toBeLessThan(0.21)
    }
    expect((car.heading - initialHeading) * steer).toBeGreaterThan(2)

    const releasedHeading = car.heading
    let slip = Math.abs(car.slip)
    for (let i = 0; i < 36; i++) {
      car.step(dt, forward, [])
      expect(car.heading).toBe(releasedHeading)
      expect(Math.abs(car.slip)).toBeLessThan(slip)
      slip = Math.abs(car.slip)
    }
    expect(slip).toBeLessThan(1)
  })

  it('uses a compact capsule at the table edge', () => {
    const car = new Car()
    expect(car.axle).toBe(6.7)
    expect(car.radius).toBe(6)
    car.position = { x: TABLE_WIDTH - 12.8, y: 900 }
    car.heading = 0
    car.velocity.x = 140
    car.step(dt, idle, [])
    expect(car.position.x).toBeLessThan(TABLE_WIDTH - car.axle - car.radius)
    expect(car.velocity.x).toBeLessThan(0)
    expect(car.bump).toBeGreaterThan(0)
    expect(car.collisions).toBe(1)
  })

  it('starts from rest with steering held and reverses its turn once when braking into reverse', () => {
    const car = new Car()
    const heading = car.heading
    for (let i = 0; i < 30; i++) car.step(dt, { ...idle, steer: 1 }, [])
    expect(car.heading).toBe(heading)
    for (let i = 0; i < 30; i++) car.step(dt, { ...idle, throttle: 1, steer: 1 }, [])
    expect(car.heading).toBeGreaterThan(heading)
    const turnDirections = new Set<number>()
    for (let i = 0; i < 60; i++) {
      const before = car.heading
      car.step(dt, { ...idle, throttle: -1, steer: 1 }, [])
      turnDirections.add(Math.sign(car.heading - before))
      if (turnDirections.has(-1)) expect(car.heading).toBeLessThanOrEqual(before)
    }
    expect([...turnDirections]).toEqual([1, 0, -1])
  })

  it.each(['wall', 'prop'])('keeps heading steady during low-speed rebounds off a %s', obstacle => {
    const car = new Car()
    car.heading = 0
    car.position = { x: obstacle === 'wall' ? TABLE_WIDTH - 12.8 : 500, y: 900 }
    const solids = obstacle === 'wall' ? [] : [{ x: 517.8, y: 900, radius: 5 }]
    let signChanges = 0
    for (let i = 0; i < 60; i++) {
      const previousX = car.velocity.x
      car.step(dt, { ...idle, throttle: 1, steer: 1 }, solids)
      if (previousX * car.velocity.x < 0) signChanges++
      expect(car.heading).toBe(0)
    }
    expect(signChanges).toBeGreaterThan(10)
  })

  it('clears a nearby prop with its sides and bounces off a front contact', () => {
    const car = new Car()
    car.position = { x: 500, y: 500 }
    car.heading = 0
    car.velocity.x = 140
    car.step(dt, idle, [{ x: 501, y: 512, radius: 5 }])
    expect(car.collisions).toBe(0)
    car.step(dt, idle, [{ x: 519, y: 500, radius: 5 }])
    expect(car.collisions).toBe(1)
    expect(car.velocity.x).toBeLessThan(0)
  })

  it('reaches its forward and reverse caps and produces handbrake slip', () => {
    const car = new Car()
    for (let i = 0; i < 240; i++) car.step(dt, { ...idle, throttle: 1 }, [])
    expect(car.speed).toBeCloseTo(270)
    for (let i = 0; i < 32; i++) car.step(dt, { throttle: 1, steer: 1, handbrake: true }, [])
    expect(car.drifting).toBe(true)
    for (let i = 0; i < 240; i++) car.step(dt, { ...idle, throttle: -1 }, [])
    expect(car.speed).toBeCloseTo(95)
  })
})
