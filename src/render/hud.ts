import type { Car } from '../game/car'
import type { Race } from '../game/race'
import { TABLE_HEIGHT, TABLE_WIDTH, gates, route } from '../game/track'
import { makeCanvas } from './assets'

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
  private readonly time = element('time')
  private readonly best = element('best')
  private readonly speed = element('speed')
  private readonly gear = element('gear')
  private readonly splits = [element('split-1'), element('split-2'), element('split-3')]
  private readonly gates = element('gates')
  private readonly finish = element('finish')
  private readonly finishTotal = element('finish-total')
  private readonly finishBest = element('finish-best')
  private readonly map = element<HTMLCanvasElement>('map')
  private readonly mapContext = this.map.getContext('2d')!
  private readonly mapBase = makeCanvas(this.map.width, this.map.height)
  private readonly mapScale = Math.min((this.map.width - 16) / TABLE_WIDTH, (this.map.height - 16) / TABLE_HEIGHT)
  private readonly mx = (x: number) => this.map.width / 2 + (x - TABLE_WIDTH / 2) * this.mapScale
  private readonly my = (y: number) => this.map.height / 2 + (y - TABLE_HEIGHT / 2) * this.mapScale

  constructor() {
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

  draw(car: Car, race: Race) {
    this.lap.nodeValue = `0${race.lap} `
    show(this.time, formatTime(race.lapElapsedMs))
    show(this.best, formatTime(race.bestLapMs))
    show(this.speed, String(Math.round(car.speed)).padStart(3, '0'))
    const reversing = car.velocity.x * Math.cos(car.heading) + car.velocity.y * Math.sin(car.heading) < -5
    show(this.gear, car.drifting ? 'DRIFT' : reversing ? 'REV' : 'FWD')
    this.gear.classList.toggle('drifting', car.drifting)
    this.splits.forEach((item, i) => show(item, formatTime(race.lapTimesMs[i])))
    show(this.gates, `${race.checkpoint} / ${race.gates.length - 1}`)

    this.finish.hidden = !race.finished
    if (race.finished) {
      show(this.finishTotal, formatTime(race.elapsedMs))
      show(this.finishBest, formatTime(race.bestLapMs))
    }

    const ctx = this.mapContext
    ctx.drawImage(this.mapBase.canvas, 0, 0)
    if (!race.finished) {
      const next = race.gates[(race.checkpoint + 1) % race.gates.length]
      ctx.fillStyle = '#2a8f8a'
      ctx.fillRect(Math.round(this.mx(next.x)) - 2, Math.round(this.my(next.y)) - 2, 5, 5)
    }
    const x = Math.round(this.mx(car.position.x))
    const y = Math.round(this.my(car.position.y))
    ctx.fillStyle = '#1a1210'
    ctx.fillRect(x - 3, y - 3, 7, 7)
    ctx.fillStyle = '#e23a2b'
    ctx.fillRect(x - 2, y - 2, 5, 5)
  }
}
