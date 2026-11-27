import { describe, expect, it } from 'vitest'
import footprints from '../../public/assets/manifest.json'
import { ITEM_PIXELS } from '../render/items'
import { Car, NITRO_MULTIPLIER } from './car'
import { boxContact, circleContact } from './collision'
import {
  BLAST_RADIUS, BOMB_ARM, BOMB_FUSE, ItemSystem, NITRO_DURATION, OIL_RADIUS, PICKUP_RESPAWN,
  itemIds, pickupSpots, rollItem, routeIsStraight, shouldUseItem,
} from './items'
import type { ItemId } from './items'
import { ROUTE_LENGTH, TABLE_HEIGHT, TABLE_WIDTH, buildTrack, projectRoute } from './track'

const dt = 1 / 120
const forward = { throttle: 1, steer: 0, handbrake: false }
const idle = { throttle: 0, steer: 0, handbrake: false }
const { solids } = buildTrack(footprints)

/** A deterministic stream so rolls are repeatable. */
function sequence(...values: number[]) {
  let i = 0
  return () => values[i++ % values.length]
}

function carAt(x: number, y: number, heading = 0) {
  const car = new Car()
  car.position = { x, y }
  car.heading = heading
  return car
}

/** An item system with every pickup out of play, so tests only see what they place. */
function emptySystem() {
  const items = new ItemSystem(sequence(0.5))
  for (const spot of items.spots) spot.cooldown = 1e9
  return items
}

function run(items: ItemSystem, cars: Car[], seconds: number, controls = idle, map = solids) {
  for (let t = 0; t < seconds; t += dt) {
    for (const car of cars) car.step(dt, controls, map)
    items.step(dt, cars, map)
  }
}

// An open patch of cloth well away from the props, for physics-only checks.
const OPEN = { x: 2100, y: 2500 }

describe('pickup spots', () => {
  it('places three rows-of-three across the lane, on the table and clear of every prop', () => {
    const spots = pickupSpots(Math.random)
    expect(spots).toHaveLength(15)
    for (const spot of spots) {
      expect(spot.x).toBeGreaterThan(0)
      expect(spot.y).toBeGreaterThan(0)
      expect(spot.x).toBeLessThan(TABLE_WIDTH)
      expect(spot.y).toBeLessThan(TABLE_HEIGHT)
      const probe = { ...spot, radius: 14 }
      expect(solids.some(solid => 'radius' in solid ? circleContact(probe, solid) : boxContact(probe, solid))).toBe(false)
    }
  })

  it('keeps every pickup row away from the start/finish line', () => {
    for (const spot of pickupSpots(Math.random)) {
      const distance = projectRoute(spot)
      expect(Math.min(distance, ROUTE_LENGTH - distance)).toBeGreaterThan(600)
    }
  })

  it('rolls all five items from the odds table', () => {
    const seen = new Set<ItemId>()
    for (let i = 0; i < 120; i++) seen.add(rollItem(() => i / 120))
    expect([...seen].sort()).toEqual([...itemIds].sort())
  })

  it('gives the shown item to a car that drives through it and respawns the spot later', () => {
    const items = new ItemSystem(sequence(0.5))
    const spot = items.spots[0]
    const shown = spot.item
    const car = carAt(spot.x, spot.y)
    items.step(dt, [car], solids)
    expect(items.itemOf(car)).toBe(shown)
    expect(spot.cooldown).toBe(PICKUP_RESPAWN)
    expect(items.availableSpots()).not.toContain(spot)
    car.position = { x: 10, y: 10 }
    for (let t = 0; t < PICKUP_RESPAWN + dt; t += dt) items.step(dt, [car], solids)
    expect(spot.cooldown).toBe(0)
  })

  it('lets a car hold only one item; a full car leaves the pickup on the track', () => {
    const items = new ItemSystem(sequence(0.5))
    const [first, second] = items.spots
    const car = carAt(first.x, first.y)
    items.step(dt, [car], solids)
    const held = items.itemOf(car)
    car.position = { x: second.x, y: second.y }
    second.item = held === 'bomb' ? 'nitro' : 'bomb'
    items.step(dt, [car], solids)
    expect(items.itemOf(car)).toBe(held)
    expect(second.cooldown).toBe(0)
  })

  it('does nothing when a car with no item presses use', () => {
    const items = emptySystem()
    expect(items.use(carAt(OPEN.x, OPEN.y))).toBeNull()
    expect(items.bullets).toHaveLength(0)
    expect(items.hazards).toHaveLength(0)
  })
})

