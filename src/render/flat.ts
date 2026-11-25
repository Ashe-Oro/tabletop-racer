import type { FlatAsset } from './assets'
import { SHADOW_OFFSET, makeShadowMask } from './shadow'
import { SQUASH } from './stack'

export class FlatSprite {
  private readonly shadow: HTMLCanvasElement

  constructor(private readonly asset: FlatAsset) {
    const { image } = asset
    this.shadow = makeShadowMask(image, image.naturalWidth, image.naturalHeight)
  }

  draw(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number,
    layer: 'shadow' | 'body', angle: number, time: number) {
    const { image, width, height, frames = 1 } = this.asset
    const frame = Math.floor(time * 4) % frames
    const shadow = layer === 'shadow'
    const offset = shadow ? SHADOW_OFFSET * scale : 0
    ctx.save()
    ctx.translate(x + offset, y + offset)
    ctx.scale(scale, scale * SQUASH)
    ctx.rotate(angle)
    ctx.drawImage(shadow ? this.shadow : image, frame * width, 0, width, height,
      -width / 2, -height / 2, width, height)
    ctx.restore()
  }
}
