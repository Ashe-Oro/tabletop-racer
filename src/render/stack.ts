import { makeCanvas } from './assets'
import type { StackAsset } from './assets'

export const SQUASH = 0.75
const SPACING = 1
const OUTLINE = rgba(26, 18, 16, 255)
const GROUND_SHADOW = rgba(55, 32, 31, 96)
const CAST_SHADOW = rgba(55, 32, 31, 63)
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]

function rgba(r: number, g: number, b: number, a: number) {
  return new Uint32Array(new Uint8Array([r, g, b, a]).buffer)[0]
}

export const carTurn = (heading: number) => heading - Math.PI / 2

export class StackSprite {
  readonly body: HTMLCanvasElement
  readonly shadow: HTMLCanvasElement
  private readonly bodyContext: CanvasRenderingContext2D
  private readonly shadowContext: CanvasRenderingContext2D
  private readonly bodyImage: ImageData
  private readonly shadowImage: ImageData
  private readonly color: Uint32Array
  private readonly shade: Uint32Array
  private readonly silhouette: Uint8Array
  private readonly samples: Int32Array
  private readonly pivotX: number
  private readonly pivotY: number
  private readonly radius: number
  private readonly phaseX: number
  private readonly phaseY: number

  constructor(private readonly asset: StackAsset, private readonly castShadow = false) {
    const { sliceWidth: w, sliceHeight: h, slices } = asset
    // Centre the sample grid on either a pixel or a pixel boundary according
    // to the native footprint. Even sprites then turn around a stable pivot.
    this.phaseX = w % 2 === 0 ? 0.5 : 0
    this.phaseY = Math.round(h * SQUASH) % 2 === 0 ? 0.5 : 0
    this.radius = Math.ceil(Math.hypot(w, h) / 2) + 1
    const tallPad = castShadow ? Math.ceil(slices * 0.43) : 0
    this.pivotX = this.radius + 2
    this.pivotY = this.radius + slices + 2
    const width = this.radius * 2 + 9 + tallPad
    const height = this.radius * 2 + slices + 10 + tallPad
    const body = makeCanvas(width, height)
    const shadow = makeCanvas(width, height)
    this.body = body.canvas
    this.shadow = shadow.canvas
    this.bodyContext = body.ctx
    this.shadowContext = shadow.ctx
    this.bodyImage = body.ctx.createImageData(width, height)
    this.shadowImage = shadow.ctx.createImageData(width, height)
    this.color = new Uint32Array(this.bodyImage.data.buffer)
    this.shade = new Uint32Array(this.shadowImage.data.buffer)
    this.silhouette = new Uint8Array(width * height)
    this.samples = new Int32Array((this.radius * 2 + 1) ** 2)
  }

  bake(turn: number) {
    const { sliceWidth: w, sliceHeight: h, slices, pixels, footprint } = this.asset
    const { width } = this.body
    const { radius, pivotX, pivotY, color, shade, silhouette, samples } = this
    const area = w * h
    const cx = (w - 1) * 0.5
    const cy = (h - 1) * 0.5
    const cos = Math.cos(turn)
    const sin = Math.sin(turn)
    // Match exact cardinal angles across turns, including the half-pixel ties of even-sized slices.
    const c = Math.abs(cos) < 1e-10 ? 0 : cos
    const s = Math.abs(sin) < 1e-10 ? 0 : sin
    const yRadius = Math.ceil(radius * SQUASH)

    color.fill(0)
    shade.fill(0)
    silhouette.fill(0)
    let sampleCount = 0
    for (let y = -yRadius; y <= yRadius; y++) {
      for (let x = -radius; x <= radius; x++) {
        const flatX = x + this.phaseX
        const flatY = (y + this.phaseY) / SQUASH
        const sx = Math.round(flatX * c + flatY * s + cx)
        const sy = Math.round(-flatX * s + flatY * c + cy)
        samples[sampleCount++] = sx >= 0 && sx < w && sy >= 0 && sy < h ? sy * w + sx : -1
      }
    }

    for (let z = 0; z < slices; z++) {
      const lift = Math.round(z * SPACING)
      const castX = Math.round(z * 0.43)
      const castY = Math.round(z * 0.25)
      let sample = 0
      for (let y = pivotY - yRadius; y <= pivotY + yRadius; y++) {
        for (let x = pivotX - radius; x <= pivotX + radius; x++) {
          const source = samples[sample++]
          if (source < 0) continue
          const ground = y * width + x
          if (z === 0 && footprint[source]) shade[ground + 3 * width + 2] = GROUND_SHADOW
          const pixel = pixels[z * area + source]
          if (!pixel) continue
          const index = ground - lift * width
          color[index] = pixel
          silhouette[index] = 1
          if (this.castShadow && z > 0) {
            const sx = x + castX + 2
            const sy = y + castY + 3
            const shadeIndex = sy * width + sx
            if (!shade[shadeIndex] && BAYER[(sy & 3) * 4 + (sx & 3)] < 10) shade[shadeIndex] = CAST_SHADOW
          }
        }
      }
    }

    for (let i = width; i < silhouette.length - width; i++) {
      if (!silhouette[i] && (silhouette[i - 1] || silhouette[i + 1] ||
          silhouette[i - width] || silhouette[i + width])) color[i] = OUTLINE
    }
    this.bodyContext.putImageData(this.bodyImage, 0, 0)
    this.shadowContext.putImageData(this.shadowImage, 0, 0)
  }

  draw(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, layer: 'shadow' | 'body', lift = 0) {
    const sprite = layer === 'shadow' ? this.shadow : this.body
    const left = Math.round(x - (this.pivotX + 0.5 - this.phaseX) * scale)
    const top = Math.round(y - (this.pivotY + 0.5 - this.phaseY + lift) * scale)
    ctx.drawImage(sprite, left, top, sprite.width * scale, sprite.height * scale)
  }
}