describe('nitro', () => {
  it('kicks the car forward and raises its cap, then tapers back to the base limit', () => {
    const items = emptySystem()
    const car = carAt(OPEN.x, OPEN.y)
    run(items, [car], 2.6, forward, [])
    const base = car.speedCap
    const before = car.speed
    items.give(car, 'nitro')
    expect(items.use(car)).toBe('nitro')
    expect(items.itemOf(car)).toBeNull()
    expect(car.speed).toBeGreaterThan(before + 40)
    expect(car.speedCap).toBeCloseTo(base * NITRO_MULTIPLIER)
    run(items, [car], NITRO_DURATION * 0.6, forward, [])
    expect(car.speed).toBeGreaterThan(base * 1.2)
    run(items, [car], NITRO_DURATION, forward, [])
    expect(car.nitroTimer).toBe(0)
    expect(car.speedCap).toBeCloseTo(base)
    expect(car.speed).toBeLessThanOrEqual(base + 1e-9)
  })

  it('keeps its boost when the AI pace boost is also active', () => {
    const car = carAt(OPEN.x, OPEN.y)
    car.nitro(1, 0)
    car.setBoost(1.05, 0.1)
    expect(car.speedCap).toBeCloseTo(270 * 1.05 * NITRO_MULTIPLIER)
  })
})

describe('bullets', () => {
  it('fires ahead, spins out the first rival it reaches, and never hits the shooter', () => {
    const items = emptySystem()
    const shooter = carAt(OPEN.x, OPEN.y)
    const target = carAt(OPEN.x + 200, OPEN.y)
    items.give(shooter, 'bullet')
    items.use(shooter)
    expect(items.bullets).toHaveLength(1)
    run(items, [shooter, target], 0.6, idle, [])
    expect(target.spinTimer).toBeGreaterThan(0)
    expect(shooter.spinTimer).toBe(0)
    expect(items.hits.get(target)).toBe(1)
    expect(items.bullets).toHaveLength(0)
  })

  it('stops at props instead of passing through them', () => {
    const items = emptySystem()
    const wall = { x: OPEN.x + 60, y: OPEN.y, radius: 10 }
    const shooter = carAt(OPEN.x, OPEN.y)
    const target = carAt(OPEN.x + 150, OPEN.y)
    items.give(shooter, 'bullet')
    items.use(shooter)
    run(items, [shooter, target], 0.6, idle, [wall])
    expect(target.spinTimer).toBe(0)
    expect(items.bullets).toHaveLength(0)
  })

  it('expires after its range', () => {
    const items = emptySystem()
    const shooter = carAt(OPEN.x, OPEN.y)
    items.give(shooter, 'bullet')
    items.use(shooter)
    run(items, [shooter], 1.5, idle, [])
    expect(items.bullets).toHaveLength(0)
  })

  it('shotgun fires a three-shot spread that catches a car off the center line', () => {
    const items = emptySystem()
    const shooter = carAt(OPEN.x, OPEN.y)
    items.give(shooter, 'shotgun')
    items.use(shooter)
    expect(items.bullets).toHaveLength(3)
    const angles = items.bullets.map(({ vx, vy }) => Math.atan2(vy, vx)).sort((a, b) => a - b)
    expect(angles[0]).toBeLessThan(-0.1)
    expect(angles[2]).toBeGreaterThan(0.1)

    const offAxis = carAt(OPEN.x + 120, OPEN.y + 24)
    const again = emptySystem()
    again.give(shooter, 'shotgun')
    again.use(shooter)
    run(again, [shooter, offAxis], 0.4, idle, [])
    expect(offAxis.spinTimer).toBeGreaterThan(0)
  })

  it('shotgun has shorter reach than the single bullet', () => {
    const items = emptySystem()
    const shooter = carAt(OPEN.x, OPEN.y)
    const far = carAt(OPEN.x + 600, OPEN.y)
    items.give(shooter, 'shotgun')
    items.use(shooter)
    run(items, [shooter, far], 1.2, idle, [])
    expect(far.spinTimer).toBe(0)
  })

  it('cannot chain-stun a car that was just hit', () => {
    const items = emptySystem()
    const shooter = carAt(OPEN.x, OPEN.y)
    const target = carAt(OPEN.x + 100, OPEN.y)
    for (let shot = 0; shot < 2; shot++) {
      items.give(shooter, 'bullet')
      items.use(shooter)
      run(items, [shooter, target], 0.25, idle, [])
    }
    expect(items.hits.get(target)).toBe(1)
  })
})

