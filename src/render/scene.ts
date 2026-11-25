import type { Car } from '../game/car'
import { clamp } from '../game/geometry'
import { TABLE_HEIGHT, TABLE_WIDTH, spawn } from '../game/track'
import type { Prop } from '../game/track'
import type { AssetId, StackAsset } from './assets'
import type { TireEffects } from './effects'
import { SQUASH, StackSprite, carTurn } from './stack'
import { EDGE } from './table'

export class Scene {
  private readonly ctx: CanvasRenderingContext2D
  private readonly vehicle: StackSprite
  private readonly scenery: { x: number, y: number, sprite: StackSprite }[]
  private camera = { x: spawn.x, y: spawn.y }
  private scale = 2
  private turn = NaN

  constructor(private readonly canvas: HTMLCanvasElement, private readonly table: HTMLCanvasElement,
    assets: Record<AssetId, StackAsset>, props: Prop[]) {
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D is unavailable.')
    this.ctx = ctx
    this.vehicle = new StackSprite(assets.car)
    this.scenery = props.map(prop => {
      const asset = assets[prop.asset]
      const castShadow = asset.slices >= 36 || prop.asset === 'mug' || prop.asset === 'cereal_box'
      const sprite = new StackSprite(asset, castShadow)
      sprite.bake(prop.angle)
      return { x: prop.x, y: prop.y, sprite }
    }).sort((a, b) => a.y - b.y)
  }

  resetCamera() {
    this.camera = { x: spawn.x, y: spawn.y }
  }

  draw(car: Car, effects: TireEffects, dt: number) {
    const { canvas, ctx } = this
    const width = Math.max(1, canvas.clientWidth)
    const height = Math.max(1, canvas.clientHeight)
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width
      canvas.height = height
      this.scale = width >= 670 ? 2 : 1
    }
    ctx.imageSmoothingEnabled = false
    const scale = this.scale
    const easing = 1 - Math.exp(-dt * 4.7)
    this.camera.x += (car.position.x + car.velocity.x * 0.37 - this.camera.x) * easing
    this.camera.y += (car.position.y + car.velocity.y * 0.37 - this.camera.y) * easing
    const centerX = clamp(this.camera.x, width / (2 * scale) - 35, TABLE_WIDTH - width / (2 * scale) + 35)
    const screenDepth = TABLE_HEIGHT * SQUASH
    const centerY = clamp(this.camera.y * SQUASH + 12, height / (2 * scale) - 34,
      screenDepth - height / (2 * scale) + 48)
    const left = width / 2 - centerX * scale
    const top = height / 2 - centerY * scale
    ctx.fillStyle = '#2b1e1a'
    ctx.fillRect(0, 0, width, height)
    ctx.drawImage(this.table, Math.round(left - EDGE * scale), Math.round(top - EDGE * scale),
      this.table.width * scale, this.table.height * scale)
    effects.draw(ctx, left, top, scale)

    const turn = carTurn(car.heading)
    if (this.turn !== turn) {
      this.vehicle.bake(turn)
      this.turn = turn
    }
    const stack = { ...car.position, sprite: this.vehicle }
    const drawStack = (item: typeof stack, layer: 'shadow' | 'body', lift = 0) => {
      const x = left + item.x * scale
      const y = top + item.y * SQUASH * scale
      if (x < -150 * scale || x > width + 150 * scale || y < -115 * scale || y > height + 140 * scale) return
      item.sprite.draw(ctx, x, y, scale, layer, lift)
    }
    for (const item of this.scenery) drawStack(item, 'shadow')
    drawStack(stack, 'shadow')
    // The stationary sequence is sorted once. Insert the moving car at its ground contact.
    let carDrawn = false
    for (const item of this.scenery) {
      if (!carDrawn && item.y > stack.y) {
        drawStack(stack, 'body', car.bump)
        carDrawn = true
      }
      drawStack(item, 'body')
    }
    if (!carDrawn) drawStack(stack, 'body', car.bump)
  }
}
