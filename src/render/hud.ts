import type { Car } from '../game/car'
import { clamp } from '../game/geometry'
import type { Countdown, Race } from '../game/race'
import { TABLE_HEIGHT, TABLE_WIDTH, gates, route } from '../game/track'
import { makeCanvas } from './assets'
import { paintCountdown } from './countdown'
import { paintItemIcon } from './items'
import { ITEM_NAMES } from '../game/items'
import type { ItemId } from '../game/items'
import { drawHeadingMarker, spreadMarkers } from './marker'

interface HudRacer {
  car: Car
  race: Race
}

const place = ['1st', '2nd', '3rd', '4th']
const TACH_SEGMENTS = 10

export function element<T extends HTMLElement>(id: string): T {
  const item = document.getElementById(id)
  if (!item) throw new Error(`Missing page element "${id}"`)
  return item as T
}

export function formatTime(ms: number | null | undefined) {
  if (ms == null) return '—'
  const whole = Math.round(ms)
  const minutes = Math.floor(whole / 60_000)
  const seconds = String(Math.floor(whole / 1000) % 60).padStart(2, '0')
  return `${minutes}:${seconds}.${String(whole % 1000).padStart(3, '0')}`
}

function show(target: HTMLElement, text: string) {
  if (target.textContent !== text) target.textContent = text
}

export class Hud {
  private readonly lap = element('lap').firstChild!
  private readonly position = element('position')
  private readonly countdown = element('countdown')
  private readonly countdownContext = element<HTMLCanvasElement>('countdown-glyph').getContext('2d')!
  private shownCountdown: Countdown = null
  private readonly time = element('time')
  private readonly best = element('best')
  private readonly speed = element('speed')
  private readonly gear = element('gear')
  private readonly tach = element('tach')
  private shownSegments = 0
  private readonly itemCell = element('item-cell')
  private readonly itemName = element('item-name')
  private readonly itemIcon = element<HTMLCanvasElement>('item-icon').getContext('2d')!
  private shownItem: ItemId | null | undefined | 'unset' = 'unset'
  private readonly splits: HTMLOutputElement[]
  private readonly gates = element('gates')
  private readonly finish = element('finish')
  private readonly finishTotal = element('finish-total')
  private readonly finishBest = element('finish-best')
  private readonly standings = element('standings')
  private readonly mapKey = element('map-player')
  private readonly map = element<HTMLCanvasElement>('map')
  private readonly mapContext = this.map.getContext('2d')!
  private readonly mapBase = makeCanvas(this.map.width, this.map.height)
  private readonly mapScale = Math.min((this.map.width - 16) / TABLE_WIDTH, (this.map.height - 16) / TABLE_HEIGHT)
  private readonly mx = (x: number) => this.map.width / 2 + (x - TABLE_WIDTH / 2) * this.mapScale
  private readonly my = (y: number) => this.map.height / 2 + (y - TABLE_HEIGHT / 2) * this.mapScale

  constructor(totalLaps: number, autopilot: boolean) {
    element('autopilot').hidden = !autopilot
    show(element('lap-total'), `/ 0${totalLaps}`)
    const splits = element('lap-splits')
    this.splits = Array.from({ length: totalLaps }, (_, i) => {
      const row = document.createElement('li')
      const label = document.createElement('span')
      label.textContent = `Lap 0${i + 1}`
      const time = document.createElement('output')
      time.id = `split-${i + 1}`
      row.append(label, time)
      splits.append(row)
      return time
    })
    for (let i = 0; i < TACH_SEGMENTS; i++) this.tach.append(document.createElement('span'))
    for (const label of place) {
      const row = document.createElement('li')
      const position = document.createElement('strong')
      position.textContent = label
      const swatch = document.createElement('i')
      const name = document.createElement('span')
      const time = document.createElement('span')
      time.className = 'standing-time'
      row.append(position, swatch, name, time)
      this.standings.append(row)
    }
    const { ctx, canvas } = this.mapBase
    ctx.fillStyle = '#1a1210'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#30241f'
    ctx.fillRect(this.mx(0), this.my(0), TABLE_WIDTH * this.mapScale, TABLE_HEIGHT * this.mapScale)
    ctx.beginPath()
    ctx.moveTo(this.mx(route[0].x), this.my(route[0].y))
    for (const p of route) ctx.lineTo(this.mx(p.x), this.my(p.y))
    ctx.closePath()
    ctx.strokeStyle = '#315451'
    ctx.lineWidth = 5
    ctx.stroke()
    ctx.strokeStyle = '#c9c2b4'
    ctx.lineWidth = 2
    ctx.stroke()
    const start = gates[0]
    ctx.translate(this.mx(start.x), this.my(start.y))
    ctx.rotate(Math.atan2(start.forward.y, start.forward.x))
    ctx.fillStyle = '#f4f0e6'
    ctx.fillRect(-1, -5, 2, 10)
  }

