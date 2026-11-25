import { boxContact, circleContact, resolveContact, tableContacts } from './collision'
import type { Solid } from './collision'
import { clamp, dot } from './geometry'
import type { Point } from './geometry'
import { spawn, TABLE_HEIGHT, TABLE_WIDTH } from './track'
import { CAR_AXLE, CAR_RADIUS } from './cars'

const TOP_SPEED = 270
const STEERING_DEADBAND = 8
const FULL_STEERING_SPEED = 60
const LOW_SPEED_STEERING = 0.04
const CONTACT_STEERING = 1.7
const CONTACT_STEERING_GRACE = 0.06
const WHEEL_CENTERS = [-CAR_AXLE, 0, CAR_AXLE]

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
  private contactSteeringTime = 0
  readonly axle = CAR_AXLE
  readonly radius = CAR_RADIUS

  get speed() { return Math.hypot(this.velocity.x, this.velocity.y) }

  step(dt: number, controls: Controls, solids: readonly Solid[]) {
    this.bump = Math.max(0, this.bump - 14 * dt)
    this.contactCooldown = Math.max(0, this.contactCooldown - dt)
    this.contactSteeringTime = Math.max(0, this.contactSteeringTime - dt)
    const forward = { x: Math.cos(this.heading), y: Math.sin(this.heading) }
    const along = dot(this.velocity, forward)
    const speedRatio = clamp(Math.abs(along) / TOP_SPEED, 0, 1)
    // Use the requested direction when low-speed rebounds make velocity unreliable.
    const steerSpeed = along - clamp(along, -STEERING_DEADBAND, STEERING_DEADBAND)
    const steering = (steerSpeed === 0
      ? Math.sign(controls.throttle) * (this.contactSteeringTime > 0 ? CONTACT_STEERING : LOW_SPEED_STEERING)
      : clamp(steerSpeed / (FULL_STEERING_SPEED - STEERING_DEADBAND), -1, 1)) * (1 - 0.31 * speedRatio)
    this.heading += controls.steer * steering * (controls.handbrake ? 4.8 : 3.6) * dt

    forward.x = Math.cos(this.heading)
    forward.y = Math.sin(this.heading)
    const right = { x: -forward.y, y: forward.x }
    let longitudinal = dot(this.velocity, forward)
    let lateral = dot(this.velocity, right)
    const braking = controls.throttle * longitudinal < 0
    const acceleration = braking ? 685 : controls.throttle < 0 ? 255 : 470
    longitudinal += controls.throttle * acceleration * dt
    longitudinal *= Math.exp(-(controls.handbrake ? 1.6 : controls.throttle ? 0.9 : 2.35) * dt)
    longitudinal = clamp(longitudinal, -95, TOP_SPEED)
    const cornering = Math.abs(controls.steer) * speedRatio
    const grip = controls.handbrake ? 1.8 : 16 - 3 * cornering
    lateral *= Math.exp(-grip * dt)
    this.slip = lateral
    this.drifting = Math.abs(lateral) > 21 && Math.abs(longitudinal) > 38
    this.velocity.x = forward.x * longitudinal + right.x * lateral
    this.velocity.y = forward.y * longitudinal + right.y * lateral
    this.position.x += this.velocity.x * dt
    this.position.y += this.velocity.y * dt

    let impact = 0
    for (let pass = 0; pass < 2; pass++) {
      for (const offset of WHEEL_CENTERS) {
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
    // Keep pivot authority through the brief gaps between rebounds.
    if (impact > 0) this.contactSteeringTime = CONTACT_STEERING_GRACE
    if (impact > 12) {
      if (!this.contactCooldown) this.collisions++
      this.contactCooldown = 0.14
      this.bump = Math.max(this.bump, clamp(impact * 0.02, 1, 3))
    }
  }
}
