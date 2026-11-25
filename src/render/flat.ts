import { makeCanvas } from './assets'
import type { FlatAsset } from './assets'
import { SQUASH } from './stack'

export class FlatSprite {
  private readonly shadow: HTMLCanvasElement

  constructor(private readonly asset: FlatAsset) {
    const { image } = asset
    const { canvas, ctx } = makeCanvas(image.naturalWidth, image.naturalHeight)
    ctx.drawImage(image, 0, 0)
    ctx.globalCompositeOperation = 'source-in'
    ctx.fillStyle = '#37201f60'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    this.shadow = canvas
  }

  draw(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number,
    layer: 'shadow' | 'body', angle: number, time: number) {
    const { image, width, height, frames = 1 } = this.asset
    const frame = Math.floor(time * 4) % frames
    const shadow = layer === 'shadow'
    ctx.save()
    ctx.translate(x + (shadow ? 2 * scale : 0), y + (shadow ? 3 * SQUASH * scale : 0))
    ctx.scale(scale, scale * SQUASH)
    ctx.rotate(angle)
    ctx.drawImage(shadow ? this.shadow : image, frame * width, 0, width, height,
      -width / 2, -height / 2, width, height)
    ctx.restore()
  }
}
