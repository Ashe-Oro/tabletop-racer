import type { Car } from './car'
import { WHEEL_CENTERS } from './cars'
import { boxContact, circleContact } from './collision'
import type { Circle, Solid } from './collision'
import { clamp, dot } from './geometry'
import type { Point } from './geometry'
import { ROUTE_LENGTH, TABLE_HEIGHT, TABLE_WIDTH, sampleRoute } from './track'

export const itemIds = ['nitro', 'oil', 'bullet', 'shotgun', 'bomb'] as const
export type ItemId = typeof itemIds[number]

export const ITEM_NAMES: Record<ItemId, string> = {
  nitro: 'Nitro', oil: 'Oil Slick', bullet: 'Bullet', shotgun: 'Shotgun', bomb: 'Bomb',
}

/** Relative odds for the item a pickup spot shows when it (re)appears. */
const ITEM_ODDS: Record<ItemId, number> = { nitro: 3, oil: 2, bullet: 3, shotgun: 2, bomb: 2 }

// Pickup rows across the lane, as fractions of a lap. The start grid and finish stay clear.
const PICKUP_ROWS = [0.13, 0.3, 0.47, 0.64, 0.82] as const
const PICKUP_LANES = [-50, 0, 50] as const
export const PICKUP_RADIUS = 15
export const PICKUP_RESPAWN = 4

export const NITRO_DURATION = 1.6
export const NITRO_KICK = 70

export const BULLET_SPEED = 560
export const BULLET_RADIUS = 2.5
export const BULLET_LIFE = 1.25
export const SHOTGUN_LIFE = 0.55
export const SHOTGUN_SPREAD = 0.2
const BULLET_SPIN = 0.85

export const OIL_RADIUS = 14
export const OIL_LIFE = 14
const OIL_SPIN = 0.8
const OIL_OWNER_GRACE = 1

export const BOMB_RADIUS = 8
export const BOMB_FUSE = 2.6
export const BOMB_ARM = 0.45
export const BLAST_RADIUS = 52
const BLAST_PUSH = 240
const BLAST_SPIN = 1.1

const DROP_BEHIND = 17
const MUZZLE = 15
const MAX_HAZARDS = 12

export interface PickupSpot extends Point {
  item: ItemId
  /** Seconds until the spot shows an item again; 0 while one is waiting on the track. */
  cooldown: number
}

export interface Bullet extends Point {
  vx: number
  vy: number
  life: number
  owner: Car
}

export interface OilSlick extends Point {
  kind: 'oil'
  life: number
  owner: Car
  ownerGrace: number
}

export interface Bomb extends Point {
  kind: 'bomb'
  fuse: number
  owner: Car
}

export type Hazard = OilSlick | Bomb

export interface ItemEffect extends Point {
  kind: 'blast' | 'hit' | 'fizzle'
  life: number
  duration: number
}

export type Random = () => number

export function rollItem(random: Random): ItemId {
  const total = itemIds.reduce((sum, id) => sum + ITEM_ODDS[id], 0)
  let roll = random() * total
  for (const id of itemIds) {
    roll -= ITEM_ODDS[id]
    if (roll < 0) return id
  }
  return itemIds[itemIds.length - 1]
}

export function pickupSpots(random: Random): PickupSpot[] {
  return PICKUP_ROWS.flatMap(fraction => PICKUP_LANES.map(lane => {
    const { x, y } = sampleRoute(fraction * ROUTE_LENGTH, lane)
    return { x, y, item: rollItem(random), cooldown: 0 }
  }))
}

function wheels(car: Car) {
  const x = Math.cos(car.heading)
  const y = Math.sin(car.heading)
  return WHEEL_CENTERS.map(offset => ({ x: car.position.x + x * offset, y: car.position.y + y * offset }))
}

function touchesCar(point: Point, radius: number, car: Car) {
  const reach = radius + car.radius
  return wheels(car).some(wheel => (wheel.x - point.x) ** 2 + (wheel.y - point.y) ** 2 < reach * reach)
}

function hitsSolid(body: Circle, solids: readonly Solid[]) {
  return body.x < 0 || body.y < 0 || body.x > TABLE_WIDTH || body.y > TABLE_HEIGHT || solids.some(solid => {
    const circle = 'radius' in solid
    const reach = body.radius + (circle ? solid.radius : solid.halfWidth + solid.halfLength)
    if (Math.abs(body.x - solid.x) > reach || Math.abs(body.y - solid.y) > reach) return false
    return Boolean(circle ? circleContact(body, solid) : boxContact(body, solid))
  })
}