  /** `item` is the player's held item, or undefined when items are switched off. */
  draw(racers: readonly HudRacer[], ranks: readonly HudRacer[], countdown: Countdown, position: number | null,
    item?: ItemId | null) {
    const { car, race } = racers[0]
    if (item !== this.shownItem) {
      this.shownItem = item
      paintItemIcon(this.itemIcon, item ?? null)
      show(this.itemName, item === undefined ? 'Off' : item === null ? '—' : ITEM_NAMES[item])
      this.itemCell.classList.toggle('empty', !item)
      this.itemCell.classList.toggle('off', item === undefined)
    }
    show(this.position, position === null ? '—' : place[position - 1])
    this.position.classList.toggle('leading', position === 1)
    if (countdown !== this.shownCountdown) {
      this.shownCountdown = countdown
      this.countdown.hidden = countdown === null
      if (countdown !== null) {
        this.countdown.setAttribute('aria-label', String(countdown))
        paintCountdown(this.countdownContext, countdown)
      }
    }
    this.lap.nodeValue = `0${race.lap} `
    show(this.time, formatTime(race.lapElapsedMs))
    show(this.best, formatTime(race.bestLapMs))
    show(this.speed, String(Math.round(car.speed)).padStart(3, '0'))
    const reversing = car.velocity.x * Math.cos(car.heading) + car.velocity.y * Math.sin(car.heading) < -5
    show(this.gear, car.drifting ? 'DRIFT' : reversing ? 'REV' : 'FWD')
    this.gear.classList.toggle('drifting', car.drifting)
    const segments = Math.round(clamp(car.speed / car.speedCap, 0, 1) * TACH_SEGMENTS)
    if (segments !== this.shownSegments) {
      this.shownSegments = segments
      this.tach.setAttribute('aria-valuenow', String(100 * segments / TACH_SEGMENTS))
      for (let i = 0; i < TACH_SEGMENTS; i++) this.tach.children[i].classList.toggle('lit', i < segments)
    }
    this.splits.forEach((item, i) => show(item, formatTime(race.lapTimesMs[i])))
    show(this.gates, `${race.checkpoint} / ${race.gates.length - 1}`)

    this.finish.hidden = !race.finished
    if (race.finished) {
      show(this.finishTotal, formatTime(race.finishTimeMs))
      show(this.finishBest, formatTime(race.bestLapMs))
      this.standings.hidden = position === null
      if (position !== null) ranks.forEach((racer, i) => {
        const { name, color } = racer.car.spec
        const row = this.standings.children[i]
        const [, swatch, label, time] = Array.from(row.children) as HTMLElement[]
        swatch.style.backgroundColor = color
        show(label, racer === racers[0] ? `${name} (you)` : name)
        show(time, racer.race.finishTimeMs === null ? 'Racing…' : formatTime(racer.race.finishTimeMs))
      })
    }

    const ctx = this.mapContext
    ctx.drawImage(this.mapBase.canvas, 0, 0)
    if (!race.finished) {
      const next = race.gates[(race.checkpoint + 1) % race.gates.length]
      ctx.fillStyle = '#2a8f8a'
      ctx.fillRect(Math.round(this.mx(next.x)) - 2, Math.round(this.my(next.y)) - 2, 5, 5)
    }
    const markers = spreadMarkers(racers.map(({ car }) => ({
      x: this.mx(car.position.x),
      y: this.my(car.position.y),
    })), 10)
    racers.slice(1).forEach((rival, index) => {
      const x = Math.round(markers[index + 1].x)
      const y = Math.round(markers[index + 1].y)
      ctx.fillStyle = '#1a1210'
      ctx.fillRect(x - 3, y - 3, 7, 7)
      ctx.fillStyle = rival.car.spec.color
      ctx.fillRect(x - 2, y - 2, 5, 5)
    })
    const color = car.spec.color
    this.mapKey.style.backgroundColor = color
    drawHeadingMarker(ctx, markers[0].x, markers[0].y, car.heading, color, 7)
  }
}
