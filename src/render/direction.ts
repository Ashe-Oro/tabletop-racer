import { CAR_LENGTH, CAR_RADIUS } from '../game/cars'
import { makeCanvas } from './assets'
import type { DirectionAsset } from './assets'
import { SQUASH } from './stack'

const TURN = Math.PI * 2
const SHADOW_SIZE = 32
const CENTER = SHADOW_SIZE / 2

export function directionFrame(heading: number, directions: number): number {
  const frame = Math.round(heading * directions / TURN) % directions
  return (frame + directions) % directions
}

export class DirectionSprite {
  private readonly shadow = makeCanvas(SHADOW_SIZE, SHADOW_SIZE)
  private frame = -1

  constructor(private readonly asset: DirectionAsset) {}

  bake(heading: number) {
    const frame = directionFrame(heading, this.asset.directions)
    if (frame === this.frame) return
    this.frame = frame

    const angle = frame * TURN / this.asset.directions
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)
    const { ctx } = this.shadow
    ctx.clearRect(0, 0, SHADOW_SIZE, SHADOW_SIZE)
    ctx.fillStyle = '#37201f60'
    for (let y = 0; y < SHADOW_SIZE; y++) {
      const dy = (y + 0.5 - CENTER) / SQUASH
      for (let x = 0; x < SHADOW_SIZE; x++) {
        const dx = x + 0.5 - CENTER
        const along = (dx * cos + dy * sin) / (CAR_LENGTH / 2)
        const across = (-dx * sin + dy * cos) / CAR_RADIUS
        if (along ** 2 + across ** 2 <= 1) ctx.fillRect(x, y, 1, 1)
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, layer: 'shadow' | 'body', lift = 0) {
    const left = Math.round(x - CENTER * scale)
    if (layer === 'shadow') {
      ctx.drawImage(this.shadow.canvas, left, Math.round(y + (1 - CENTER) * scale),
        SHADOW_SIZE * scale, SHADOW_SIZE * scale)
      return
    }
    const { image, sliceWidth } = this.asset
    const size = sliceWidth * scale
    ctx.drawImage(image, this.frame * sliceWidth, 0, sliceWidth, sliceWidth,
      Math.round(x - size / 2), Math.round(y - size / 2 - lift * scale), size, size)
  }
}
