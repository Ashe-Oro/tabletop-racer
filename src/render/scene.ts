import type { Car } from '../game/car'
import { CAR_LENGTH, cars } from '../game/cars'
import { clamp } from '../game/geometry'
import { TABLE_HEIGHT, TABLE_WIDTH, spawn } from '../game/track'
import type { Prop } from '../game/track'
import type { Assets } from './assets'
import { DirectionSprite } from './direction'
import type { TireEffects } from './effects'
import { SQUASH, StackSprite, carTurn } from './stack'
import type { Table } from './table'

const TURN_STEPS = 128
const TURN_STEP = Math.PI * 2 / TURN_STEPS
const OVERVIEW_MARGIN = 128

export function viewportScale(width: number, height: number) {
  return width >= 670 && height >= 420 ? 2 : 1
}

export class Scene {
  private readonly ctx: CanvasRenderingContext2D
  private readonly vehicles: (StackSprite | DirectionSprite)[]
  private readonly scenery: { x: number, y: number, sprite: StackSprite }[]
  private readonly turns: number[] = []
  private camera = { x: spawn.x, y: spawn.y }
  scale = 1

  constructor(private readonly canvas: HTMLCanvasElement, private readonly table: Table,
    assets: Assets, props: Prop[]) {
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D is unavailable.')
    this.ctx = ctx
    this.vehicles = cars.map(({ id }) => {
      const asset = assets[id]
      return asset.type === 'direction' ? new DirectionSprite(asset)
        : new StackSprite(asset, false, CAR_LENGTH / asset.sliceHeight)
    })
    this.scenery = props.map(prop => {
      const asset = assets[prop.asset]
      const sprite = new StackSprite(asset, asset.slices >= 36)
      sprite.bake(prop.angle)
      return { x: prop.x, y: prop.y, sprite }
    }).sort((a, b) => a.y - b.y)
  }

  resetCamera() {
    this.camera = { x: spawn.x, y: spawn.y }
  }

  draw(car: Car, carIndex: number, effects: TireEffects, dt: number, overview: boolean) {
    const { canvas, ctx } = this
    const width = Math.max(1, canvas.clientWidth)
    const height = Math.max(1, canvas.clientHeight)
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width
      canvas.height = height
    }
    ctx.imageSmoothingEnabled = false

    this.scale = overview
      ? Math.min(width / (TABLE_WIDTH + 2 * OVERVIEW_MARGIN),
        height / (TABLE_HEIGHT * SQUASH + 2 * OVERVIEW_MARGIN))
      : viewportScale(width, height)
    const scale = this.scale
    const easing = 1 - Math.exp(-dt * 5.5)
    const noseLead = Math.min(car.speed * 0.18, 42)
    this.camera.x += (car.position.x + car.velocity.x * 0.28 + Math.cos(car.heading) * noseLead - this.camera.x) * easing
    this.camera.y += (car.position.y + car.velocity.y * 0.28 + Math.sin(car.heading) * noseLead - this.camera.y) * easing
    const screenDepth = TABLE_HEIGHT * SQUASH
    const centerX = overview ? TABLE_WIDTH / 2 : clamp(this.camera.x,
      width / (2 * scale) - 80, TABLE_WIDTH - width / (2 * scale) + 80)
    const centerY = overview ? screenDepth / 2 : clamp(this.camera.y * SQUASH + 4,
      height / (2 * scale) - 80, screenDepth - height / (2 * scale) + 80)
    const left = Math.round(width / 2 - centerX * scale)
    const top = Math.round(height / 2 - centerY * scale)
    this.table.draw(ctx, left, top, scale, width, height)
    effects.draw(ctx, left, top, scale)

    const vehicle = this.vehicles[carIndex]
    if (vehicle instanceof DirectionSprite) {
      vehicle.bake(car.heading)
    } else {
      const turn = Math.round(carTurn(car.heading) / TURN_STEP)
      const wrapped = ((turn % TURN_STEPS) + TURN_STEPS) % TURN_STEPS
      if (this.turns[carIndex] !== wrapped) {
        vehicle.bake(wrapped * TURN_STEP)
        this.turns[carIndex] = wrapped
      }
    }
    const stack = { ...car.position, sprite: vehicle }
    const drawSprite = (item: typeof stack, layer: 'shadow' | 'body', lift = 0) => {
      const x = left + item.x * scale
      const y = top + item.y * SQUASH * scale
      if (x < -160 * scale || x > width + 160 * scale || y < -125 * scale || y > height + 165 * scale) return
      item.sprite.draw(ctx, x, y, scale, layer, lift)
    }
    for (const item of this.scenery) drawSprite(item, 'shadow')
    drawSprite(stack, 'shadow')
    // Insert the moving car in the stationary sequence at its ground contact.
    let carDrawn = false
    for (const item of this.scenery) {
      if (!carDrawn && item.y > stack.y) {
        drawSprite(stack, 'body', car.bump)
        carDrawn = true
      }
      drawSprite(item, 'body')
    }
    if (!carDrawn) drawSprite(stack, 'body', car.bump)
  }
}
