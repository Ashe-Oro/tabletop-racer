import { boxContact, circleContact, resolveContact, tableContacts } from './collision'
import type { Solid } from './collision'
import { clamp, dot } from './geometry'
import type { Footprint, Point } from './geometry'
import { spawn, TABLE_HEIGHT, TABLE_WIDTH } from './track'

export interface Controls {
  throttle: number
  steer: number
  handbrake: boolean
}

export class Car {
  position = { x: spawn.x, y: spawn.y }
  velocity: Point = { x: 0, y: 0 }
  heading = spawn.heading
  bump = 0
  collisions = 0
  slip = 0
  drifting = false
  private contactCooldown = 0
  readonly axle: number
  readonly radius: number
  private readonly wheelCenters: number[]

  constructor(footprint: Footprint) {
    this.axle = footprint.sliceHeight * (5 / 18)
    this.radius = footprint.sliceWidth * 0.4
    this.wheelCenters = [-this.axle, 0, this.axle]
  }

  get speed() { return Math.hypot(this.velocity.x, this.velocity.y) }

  step(dt: number, controls: Controls, solids: readonly Solid[]) {
    this.bump = Math.max(0, this.bump - 25 * dt)
    this.contactCooldown = Math.max(0, this.contactCooldown - dt)
    const forward = { x: Math.cos(this.heading), y: Math.sin(this.heading) }
    const along = dot(this.velocity, forward)
    const steering = clamp(Math.abs(along) / 82, 0, 1) * (1 - 0.31 * clamp(Math.abs(along) / 360, 0, 1))
    this.heading += controls.steer * steering * (controls.handbrake ? 4.7 : 3.6) * Math.sign(along) * dt

    forward.x = Math.cos(this.heading)
    forward.y = Math.sin(this.heading)
    const right = { x: -forward.y, y: forward.x }
    let longitudinal = dot(this.velocity, forward)
    let lateral = dot(this.velocity, right)
    const braking = controls.throttle * longitudinal < 0
    const acceleration = braking ? 810 : controls.throttle < 0 ? 290 : 535
    longitudinal += controls.throttle * acceleration * dt
    longitudinal *= Math.exp(-(controls.handbrake ? 1.19 : controls.throttle ? 0.83 : 2.15) * dt)
    longitudinal = clamp(longitudinal, -135, 365)
    const cornering = Math.abs(controls.steer) * clamp(Math.abs(longitudinal) / 365, 0, 1)
    const grip = controls.handbrake ? 1.5 : 10.4 - 6.35 * cornering
    lateral *= Math.exp(-grip * dt)
    this.slip = lateral
    this.drifting = Math.abs(lateral) > 24 && Math.abs(longitudinal) > 48
    this.velocity.x = forward.x * longitudinal + right.x * lateral
    this.velocity.y = forward.y * longitudinal + right.y * lateral
    this.position.x += this.velocity.x * dt
    this.position.y += this.velocity.y * dt

    let impact = 0
    for (let pass = 0; pass < 2; pass++) {
      for (const offset of this.wheelCenters) {
        const body = {
          x: this.position.x + offset * forward.x,
          y: this.position.y + offset * forward.y,
          radius: this.radius,
        }
        for (const solid of solids) {
          const circle = 'radius' in solid
          const reach = body.radius + (circle ? solid.radius : solid.halfWidth + solid.halfLength)
          if (Math.abs(body.x - solid.x) > reach || Math.abs(body.y - solid.y) > reach) continue
          const contact = circle ? circleContact(body, solid) : boxContact(body, solid)
          if (!contact) continue
          impact = Math.max(impact, resolveContact(this.position, this.velocity, contact))
          body.x = this.position.x + offset * forward.x
          body.y = this.position.y + offset * forward.y
        }
        for (const contact of tableContacts(body, TABLE_WIDTH, TABLE_HEIGHT)) {
          impact = Math.max(impact, resolveContact(this.position, this.velocity, contact))
        }
      }
    }
    if (impact > 12) {
      if (!this.contactCooldown) this.collisions++
      this.contactCooldown = 0.14
      this.bump = Math.max(this.bump, clamp(impact * 0.03, 1, 5))
    }
  }
}
