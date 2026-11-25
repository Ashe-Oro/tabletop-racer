import { makeCanvas } from './assets'

export const SHADOW_OFFSET = 2

export function paintShadowMask(ctx: CanvasRenderingContext2D, source: CanvasImageSource, sourceX = 0) {
  const { width, height } = ctx.canvas
  ctx.clearRect(0, 0, width, height)
  ctx.drawImage(source, sourceX, 0, width, height, 0, 0, width, height)
  ctx.save()
  ctx.globalCompositeOperation = 'source-in'
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)'
  ctx.fillRect(0, 0, width, height)
  ctx.restore()
}

export function makeShadowMask(source: CanvasImageSource, width: number, height: number, sourceX = 0) {
  const { canvas, ctx } = makeCanvas(width, height)
  paintShadowMask(ctx, source, sourceX)
  return canvas
}
