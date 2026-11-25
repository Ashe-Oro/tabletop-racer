import { describe, expect, it } from 'vitest'
import footprints from '../../public/assets/manifest.json'
import { Car } from './car'
import { cars } from './cars'
import { overlaps } from './collision'
import { buildTrack, TABLE_WIDTH } from './track'

const dt = 1 / 120
const idle = { throttle: 0, steer: 0, handbrake: false }
const forward = { ...idle, throttle: 1 }
const reverse = { ...idle, throttle: -1 }

function launch(car: Car) {
  car.heading = 0
  const speeds = [car.speed]
  for (let i = 0; i < 300; i++) {
    car.step(dt, forward, [])
    speeds.push(car.speed)
  }
  return speeds
}

describe('acceleration curve', () => {
  it.each(cars)('$name launches hard, tapers, and reaches the cap on schedule', spec => {
    const speeds = launch(new Car(spec))
    const capFrame = speeds.findIndex(speed => speed >= 270 - 1e-8)
    expect(speeds[60]).toBeGreaterThan(150)
    expect(speeds[60]).toBeLessThan(215)
    expect(speeds[capFrame - 1]).toBeLessThan(270)
    expect(speeds[capFrame] - speeds[capFrame - 30]).toBeLessThan((speeds[30] - speeds[0]) / 5)
    expect(capFrame * dt).toBeGreaterThanOrEqual(1.5)
    expect(capFrame * dt).toBeLessThanOrEqual(2.5)
    expect(capFrame * dt).toBeCloseTo(spec.accelerationTime)
    expect(speeds.at(-1)).toBeCloseTo(270)
  })

  it('defaults to Stripe and lets the F1 reach top speed ahead of the Pickup', () => {
    expect(new Car().spec).toBe(cars[0])
    const pickup = launch(new Car(cars[1]))
    const f1 = launch(new Car(cars[2]))
    expect(pickup[1]).toBeGreaterThan(launch(new Car())[1])
    expect(f1[180]).toBeCloseTo(270)
    expect(pickup[180]).toBeLessThan(265)
  })

  it('rolls when coasting and scrubs speed quickly in either direction under opposing throttle', () => {
    const coasting = new Car()
    const braking = new Car()
    const reversing = new Car()
    for (const car of [coasting, braking, reversing]) car.heading = 0
    coasting.velocity.x = braking.velocity.x = 240
    reversing.velocity.x = -90
    reversing.step(dt, forward, [])
    expect(reversing.velocity.x).toBeGreaterThan(-84)

    for (let i = 0; i < 30; i++) {
      coasting.step(dt, idle, [])
      braking.step(dt, reverse, [])
    }
    expect(coasting.speed).toBeCloseTo(240 * Math.exp(-0.25))
    expect(braking.speed).toBeLessThan(coasting.speed / 3)
    expect(braking.velocity.x).toBeGreaterThan(0)
  })
})