describe('dropped hazards', () => {
  it('drops oil behind the car, spares the owner for a moment, and spins out a follower', () => {
    const items = emptySystem()
    const leader = carAt(OPEN.x, OPEN.y)
    items.give(leader, 'oil')
    items.use(leader)
    const [oil] = items.hazards
    expect(oil.kind).toBe('oil')
    expect(oil.x).toBeLessThan(leader.position.x)
    items.step(dt, [leader], [])
    expect(leader.spinTimer).toBe(0)

    const follower = carAt(oil.x - OIL_RADIUS - 30, oil.y)
    follower.velocity = { x: 200, y: 0 }
    run(items, [follower], 0.3, forward, [])
    expect(follower.spinTimer).toBeGreaterThan(0)
    expect(items.hazards).toHaveLength(1)
  })

  it('fades oil out after its lifetime', () => {
    const items = emptySystem()
    const car = carAt(OPEN.x, OPEN.y)
    items.give(car, 'oil')
    items.use(car)
    car.position = { x: 10, y: 10 }
    run(items, [car], 15, idle, [])
    expect(items.hazards).toHaveLength(0)
  })

  it('arms a dropped bomb, then blows it up when a car touches it and throws nearby cars clear', () => {
    const items = emptySystem()
    const dropper = carAt(OPEN.x, OPEN.y)
    items.give(dropper, 'bomb')
    items.use(dropper)
    const [bomb] = items.hazards
    expect(bomb.kind).toBe('bomb')
    // The dropper sits right on top of it, but it is not armed yet.
    items.step(dt, [dropper], [])
    expect(items.hazards).toHaveLength(1)

    dropper.position = { x: 10, y: 10 }
    run(items, [dropper], BOMB_ARM, idle, [])
    const victim = carAt(bomb.x, bomb.y)
    const bystander = carAt(bomb.x + BLAST_RADIUS - 10, bomb.y)
    const safe = carAt(bomb.x + BLAST_RADIUS + 30, bomb.y)
    items.step(dt, [dropper, victim, bystander, safe], [])
    expect(items.hazards).toHaveLength(0)
    expect(victim.spinTimer).toBeGreaterThan(0)
    expect(bystander.spinTimer).toBeGreaterThan(0)
    expect(bystander.velocity.x).toBeGreaterThan(100)
    expect(safe.spinTimer).toBe(0)
    expect(items.effects.some(effect => effect.kind === 'blast')).toBe(true)
  })

  it('goes off on its own when the fuse runs out', () => {
    const items = emptySystem()
    const dropper = carAt(OPEN.x, OPEN.y)
    items.give(dropper, 'bomb')
    items.use(dropper)
    const nearby = carAt(OPEN.x - 17, OPEN.y + 30)
    dropper.position = { x: 10, y: 10 }
    run(items, [dropper, nearby], BOMB_FUSE + 0.05, idle, [])
    expect(items.hazards).toHaveLength(0)
    expect(nearby.spinTimer).toBeGreaterThan(0)
  })

  it('lets a bullet set off a bomb', () => {
    const items = emptySystem()
    const dropper = carAt(OPEN.x + 300, OPEN.y, Math.PI)
    items.give(dropper, 'bomb')
    items.use(dropper)
    dropper.position = { x: 10, y: 10 }
    const shooter = carAt(OPEN.x, OPEN.y)
    items.give(shooter, 'bullet')
    items.use(shooter)
    run(items, [shooter], 0.7, idle, [])
    expect(items.hazards).toHaveLength(0)
    expect(items.bullets).toHaveLength(0)
  })
})

