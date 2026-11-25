import './style.css'
import { RivalController } from './game/ai'
import { Car } from './game/car'
import type { Controls } from './game/car'
import { cars } from './game/cars'
import { resolveCarCollisions } from './game/collision'
import { BEST_LAP_KEY, COUNTDOWN_BEAT, Race, TOTAL_LAPS, raceCountdown, raceProgress, rankRacers, readBestLap } from './game/race'
import type { Countdown, RaceMode } from './game/race'
import { ROUTE_LENGTH, buildTrack, gates, gridSlot, progressWithinCheckpoint, projectRoute } from './game/track'
import { loadAssets } from './render/assets'
import { TireEffects } from './render/effects'
import { Hud, element } from './render/hud'
import { Scene } from './render/scene'
import { loadTable } from './render/table'
import { buildVersion } from './version'

interface Racer {
  car: Car
  race: Race
  effects: TireEffects
  distance: number
  progress: number
  controller?: RivalController
}

function snapshot({ car, race }: Racer) {
  return Object.freeze({
    ...car.position, heading: car.heading, speed: car.speed, lap: race.lap,
    vx: car.velocity.x, vy: car.velocity.y, drifting: car.drifting,
    carId: car.spec.id, carName: car.spec.name, color: car.spec.color,
    totalLaps: TOTAL_LAPS, checkpoint: race.checkpoint, finished: race.finished,
    collisions: car.collisions, lapTimesMs: Object.freeze([...race.lapTimesMs]),
    bestLapMs: race.bestLapMs, elapsedMs: race.elapsedMs, finishTimeMs: race.finishTimeMs,
  })
}

interface RacerState extends ReturnType<typeof snapshot> {
  readonly scale: number
  readonly overview: boolean
  readonly mode: RaceMode
  readonly countdown: Countdown
  readonly position: number | null
  readonly rivals: readonly ReturnType<typeof snapshot>[]
  readonly standings: readonly ReturnType<typeof standing>[]
}

