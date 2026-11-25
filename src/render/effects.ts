import type { Car } from '../game/car'
import type { Point } from '../game/geometry'
import { SQUASH } from './stack'

interface Skid { from: Point, to: Point, life: number }
interface Puff extends Point { vx: number, vy: number, life: number }

export class TireEffects {
  private skids: Skid[] = []
  private puffs: Puff[] = []
  private tires: Point[] = []
  private cooldown = 0

  step(car: Car, dt: number) {
    for (const skid of this.skids) skid.life -= dt
    this.skids = this.skids.filter(skid => skid.life > 0)
    for (const puff of this.puffs) {
      puff.x += puff.vx * dt
      puff.y += puff.vy * dt
      puff.life -= dt
    }
    this.puffs = this.puffs.filter(puff => puff.life > 0)
    if (!car.drifting) {
      this.tires = []
      this.cooldown = 0
      return
    }
    const c = Math.cos(car.heading)
    const s = Math.sin(car.heading)
    const tires = [-0.875, 0.875].map(side => ({
      x: car.position.x - car.axle * c - side * car.radius * s,
      y: car.position.y - car.axle * s + side * car.radius * c,
    }))
    this.cooldown -= dt
    if (this.cooldown > 0) return
    this.cooldown = 0.025
    tires.forEach((tire, i) => {
      const previous = this.tires[i]
      if (previous) this.skids.push({ from: previous, to: tire, life: 8 })
      if (Math.random() < 0.66) this.puffs.push({
        ...tire, vx: car.velocity.x * 0.14 - s * car.slip * 0.4,
        vy: car.velocity.y * 0.14 + c * car.slip * 0.4, life: 0.3,
      })
    })
    this.tires = tires
  }

  draw(ctx: CanvasRenderingContext2D, left: number, top: number, scale: number) {
    const x = (value: number) => Math.round(left + value * scale)
    const y = (value: number) => Math.round(top + value * scale * SQUASH)
    ctx.save()
    ctx.strokeStyle = '#502e2b'
    ctx.lineWidth = scale
    for (const skid of this.skids) {
      ctx.globalAlpha = Math.min(0.37, skid.life * 0.17)
      ctx.beginPath()
      ctx.moveTo(x(skid.from.x), y(skid.from.y))
      ctx.lineTo(x(skid.to.x), y(skid.to.y))
      ctx.stroke()
    }
    ctx.fillStyle = '#f7cb97'
    for (const puff of this.puffs) {
      ctx.globalAlpha = puff.life * 1.65
      const size = Math.round(3 - puff.life * 4) * scale
      const lift = (0.3 - puff.life) * scale * 8
      ctx.fillRect(x(puff.x), Math.round(y(puff.y) - lift), size, size)
    }
    ctx.restore()
  }
}