describe('AI item use', () => {
  const situation = (item: ItemId, car: Car, traffic: Car[], extra = {}) =>
    shouldUseItem({ item, car, traffic: [car, ...traffic], heldTime: 1, straight: false, ...extra })

  it('fires bullets at a car lined up ahead but not at one off to the side', () => {
    const car = carAt(OPEN.x, OPEN.y)
    expect(situation('bullet', car, [carAt(OPEN.x + 250, OPEN.y + 5)])).toBe(true)
    expect(situation('bullet', car, [carAt(OPEN.x + 250, OPEN.y + 80)])).toBe(false)
    expect(situation('bullet', car, [carAt(OPEN.x - 250, OPEN.y)])).toBe(false)
  })

  it('saves the shotgun for close range', () => {
    const car = carAt(OPEN.x, OPEN.y)
    expect(situation('shotgun', car, [carAt(OPEN.x + 120, OPEN.y + 20)])).toBe(true)
    expect(situation('shotgun', car, [carAt(OPEN.x + 400, OPEN.y)])).toBe(false)
  })

  it('drops oil and bombs on a car close behind', () => {
    const car = carAt(OPEN.x, OPEN.y)
    for (const item of ['oil', 'bomb'] as const) {
      expect(situation(item, car, [carAt(OPEN.x - 80, OPEN.y + 10)])).toBe(true)
      expect(situation(item, car, [carAt(OPEN.x + 80, OPEN.y)])).toBe(false)
    }
  })

  it('uses nitro on a straight at speed', () => {
    const car = carAt(OPEN.x, OPEN.y)
    car.velocity = { x: 250, y: 0 }
    expect(situation('nitro', car, [], { straight: true })).toBe(true)
    expect(situation('nitro', car, [], { straight: false })).toBe(false)
  })

  it('waits a beat after pickup and never fires mid-spin', () => {
    const car = carAt(OPEN.x, OPEN.y)
    const ahead = carAt(OPEN.x + 200, OPEN.y)
    expect(situation('bullet', car, [ahead], { heldTime: 0.1 })).toBe(false)
    car.spinOut(0.5)
    expect(situation('bullet', car, [ahead])).toBe(false)
  })

  it('finds both straights and corners on the circuit', () => {
    const samples = Array.from({ length: 60 }, (_, i) => routeIsStraight(i / 60 * ROUTE_LENGTH))
    expect(samples).toContain(true)
    expect(samples).toContain(false)
  })
})

describe('item art', () => {
  it('uses rectangular pixel maps drawn only from the palette keys', () => {
    for (const [id, rows] of Object.entries(ITEM_PIXELS)) {
      expect(new Set(rows.map(row => row.length)).size, id).toBe(1)
      expect(rows.join(''), id).toMatch(/^[.kcsrRhgoyYtTamMwbB]+$/)
      expect(rows[0].length, id).toBeLessThanOrEqual(16)
      expect(rows.length, id).toBeLessThanOrEqual(12)
    }
  })
})