function standing(racer: Racer, index: number) {
  const { id, name, color } = racer.car.spec
  return Object.freeze({
    id, name, color,
    position: index + 1,
    finishTimeMs: racer.race.finishTimeMs,
  })
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
  const [assets, table] = await Promise.all([loadAssets(), loadTable()])
  const { props, solids } = buildTrack(assets)
  const scene = new Scene(element<HTMLCanvasElement>('race'), table, assets, props)
  const hud = new Hud()
  element('version').textContent = buildVersion
  let bestLap: number | null = null
  try { bestLap = readBestLap(localStorage) } catch { /* Storage can be disabled. */ }

  const keys = new Set<string>()
  let carIndex = 0
  let mode: RaceMode = 'race'
  let player: Racer
  let racers: Racer[]
  let ranks: Racer[]
  let active = false
  let countdownElapsed = 0
  let overview = new URLSearchParams(location.search).get('overview') === '1'

  const overviewButton = element<HTMLButtonElement>('overview')
  const modeButtons = { race: element('mode-race'), 'time-trial': element('mode-time-trial') }
  const carName = element('car-name')
  const carAccel = element('car-accel')
  const carWeight = element('car-weight')
  const carHandling = element('car-handling')
  const carButtons = cars.map(({ name, color }, index) => {
    const button = document.createElement('button')
    button.type = 'button'
    button.textContent = String(index + 1)
    button.setAttribute('aria-label', name)
    button.title = name
    button.style.setProperty('--car-color', color)
    button.addEventListener('click', () => selectCar(index))
    element('car-select').append(button)
    return button
  })

  function selectCar(index: number) {
    if (index === carIndex) return
    carIndex = index
    updateGarage()
    if (mode === 'race') {
      if (active) restart()
      else assignCars()
    } else {
      player.car.spec = cars[carIndex]
    }
  }

  function updateGarage() {
    const { name, accelerationTime, mass, handling } = cars[carIndex]
    carName.textContent = name
    carAccel.textContent = `${accelerationTime.toFixed(2)} s`
    carWeight.textContent = `${mass.toFixed(2)}×`
    carHandling.textContent = `${handling.toFixed(2)}×`
    carButtons.forEach((button, i) => button.setAttribute('aria-pressed', String(carIndex === i)))
  }

  function setOverview(enabled: boolean) {
    overview = enabled
    overviewButton.setAttribute('aria-pressed', String(enabled))
  }

  function updateProgress(racer: Racer) {
    racer.distance = projectRoute(racer.car.position)
    racer.progress = progressWithinCheckpoint(racer.car.position, racer.race.checkpoint, racer.distance)
  }

  function createRacer(slot: number, controller?: RivalController): Racer {
    const car = new Car()
    if (mode === 'race') {
      const { heading, ...position } = gridSlot(slot)
      car.position = position
      car.heading = heading
    }
    const racer = {
      car, controller, race: new Race(gates, controller ? null : bestLap),
      effects: new TireEffects(), distance: 0, progress: 0,
    }
    updateProgress(racer)
    return racer
  }

  function assignCars() {
    player.car.spec = cars[carIndex]
    const rivalSpecs = cars.filter((_, index) => index !== carIndex)
    racers.slice(1).forEach(({ car }, i) => { car.spec = rivalSpecs[i] })
  }

  function restart() {
    player = createRacer(2)
    racers = [player]
    if (mode === 'race') {
      for (const [index, slot] of [0, 1, 3].entries()) {
        racers.push(createRacer(slot, new RivalController(index)))
      }
    }
    assignCars()
    ranks = rankRacers(racers)
    active = false
    countdownElapsed = 0
    keys.clear()
    scene.resetCamera(player.car)
  }

  updateGarage()
  restart()
  setOverview(overview)
  overviewButton.addEventListener('click', () => setOverview(!overview))
  for (const entry of ['race', 'time-trial'] as const) {
    modeButtons[entry].addEventListener('click', () => {
      if (mode === entry) return
      mode = entry
      for (const [choice, button] of Object.entries(modeButtons)) {
        button.setAttribute('aria-pressed', String(mode === choice))
      }
      restart()
    })
  }

  window.addEventListener('keydown', event => {
    if (event.ctrlKey || event.metaKey || event.altKey) return
    if (!event.repeat) {
      const selected = /^Digit([1-4])$/.exec(event.code)
      if (selected) selectCar(Number(selected[1]) - 1)
      if (event.code === 'KeyC') selectCar((carIndex + 1) % cars.length)
      if (event.code === 'KeyR') restart()
    }
    if (!drivingKeys.has(event.code)) return
    if (event.code === 'Space' && !active && event.target instanceof HTMLButtonElement) return
    event.preventDefault()
    keys.add(event.code)
  })
  window.addEventListener('keyup', event => keys.delete(event.code))
  window.addEventListener('blur', () => keys.clear())
  element('restart').addEventListener('click', restart)
  element('race-again').addEventListener('click', restart)

  const countdown = () => mode === 'race' ? raceCountdown(countdownElapsed) : null
  const position = () => mode === 'race' ? ranks.indexOf(player) + 1 : null

  Object.defineProperty(window, '__RACER_STATE__', {
    enumerable: true,
    get: (): RacerState => Object.freeze({
      ...snapshot(player), scale: scene.scale, overview, mode, countdown: countdown(), position: position(),
      rivals: Object.freeze(racers.slice(1).map(snapshot)),
      standings: Object.freeze(mode === 'race' ? ranks.map(standing) : []),
    }),
  })

  const pressed = (...codes: string[]) => Number(codes.some(code => keys.has(code)))
  function step(controls: Controls) {
    if (mode === 'race') {
      countdownElapsed = Math.min(4 * COUNTDOWN_BEAT, countdownElapsed + stepSeconds)
      active = countdownElapsed >= 3 * COUNTDOWN_BEAT
    } else {
      active ||= controls.throttle !== 0
    }
    if (!active) return

    const running = racers.filter(racer => !racer.race.finished)
    const traffic = running.map(racer => racer.car)
    const playerProgress = raceProgress(player, ROUTE_LENGTH)
    // Plan from the same snapshot before moving any cars.
    const inputs = running.map(racer => racer.controller
      ? racer.controller.controls(racer.car, racer.distance, stepSeconds, solids, traffic,
        playerProgress - raceProgress(racer, ROUTE_LENGTH))
      : controls)
    const previous = traffic.map(car => ({ ...car.position }))
    running.forEach(({ car }, i) => car.step(stepSeconds, inputs[i], solids))
    resolveCarCollisions(traffic)
    running.forEach((racer, i) => {
      const { car, race } = racer
      race.step(previous[i], car.position, stepSeconds * 1000)
      updateProgress(racer)
      if (race.finished) {
        car.velocity = { x: 0, y: 0 }
        car.drifting = false
        car.bump = 0
      }
    })
    for (const { car, effects } of racers) effects.step(car, stepSeconds)
    ranks = rankRacers(racers)

    if (player.race.bestLapMs !== bestLap) {
      bestLap = player.race.bestLapMs
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
    scene.draw(racers, dt, overview)
    hud.draw(racers, ranks, countdown(), position())
    requestAnimationFrame(frame)
  }

  element('load').hidden = true
  requestAnimationFrame(frame)
}

start().catch(error => {
  element('load').textContent = `Could not load the circuit. ${error instanceof Error ? error.message : String(error)}`
  console.error(error)
})
