import type { DirectionAsset } from './assets'
import { SHADOW_OFFSET, makeShadowMask } from './shadow'
import { SQUASH } from './stack'

const TURN = Math.PI * 2
// All four Artist v3 strips swap the southern diagonals. Stripe and Taxi also
// swap the northern diagonals.
const swappedSouth = [0, 3, 2, 1, 4, 5, 6, 7]
const swappedDiagonals = [0, 3, 2, 1, 4, 7, 6, 5]
const v3FrameOrder = new Map([
  ['art/handoff/cars_v3_stripe_8dir.png', swappedDiagonals],
  ['art/handoff/cars_v3_pickup_8dir.png', swappedSouth],
  ['art/handoff/cars_v3_f1_8dir.png', swappedSouth],
  ['art/handoff/cars_v3_taxi_8dir.png', swappedDiagonals],
])

export function directionFrame(heading: number, directions: number): number {
  const frame = Math.round(heading * directions / TURN) % directions
  return (frame + directions) % directions
}

export function directionSourceFrame(frame: number, asset: Pick<DirectionAsset, 'source' | 'directions'>) {
  return asset.directions === 8 ? v3FrameOrder.get(asset.source)?.[frame] ?? frame : frame
}

export class DirectionSprite {
  private readonly shadows: HTMLCanvasElement[]
  private frame = 0
  private rotation = 0

  constructor(private readonly asset: DirectionAsset) {
    const { image, sliceWidth, directions } = asset
    this.shadows = Array.from({ length: directions }, (_, frame) =>
      makeShadowMask(image, sliceWidth, sliceWidth, frame * sliceWidth))
  }

  setHeading(heading: number) {
    const { directions } = this.asset
    this.frame = directionFrame(heading, directions)
    const angle = this.frame * TURN / directions
    const projectedHeading = Math.atan2(Math.sin(heading) * SQUASH, Math.cos(heading))
    const projectedAngle = Math.atan2(Math.sin(angle) * SQUASH, Math.cos(angle))
    const delta = projectedHeading - projectedAngle
    const rotation = Math.atan2(Math.sin(delta), Math.cos(delta))
    this.rotation = Math.abs(rotation) < 1e-12 ? 0 : rotation
  }

  draw(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, layer: 'shadow' | 'body', lift = 0) {
    const { image, sliceWidth } = this.asset
    const size = sliceWidth * scale
    const sourceFrame = directionSourceFrame(this.frame, this.asset)
    const shadow = layer === 'shadow'
    const offset = shadow ? SHADOW_OFFSET * scale : 0
    ctx.save()
    ctx.translate(Math.round(x + offset - size / 2) + size / 2,
      Math.round(y + (shadow ? offset : -lift * scale) - size / 2) + size / 2)
    ctx.rotate(this.rotation)
    if (shadow) {
      ctx.drawImage(this.shadows[sourceFrame], -size / 2, -size / 2, size, size)
    } else {
      ctx.drawImage(image, sourceFrame * sliceWidth, 0, sliceWidth, sliceWidth,
        -size / 2, -size / 2, size, size)
    }
    ctx.restore()
  }
}
