import type { Car, Controls } from './car'
import { boxContact, circleContact } from './collision'
import type { Solid } from './collision'
import { clamp, delta, dot } from './geometry'
import { ROUTE_LENGTH, sampleRoute } from './track'

const personalities = [
  { lane: -23, pace: 251, lookahead: 0.24 },
  { lane: 24, pace: 263, lookahead: 0.28 },
  { lane: 1, pace: 257, lookahead: 0.26 },
] as const

function angleBetween(a: number, b: number) {
  return Math.atan2(Math.sin(a - b), Math.cos(a - b))
}

export function rubberBandScale(gap: number) {
  return 1 + (gap > 0 ? clamp((gap - 45) / 650, 0, 0.08) : clamp((gap + 80) / 850, -0.06, 0))
}

export class RivalController {
  private readonly style: typeof personalities[number]
  private lastDistance: number | undefined
  private stalled = 0
  private recovery = 0
  private recoverySteer = 1
  private lane: number
  private targetLane: number
  private planTimer = 0

  constructor(index: number, private readonly rubberBand = true) {
    this.style = personalities[index % personalities.length]
    this.lane = this.targetLane = this.style.lane
  }

  resetRecovery() {
    this.lastDistance = undefined
    this.stalled = this.recovery = this.planTimer = 0
    this.recoverySteer = 1
  }

  controls(car: Car, distance: number, dt: number, solids: readonly Solid[], traffic: readonly Car[], gap = 0): Controls {
    const moved = this.lastDistance === undefined ? 0
      : distance - this.lastDistance - Math.round((distance - this.lastDistance) / ROUTE_LENGTH) * ROUTE_LENGTH
    this.lastDistance = distance
    const tangent = sampleRoute(distance)
    const side = dot(delta(car.position, tangent), { x: -tangent.forward.y, y: tangent.forward.x })
    const trackHeading = Math.atan2(tangent.forward.y, tangent.forward.x)

    if (this.recovery <= 0) {
      this.stalled = moved > 18 * dt ? Math.max(0, this.stalled - 3 * dt) : this.stalled + dt
      if (this.stalled >= 0.9) {
        this.recovery = 0.65
        this.stalled = 0
        // Reverse with the nose turning toward the clearer lane.
        this.recoverySteer = -Math.sign(this.targetLane - side || angleBetween(trackHeading, car.heading) || this.style.lane)
        this.planTimer = 0
      }
    }
    if (this.recovery > 0) {
      this.recovery -= dt
      return { throttle: -1, steer: this.recoverySteer, handbrake: false }
    }

    const paceScale = this.rubberBand ? rubberBandScale(gap) : 1
    car.speedScale = Math.min(1, paceScale)
    if (paceScale > 1) car.setBoost(paceScale, 0.1)

    const speed = car.speed
    const lookahead = 36 + speed * this.style.lookahead
    this.planTimer -= dt
    if (this.planTimer <= 0) {
      this.targetLane = this.chooseLane(car, distance, side, solids, traffic)
      this.planTimer = 0.09
    }
    this.lane += clamp(this.targetLane - this.lane, -175 * dt, 175 * dt)

    const target = sampleRoute(distance + lookahead, this.lane)
    const desired = Math.atan2(target.y - car.position.y, target.x - car.position.x)
    const error = angleBetween(desired, car.heading)
    let targetSpeed = this.style.pace * paceScale
    let previous = tangent.forward
    // Probe successive short arcs and leave braking distance for sharper turns.
    for (let ahead = 30; ahead <= 150; ahead += 30) {
      const { forward } = sampleRoute(distance + ahead, this.lane)
      const turn = Math.acos(clamp(dot(forward, previous), -1, 1))
      const cornerSpeed = clamp(300 - turn * 630, 92, 300)
      targetSpeed = Math.min(targetSpeed, Math.sqrt(cornerSpeed ** 2 + 2 * 350 * (ahead - 30)))
      previous = forward
    }
    targetSpeed = Math.min(targetSpeed, clamp(305 - Math.abs(error) * 190, 65, 305))

    const along = dot(car.velocity, { x: Math.cos(car.heading), y: Math.sin(car.heading) })
    return {
      throttle: clamp((targetSpeed - along) / 38 + 0.49, along > 45 ? -1 : 0, 1),
      steer: clamp(error * 3.1, -1, 1),
      handbrake: Math.abs(error) > 0.53 && along > 135,
    }
  }

  private chooseLane(car: Car, distance: number, side: number, solids: readonly Solid[], traffic: readonly Car[]) {
    const horizon = 85 + car.speed * 0.32
    const nearbySolids = solids.filter(solid => {
      const reach = horizon + 95 + ('radius' in solid ? solid.radius : Math.hypot(solid.halfWidth, solid.halfLength))
      return Math.abs(solid.x - car.position.x) < reach && Math.abs(solid.y - car.position.y) < reach
    })
    const nearbyCars = traffic.filter(other => other !== car
      && Math.hypot(other.position.x - car.position.x, other.position.y - car.position.y) < horizon + 35)
    let bestLane = this.targetLane
    let bestCost = Infinity
    for (const lane of [this.targetLane, this.style.lane, -79, -50, 0, 50, 79]) {
      let cost = Math.abs(lane - this.style.lane) * 0.12 + Math.abs(lane - this.targetLane) * 0.13
      for (let ahead = 18; ahead <= horizon; ahead += 14) {
        const blend = clamp(ahead / (43 + car.speed * 0.19), 0, 1)
        const point = sampleRoute(distance + ahead, side + (lane - side) * blend)
        const probe = { ...point, radius: car.radius + 8 }
        for (const solid of nearbySolids) {
          const contact = 'radius' in solid ? circleContact(probe, solid) : boxContact(probe, solid)
          if (contact) cost += (16 + contact.depth * 3) * (1 - ahead / (2 * horizon))
        }
        const time = Math.min(0.5, ahead / Math.max(110, car.speed))
        for (const other of nearbyCars) {
          const x = other.position.x + other.velocity.x * time
          const y = other.position.y + other.velocity.y * time
          const clearance = Math.hypot(point.x - x, point.y - y)
          if (clearance < 28) cost += (28 - clearance) * 1.4
        }
      }
      if (cost >= bestCost) continue
      bestCost = cost
      bestLane = lane
    }
    return bestLane
  }
}

