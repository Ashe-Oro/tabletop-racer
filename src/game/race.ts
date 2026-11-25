import { delta, dot } from './geometry'
import type { Point } from './geometry'

export const TOTAL_LAPS = 3
export const BEST_LAP_KEY = 'tabletop_racer_picnic_best_lap_ms'

export interface Gate extends Point {
  forward: Point
  halfWidth: number
}

export function gateCrossing(from: Point, to: Point, gate: Gate): -1 | 0 | 1 {
  const before = dot(delta(from, gate), gate.forward)
  const after = dot(delta(to, gate), gate.forward)
  const forward = before < 0 && after >= 0
  const backward = before >= 0 && after < 0
  if (!forward && !backward) return 0
  const t = before / (before - after)
  const x = from.x + (to.x - from.x) * t - gate.x
  const y = from.y + (to.y - from.y) * t - gate.y
  const offset = -x * gate.forward.y + y * gate.forward.x
  return Math.abs(offset) <= gate.halfWidth ? (forward ? 1 : -1) : 0
}

export class Race {
  readonly lapTimesMs: number[] = []
  bestLapMs: number | null
  checkpoint = 0
  elapsedMs = 0
  private lapStartMs = 0

  constructor(readonly gates: readonly Gate[], bestLapMs: number | null) {
    this.bestLapMs = bestLapMs
  }

  get lap() { return Math.min(this.lapTimesMs.length + 1, TOTAL_LAPS) }
  get finished() { return this.lapTimesMs.length === TOTAL_LAPS }
  get lapElapsedMs() {
    return this.finished ? this.lapTimesMs[TOTAL_LAPS - 1] : Math.round(this.elapsedMs - this.lapStartMs)
  }

  step(from: Point, to: Point, dtMs: number) {
    if (this.finished) return
    this.elapsedMs += dtMs
    const finish = gateCrossing(from, to, this.gates[0])
    if (finish) {
      if (finish === 1 && this.checkpoint === this.gates.length - 1) {
        const time = this.lapElapsedMs
        this.lapTimesMs.push(time)
        this.bestLapMs = Math.min(this.bestLapMs ?? Infinity, time)
        this.lapStartMs = this.elapsedMs
      }
      this.checkpoint = 0
      return
    }
    if (this.checkpoint > 0 && gateCrossing(from, to, this.gates[this.checkpoint]) === -1) {
      this.checkpoint--
    } else if (this.checkpoint + 1 < this.gates.length &&
               gateCrossing(from, to, this.gates[this.checkpoint + 1]) === 1) {
      this.checkpoint++
    }
  }
}

export function readBestLap(storage: Pick<Storage, 'getItem'>): number | null {
  const ms = Number(storage.getItem(BEST_LAP_KEY))
  return Number.isSafeInteger(ms) && ms > 0 ? ms : null
}
