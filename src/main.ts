import './style.css'
import { Car } from './game/car'
import type { Controls } from './game/car'
import { BEST_LAP_KEY, Race, TOTAL_LAPS, readBestLap } from './game/race'
import { buildTrack, gates } from './game/track'
import { loadAssets } from './render/assets'
import { TireEffects } from './render/effects'
import { Hud, element } from './render/hud'
import { Scene } from './render/scene'
import { bakeTable } from './render/table'

interface RacerState {
  readonly x: number
  readonly y: number
  readonly heading: number
  readonly speed: number
  readonly lap: number
  readonly totalLaps: number
  readonly checkpoint: number
  readonly finished: boolean
  readonly collisions: number
  readonly lapTimesMs: readonly number[]
  readonly bestLapMs: number | null
}

declare global {
  interface Window {
    readonly __RACER_STATE__: RacerState
  }
}

const drivingKeys = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'ShiftLeft', 'ShiftRight'])
const stepSeconds = 1 / 120

async function start() {
  const [assets, table] = await Promise.all([loadAssets(), bakeTable()])
  const { props, solids } = buildTrack(assets)
  const scene = new Scene(element<HTMLCanvasElement>('race'), table, assets, props)
  const hud = new Hud()
  let bestLap: number | null = null
  try { bestLap = readBestLap(localStorage) } catch { /* Storage can be disabled. */ }
  let race = new Race(gates, bestLap)
  let car = new Car(assets.car)
  let effects = new TireEffects()
  let active = false
  const keys = new Set<string>()

  function restart() {
    car = new Car(assets.car)
    race = new Race(gates, bestLap)
    effects = new TireEffects()
    active = false
    keys.clear()
    scene.resetCamera()
  }

  window.addEventListener('keydown', event => {
    if (event.code === 'KeyR' && !event.repeat) restart()
    if (!drivingKeys.has(event.code) || event.ctrlKey || event.metaKey || event.altKey) return
    if (event.code === 'Space' && event.target instanceof HTMLButtonElement) return
    event.preventDefault()
    keys.add(event.code)
  })
  window.addEventListener('keyup', event => keys.delete(event.code))
  window.addEventListener('blur', () => keys.clear())
  element('restart').addEventListener('click', restart)

  Object.defineProperty(window, '__RACER_STATE__', {
    enumerable: true,
    get: (): RacerState => Object.freeze({
      ...car.position, heading: car.heading, speed: car.speed, lap: race.lap,
      totalLaps: TOTAL_LAPS, checkpoint: race.checkpoint, finished: race.finished,
      collisions: car.collisions, lapTimesMs: Object.freeze([...race.lapTimesMs]),
      bestLapMs: race.bestLapMs,
    }),
  })

  const pressed = (...codes: string[]) => Number(codes.some(code => keys.has(code)))
  function step(controls: Controls) {
    active ||= controls.throttle !== 0
    if (!active || race.finished) return
    const from = { ...car.position }
    car.step(stepSeconds, controls, solids)
    race.step(from, car.position, stepSeconds * 1000)
    effects.step(car, stepSeconds)
    if (race.bestLapMs !== bestLap) {
      bestLap = race.bestLapMs
      try { localStorage.setItem(BEST_LAP_KEY, String(bestLap)) } catch { /* Keep the session record. */ }
    }
  }

  let previous = performance.now()
  let accumulator = 0
  function frame(now: number) {
    const dt = Math.min(0.1, Math.max(0, (now - previous) / 1000))
    previous = now
    accumulator += dt
    const controls: Controls = {
      throttle: pressed('ArrowUp', 'KeyW') - pressed('ArrowDown', 'KeyS'),
      steer: pressed('ArrowRight', 'KeyD') - pressed('ArrowLeft', 'KeyA'),
      handbrake: Boolean(pressed('Space', 'ShiftLeft', 'ShiftRight')),
    }
    while (accumulator >= stepSeconds) {
      step(controls)
      accumulator -= stepSeconds
    }
    scene.draw(car, effects, dt)
    hud.draw(car, race)
    requestAnimationFrame(frame)
  }

  element('load').hidden = true
  requestAnimationFrame(frame)
}

start().catch(error => {
  element('load').textContent = `Could not load the circuit. ${error instanceof Error ? error.message : String(error)}`
  console.error(error)
})