/** Spin a car out. Returns false while it is still recovering from an earlier hit. */
export function strike(car: Car, spin: number, keepSpeed: number) {
  if (car.hitGrace > 0 || car.respawnBlink > 0) return false
  car.spinOut(spin)
  car.velocity.x *= keepSpeed
  car.velocity.y *= keepSpeed
  car.bump = Math.max(car.bump, 2)
  car.hitGrace = spin + 0.45
  return true
}

/**
 * Item pickups, held items, and everything they put on the table.
 * Each car holds at most one item. A car that already holds one drives straight over pickups.
 */
export class ItemSystem {
  readonly spots: PickupSpot[]
  bullets: Bullet[] = []
  hazards: Hazard[] = []
  effects: ItemEffect[] = []
  private readonly held = new Map<Car, ItemId>()
  private readonly heldTime = new Map<Car, number>()
  readonly hits = new Map<Car, number>()

  constructor(private readonly random: Random = Math.random) {
    this.spots = pickupSpots(random)
  }

  itemOf(car: Car): ItemId | null {
    return this.held.get(car) ?? null
  }

  heldFor(car: Car) {
    return this.heldTime.get(car) ?? 0
  }

  give(car: Car, item: ItemId | null) {
    if (item === null) {
      this.held.delete(car)
      this.heldTime.delete(car)
    } else {
      this.held.set(car, item)
      this.heldTime.set(car, 0)
    }
  }

  /** Circles the AI should steer around. */
  hazardSolids(): Circle[] {
    return this.hazards.map(hazard => ({
      x: hazard.x, y: hazard.y, radius: hazard.kind === 'oil' ? OIL_RADIUS : BOMB_RADIUS + 10,
    }))
  }

  /** Spots still showing an item, for AI drivers without one to aim at. */
  availableSpots(): PickupSpot[] {
    return this.spots.filter(spot => spot.cooldown === 0)
  }

  use(car: Car): ItemId | null {
    const item = this.itemOf(car)
    if (!item) return null
    this.give(car, null)
    const forward = { x: Math.cos(car.heading), y: Math.sin(car.heading) }
    const behind = { x: car.position.x - forward.x * DROP_BEHIND, y: car.position.y - forward.y * DROP_BEHIND }
    switch (item) {
      case 'nitro':
        car.nitro(NITRO_DURATION, NITRO_KICK)
        break
      case 'bullet':
        this.fire(car, 0, BULLET_LIFE)
        break
      case 'shotgun':
        for (const angle of [-SHOTGUN_SPREAD, 0, SHOTGUN_SPREAD]) this.fire(car, angle, SHOTGUN_LIFE)
        break
      case 'oil':
        this.drop({ kind: 'oil', ...behind, life: OIL_LIFE, owner: car, ownerGrace: OIL_OWNER_GRACE })
        break
      case 'bomb':
        this.drop({ kind: 'bomb', ...behind, fuse: BOMB_FUSE, owner: car })
        break
    }
    return item
  }

  private fire(car: Car, offset: number, life: number) {
    const heading = car.heading + offset
    const x = Math.cos(heading)
    const y = Math.sin(heading)
    // Bullets inherit the car's forward motion so they always outrun the shooter.
    const speed = BULLET_SPEED + Math.max(0, dot(car.velocity, { x: Math.cos(car.heading), y: Math.sin(car.heading) }))
    this.bullets.push({
      x: car.position.x + Math.cos(car.heading) * MUZZLE,
      y: car.position.y + Math.sin(car.heading) * MUZZLE,
      vx: x * speed, vy: y * speed, life, owner: car,
    })
  }

  private drop(hazard: Hazard) {
    this.hazards.push(hazard)
    if (this.hazards.length > MAX_HAZARDS) this.hazards.shift()
  }

  private effect(kind: ItemEffect['kind'], point: Point, duration: number) {
    this.effects.push({ kind, x: point.x, y: point.y, life: duration, duration })
  }

  private countHit(car: Car) {
    this.hits.set(car, (this.hits.get(car) ?? 0) + 1)
  }

  private explode(bomb: Bomb, cars: readonly Car[]) {
    this.effect('blast', bomb, 0.45)
    for (const car of cars) {
      const dx = car.position.x - bomb.x
      const dy = car.position.y - bomb.y
      const distance = Math.hypot(dx, dy)
      if (distance > BLAST_RADIUS || !strike(car, BLAST_SPIN, 0.3)) continue
      const push = BLAST_PUSH * (1 - 0.5 * distance / BLAST_RADIUS)
      const nx = distance > 1e-6 ? dx / distance : Math.cos(car.heading)
      const ny = distance > 1e-6 ? dy / distance : Math.sin(car.heading)
      car.velocity.x += nx * push
      car.velocity.y += ny * push
      car.bump = 3
      this.countHit(car)
    }
  }

