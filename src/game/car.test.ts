import { describe, expect, it } from 'vitest'
import { Car } from './car'
import { TABLE_WIDTH } from './track'

const dt = 1 / 120
const idle = { throttle: 0, steer: 0, handbrake: false }

describe('picnic-scale car', () => {
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
