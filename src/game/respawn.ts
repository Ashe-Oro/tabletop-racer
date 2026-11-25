import type { Car } from './car'
import { CAR_LENGTH } from './cars'
import type { Point } from './geometry'
import type { Race } from './race'
import { route, TABLE_HEIGHT, TABLE_WIDTH } from './track'

const EDGE = 80
const MAX_ROUTE_DISTANCE = 280
const CLEARANCE = CAR_LENGTH + 2
const TIMER_EPSILON = 1e-9

function isOffTrack({ x, y }: Point) {
  return x < EDGE || x > TABLE_WIDTH - EDGE || y < EDGE || y > TABLE_HEIGHT - EDGE
    || !route.some(point => (point.x - x) ** 2 + (point.y - y) ** 2 <= MAX_ROUTE_DISTANCE ** 2)
}

export class Respawn {
  count = 0
  private offTrackTime = 0
  private stalledTime = 0

  constructor(private readonly car: Car, private readonly race: Race) {}

  shouldRespawn(dt: number, throttleApplied: boolean) {
    this.offTrackTime = isOffTrack(this.car.position) ? this.offTrackTime + dt : 0
    this.stalledTime = throttleApplied && this.car.speed < 18 ? this.stalledTime + dt : 0
    return this.offTrackTime >= 2 - TIMER_EPSILON || this.stalledTime >= 2.5 - TIMER_EPSILON
  }

  toGate(traffic: readonly Car[]) {
    const { x, y, forward } = this.race.gates[this.race.checkpoint]
    let position = { x, y }
    const occupied = () => traffic.some(other => other !== this.car
      && Math.hypot(other.position.x - position.x, other.position.y - position.y) < CLEARANCE)
    // Try the gate center first, then alternating lanes on either side.
    for (let lane = 1; occupied(); lane++) {
      const offset = Math.ceil(lane / 2) * (CLEARANCE + 1) * (lane % 2 ? 1 : -1)
      position = { x: x - forward.y * offset, y: y + forward.x * offset }
    }
    this.car.respawn(position, Math.atan2(forward.y, forward.x))
    this.offTrackTime = this.stalledTime = 0
    this.count++
  }
}
