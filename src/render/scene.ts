import type { Car } from '../game/car'
import { CAR_LENGTH, cars } from '../game/cars'
import type { CarId } from '../game/cars'
import { clamp } from '../game/geometry'
import { ANT_SCALE, ANT_WALK_DISTANCE, TABLE_HEIGHT, TABLE_WIDTH, spawn } from '../game/track'
import type { Prop } from '../game/track'
import type { Assets, FlatAsset } from './assets'
import { DirectionSprite } from './direction'
import type { TireEffects } from './effects'
import { FlatSprite } from './flat'
import { drawHeadingMarker, spreadMarkers } from './marker'
import { SQUASH, StackSprite, carTurn } from './stack'
import type { Table } from './table'

const TURN_STEPS = 128
const TURN_STEP = Math.PI * 2 / TURN_STEPS
const OVERVIEW_MARGIN = 128
const ANT_LEG_SECONDS = 1.25

interface SceneryItem {
  prop: Prop
  x: number
  y: number
  angle: number
  sprite: FlatSprite | StackSprite
}

interface Vehicle {
  car: Car
  effects: TireEffects
}

export function viewportScale(width: number, height: number) {
  return width >= 670 && height >= 420 ? 2 : 1
}

export class Scene {
  private readonly ctx: CanvasRenderingContext2D
  private readonly vehicles = new Map<CarId, StackSprite | DirectionSprite>()
  private readonly scenery: SceneryItem[]
  private readonly walkingAnts: SceneryItem[]
  private readonly turns = new Map<CarId, number>()
  private camera = { x: spawn.x, y: spawn.y }
  private sceneryTime = 0
  scale = 1

  constructor(private readonly canvas: HTMLCanvasElement, private readonly table: Table,
    assets: Assets, props: Prop[]) {
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D is unavailable.')
    this.ctx = ctx
    for (const { id } of cars) {
      const asset = assets[id]
      const sprite = asset.type === 'direction' ? new DirectionSprite(asset)
        : new StackSprite(asset, CAR_LENGTH / asset.sliceHeight)
      this.vehicles.set(id, sprite)
    }
    const flatSprites = new Map<FlatAsset, FlatSprite>()
    this.scenery = props.map(prop => {
      const asset = assets[prop.asset]
      if (asset.type === 'sprite') {
        let sprite = flatSprites.get(asset)
        if (!sprite) {
          sprite = new FlatSprite(asset)
          flatSprites.set(asset, sprite)
        }
        return { x: prop.x, y: prop.y, angle: prop.angle, prop, sprite }
      }
      const sprite = new StackSprite(asset)
      sprite.bake(prop.angle)
      return { x: prop.x, y: prop.y, angle: prop.angle, prop, sprite }
    }).sort((a, b) => a.y - b.y)
    this.walkingAnts = this.scenery.filter(({ prop, sprite }) => prop.asset === 'ant_walk' && sprite instanceof FlatSprite)
  }

  resetCamera(car: Car) {
    this.camera = { ...car.position }
  }

  draw(racers: readonly Vehicle[], dt: number, overview: boolean) {
    const { car } = racers[0]
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
    this.camera.x += (car.position.x + car.velocity.x * 0.12 - this.camera.x) * easing
    this.camera.y += (car.position.y + car.velocity.y * 0.12 - this.camera.y) * easing
    const screenDepth = TABLE_HEIGHT * SQUASH
    const centerX = overview ? TABLE_WIDTH / 2 : clamp(this.camera.x,
      width / (2 * scale) - 80, TABLE_WIDTH - width / (2 * scale) + 80)
    const centerY = overview ? screenDepth / 2 : clamp(this.camera.y * SQUASH + 4,
      height / (2 * scale) - 80, screenDepth - height / (2 * scale) + 80)
    const left = Math.round(width / 2 - centerX * scale)
    const top = Math.round(height / 2 - centerY * scale)
    this.table.draw(ctx, left, top, scale, width, height)
    for (const { effects } of racers) effects.draw(ctx, left, top, scale)

    this.sceneryTime += dt
    for (const ant of this.walkingAnts) {
      const { prop } = ant
      const phase = (this.sceneryTime / ANT_LEG_SECONDS + prop.x / 19) % 2
      const distance = (1 - Math.abs(phase - 1)) * ANT_WALK_DISTANCE
      ant.x = prop.x + Math.cos(prop.angle) * distance
      ant.y = prop.y + Math.sin(prop.angle) * distance
      ant.angle = prop.angle + (phase >= 1 ? Math.PI : 0)
    }

    // Each active livery has its own sprite, heading cache, and shadow.
    const stacks = racers.map(({ car }) => {
      const { id } = car.spec
      const sprite = this.vehicles.get(id)!
      if (sprite instanceof DirectionSprite) {
        sprite.setHeading(car.heading)
      } else {
        const turn = Math.round(carTurn(car.heading) / TURN_STEP)
        const wrapped = ((turn % TURN_STEPS) + TURN_STEPS) % TURN_STEPS
        if (this.turns.get(id) !== wrapped) {
          sprite.bake(wrapped * TURN_STEP)
          this.turns.set(id, wrapped)
        }
      }
      return { ...car.position, sprite, angle: car.heading, lift: car.bump }
    })
    const drawSprite = (item: SceneryItem | typeof stacks[number], layer: 'shadow' | 'body') => {
      const x = left + item.x * scale
      const y = top + item.y * SQUASH * scale
      if (x < -160 * scale || x > width + 160 * scale || y < -125 * scale || y > height + 165 * scale) return
      if (item.sprite instanceof FlatSprite) {
        const isAnt = 'prop' in item && (item.prop.asset === 'ant' || item.prop.asset === 'ant_walk')
        item.sprite.draw(ctx, x, y, scale * (isAnt ? ANT_SCALE : 1), layer, item.angle, this.sceneryTime + item.x / 19)
      } else {
        item.sprite.draw(ctx, x, y, scale, layer, 'lift' in item ? item.lift : 0)
      }
    }
    const bodies = [...this.scenery, ...stacks].sort((a, b) => a.y - b.y)
    for (const item of bodies) drawSprite(item, 'shadow')
    for (const item of bodies) drawSprite(item, 'body')

    if (overview) {
      const positions = racers.map(({ car }) => ({
        x: left + car.position.x * scale,
        y: top + car.position.y * SQUASH * scale,
      }))
      const markers = spreadMarkers(positions, 15)
      ctx.beginPath()
      markers.forEach((marker, i) => {
        ctx.moveTo(positions[i].x, positions[i].y)
        ctx.lineTo(marker.x, marker.y)
      })
      ctx.strokeStyle = '#1a1210'
      ctx.lineWidth = 1
      ctx.stroke()
      for (let i = racers.length - 1; i >= 0; i--) {
        const { car } = racers[i]
        const heading = Math.atan2(Math.sin(car.heading) * SQUASH, Math.cos(car.heading))
        drawHeadingMarker(ctx, markers[i].x, markers[i].y, heading, car.spec.color, i === 0 ? 8 : 6)
      }
    }
  }
}