describe('picnic-scale car', () => {
  it('scales steering response by the selected car’s handling', () => {
    const turns = cars.map(spec => {
      const car = new Car(spec)
      car.heading = 0
      car.velocity.x = 120
      car.step(dt, { ...forward, steer: 1 }, [])
      return car.heading
    })
    expect(turns[1] / turns[0]).toBeCloseTo(0.95)
    expect(turns[2] / turns[0]).toBeCloseTo(1.08)
    expect(turns[3] / turns[0]).toBeCloseTo(1)
  })

  it.each([['left', -1], ['right', 1]])('tracks a held %s turn and stops steering on release', (_, steer) => {
    const car = new Car()
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
      const along = car.velocity.x * Math.cos(before) + car.velocity.y * Math.sin(before)
      car.step(dt, { ...idle, throttle: -1, steer: 1 }, [])
      const direction = Math.sign(car.heading - before)
      expect(direction).toBe(along > 8 ? 1 : -1)
      turnDirections.add(direction)
    }
    expect([...turnDirections]).toEqual([1, -1])
  })

  it.each([['wall', 1], ['wall', -1], ['prop', 1], ['prop', -1]])(
    'keeps steering in one direction during low-speed rebounds off a %s with throttle %i', (obstacle, throttle) => {
      const car = new Car()
      car.heading = throttle > 0 ? 0 : Math.PI
      car.position = { x: obstacle === 'wall' ? TABLE_WIDTH - 12.8 : 500, y: 900 }
      const solids = obstacle === 'wall' ? [] : [{ x: 517.8, y: 900, radius: 5 }]
      for (let i = 0; i < 30; i++) car.step(dt, { ...idle, throttle }, solids)

      const initialHeading = car.heading
      const turning = { ...idle, throttle, steer: 1 }
      const along = () => car.velocity.x * Math.cos(car.heading) + car.velocity.y * Math.sin(car.heading)
      let signChanges = 0
      for (let i = 0; i < 84; i++) {
        const previousHeading = car.heading
        const previousAlong = along()
        car.step(dt, turning, solids)
        const currentAlong = along()
        if (Math.abs(previousAlong) <= 8 && Math.abs(currentAlong) <= 8 && previousAlong * currentAlong < 0) {
          signChanges++
        }
        expect((car.heading - previousHeading) * Math.sign(throttle) * turning.steer).toBeGreaterThan(0)
      }
      expect(signChanges).toBeGreaterThan(1)
      expect((car.heading - initialHeading) * Math.sign(throttle)).toBeGreaterThan(1)
    },
  )

  it('steers clear of the south edge of the picnic basket from the Stripe spawn', () => {
    const { solids } = buildTrack(footprints)
    const basket = solids.find(solid => solid.x === 2175 && solid.y === 2250)
    if (!basket) throw new Error('Missing QA basket collider')
    const car = new Car()
    const drive = (steer: number, frames: number) => {
      for (let i = 0; i < frames; i++) car.step(dt, { ...idle, throttle: 1, steer }, solids)
    }
    // Collision resolution leaves a small gap, so include it when checking proximity.
    const nearBasket = (gap: number) => [-car.axle, 0, car.axle].some(offset => overlaps({
      x: car.position.x + offset * Math.cos(car.heading),
      y: car.position.y + offset * Math.sin(car.heading),
      radius: car.radius,
    }, basket, gap))

    drive(-1, 60)
    drive(0, 240)
    expect(car.collisions).toBeGreaterThan(0)
    expect(car.position.y).toBeGreaterThan(basket.y)
    expect(car.speed).toBeLessThan(8)
    expect(nearBasket(0.1)).toBe(true)
    const pinnedHeading = car.heading

    drive(1, 84)
    expect(car.heading - pinnedHeading).toBeGreaterThan(1)
    expect(nearBasket(0.1)).toBe(false)
    expect(car.speed).toBeGreaterThan(60)
    drive(1, 108)
    const previousPosition = { ...car.position }
    drive(1, 12)

    expect(nearBasket(30)).toBe(false)
    const dx = car.position.x - previousPosition.x
    const dy = car.position.y - previousPosition.y
    expect(dx * Math.cos(car.heading) + dy * Math.sin(car.heading)).toBeGreaterThan(20)
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

describe('temporary car effects', () => {
  it('raises the speed cap during a boost and restores it when the timer expires', () => {
    const car = new Car()
    car.heading = 0
    car.velocity = { x: 270, y: 0 }
    car.setBoost(1.2, 1.5)
    for (let i = 0; i < 40; i++) car.step(dt, { ...idle, throttle: 1 }, [])
    expect(car.speed).toBeGreaterThan(270)
    expect(car.speed).toBeLessThan(324)
    for (let i = 0; i < 120; i++) car.step(dt, forward, [])
    expect(car.speed).toBeCloseTo(324)
    for (let i = 0; i < 24; i++) car.step(dt, forward, [])
    expect(car.speed).toBeCloseTo(270)
    expect(car.boostMultiplier).toBe(1)
    expect(car.boostTimer).toBe(0)
  })

  it('honors speed scaling throughout the ramp', () => {
    const car = new Car()
    car.speedScale = 0.8
    const speeds = launch(car)
    expect(speeds[222]).toBeCloseTo(216)
    expect(speeds.at(-1)).toBeCloseTo(216)
  })

  it('spins, reduces traction, and returns steering control on expiry', () => {
    const car = new Car()
    const baseline = new Car()
    const controls = { ...idle, throttle: 1 }
    const velocity = { x: 200, y: 80 }
    car.velocity = { ...velocity }
    baseline.velocity = { ...velocity }
    baseline.heading = car.heading + 9 * dt
    const heading = car.heading
    car.spinOut(3 * dt)
    car.step(dt, controls, [])
    baseline.step(dt, controls, [])
    expect(car.heading).toBeGreaterThan(heading)
    expect(Math.abs(car.slip)).toBeGreaterThan(Math.abs(baseline.slip))
    const along = (vehicle: Car) =>
      vehicle.velocity.x * Math.cos(vehicle.heading) + vehicle.velocity.y * Math.sin(vehicle.heading)
    expect(along(car)).toBeLessThan(along(baseline))
    for (let i = 0; i < 3; i++) car.step(dt, controls, [])
    expect(car.spinTimer).toBe(0)
    const releasedHeading = car.heading
    car.step(dt, { ...controls, steer: 1 }, [])
    expect(car.heading - releasedHeading).toBeGreaterThan(0)
    expect(car.heading - releasedHeading).toBeLessThan(4 * dt)
  })
})
