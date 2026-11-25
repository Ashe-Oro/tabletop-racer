import type { DirectionAsset } from './assets'
import { SHADOW_OFFSET, makeShadowMask } from './shadow'

const TURN = Math.PI * 2

export function directionFrame(heading: number, directions: number): number {
  const frame = Math.round(heading * directions / TURN) % directions
  return (frame + directions) % directions
}

export class DirectionSprite {
  private readonly shadows: HTMLCanvasElement[]
  private frame = 0

  constructor(private readonly asset: DirectionAsset) {
    const { image, sliceWidth, directions } = asset
    this.shadows = Array.from({ length: directions }, (_, frame) =>
      makeShadowMask(image, sliceWidth, sliceWidth, frame * sliceWidth))
  }

  setHeading(heading: number) {
    this.frame = directionFrame(heading, this.asset.directions)
  }

  draw(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, layer: 'shadow' | 'body', lift = 0) {
    const { image, sliceWidth } = this.asset
    const size = sliceWidth * scale
    if (layer === 'shadow') {
      const offset = SHADOW_OFFSET * scale
      ctx.drawImage(this.shadows[this.frame], Math.round(x - size / 2 + offset),
        Math.round(y - size / 2 + offset), size, size)
      return
    }
    ctx.drawImage(image, this.frame * sliceWidth, 0, sliceWidth, sliceWidth,
      Math.round(x - size / 2), Math.round(y - size / 2 - lift * scale), size, size)
  }
}