  /** Advance one physics tick. `cars` are the cars still racing. */
  step(dt: number, cars: readonly Car[], solids: readonly Solid[]) {
    for (const [car, time] of this.heldTime) this.heldTime.set(car, time + dt)

    for (const spot of this.spots) {
      if (spot.cooldown > 0) {
        spot.cooldown = Math.max(0, spot.cooldown - dt)
        if (spot.cooldown === 0) spot.item = rollItem(this.random)
        continue
      }
      const taker = cars.find(car => !this.held.has(car) && car.respawnBlink === 0
        && touchesCar(spot, PICKUP_RADIUS - car.radius, car))
      if (!taker) continue
      this.give(taker, spot.item)
      spot.cooldown = PICKUP_RESPAWN
    }

    const bullets: Bullet[] = []
    for (const bullet of this.bullets) {
      bullet.x += bullet.vx * dt
      bullet.y += bullet.vy * dt
      bullet.life -= dt
      if (bullet.life <= 0) continue
      if (hitsSolid({ x: bullet.x, y: bullet.y, radius: BULLET_RADIUS }, solids)) {
        this.effect('fizzle', bullet, 0.2)
        continue
      }
      const bomb = this.hazards.find((hazard): hazard is Bomb => hazard.kind === 'bomb'
        && Math.hypot(hazard.x - bullet.x, hazard.y - bullet.y) < BOMB_RADIUS + BULLET_RADIUS)
      if (bomb) {
        bomb.fuse = 0
        continue
      }
      const target = cars.find(car => car !== bullet.owner && touchesCar(bullet, BULLET_RADIUS, car))
      if (target) {
        if (strike(target, BULLET_SPIN, 0.4)) this.countHit(target)
        this.effect('hit', bullet, 0.3)
        continue
      }
      bullets.push(bullet)
    }
    this.bullets = bullets

    const hazards: Hazard[] = []
    for (const hazard of this.hazards) {
      if (hazard.kind === 'oil') {
        hazard.life -= dt
        hazard.ownerGrace = Math.max(0, hazard.ownerGrace - dt)
        if (hazard.life <= 0) continue
        for (const car of cars) {
          if (car === hazard.owner && hazard.ownerGrace > 0) continue
          if (Math.hypot(car.position.x - hazard.x, car.position.y - hazard.y) >= OIL_RADIUS + car.radius * 0.5) continue
          if (strike(car, OIL_SPIN, 0.85)) this.countHit(car)
        }
        hazards.push(hazard)
        continue
      }
      hazard.fuse -= dt
      const armed = hazard.fuse <= BOMB_FUSE - BOMB_ARM
      if (hazard.fuse <= 0 || (armed && cars.some(car => touchesCar(hazard, BOMB_RADIUS, car)))) {
        this.explode(hazard, cars)
        continue
      }
      hazards.push(hazard)
    }
    this.hazards = hazards

    for (const effect of this.effects) effect.life -= dt
    this.effects = this.effects.filter(effect => effect.life > 0)
  }
}

function relative(car: Car, other: Car) {
  const dx = other.position.x - car.position.x
  const dy = other.position.y - car.position.y
  const c = Math.cos(car.heading)
  const s = Math.sin(car.heading)
  return { along: dx * c + dy * s, side: Math.abs(-dx * s + dy * c) }
}

/** True when the route runs nearly straight for the next stretch from `distance`. */
export function routeIsStraight(distance: number, length = 320) {
  const { forward } = sampleRoute(distance)
  for (let ahead = 80; ahead <= length; ahead += 80) {
    if (dot(forward, sampleRoute(distance + ahead).forward) < 0.95) return false
  }
  return true
}

export interface ItemSituation {
  item: ItemId
  car: Car
  traffic: readonly Car[]
  heldTime: number
  straight: boolean
}

/** Simple rules for AI drivers (and autopilot) deciding when to use their item. */
export function shouldUseItem({ item, car, traffic, heldTime, straight }: ItemSituation) {
  if (heldTime < 0.4 || car.spinTimer > 0 || car.respawnBlink > 0) return false
  const others = traffic.filter(other => other !== car).map(other => relative(car, other))
  switch (item) {
    case 'nitro':
      return (straight && car.speed > 0.8 * car.speedCap) || heldTime > 12
    case 'bullet':
      return others.some(({ along, side }) => along > 20 && along < 420 && side < 9 + along * 0.04) || heldTime > 10
    case 'shotgun':
      return others.some(({ along, side }) => along > 12 && along < 200 && side < 10 + along * clamp(SHOTGUN_SPREAD * 1.4, 0, 1))
        || heldTime > 10
    case 'oil':
    case 'bomb':
      return others.some(({ along, side }) => along < -18 && along > -170 && side < 34) || heldTime > 9
  }
}
