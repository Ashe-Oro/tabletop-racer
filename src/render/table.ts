import { TABLE_HEIGHT, TABLE_WIDTH, gates, route } from '../game/track'
import { groundUrl, loadManifest, tableTileUrl } from './asset-source'
import { makeCanvas } from './assets'
import { SQUASH } from './stack'

export const EDGE = 80
const depth = TABLE_HEIGHT * SQUASH
const cloth = { x: 2508, y: Math.round(250 * SQUASH), width: 1600, height: Math.round(2520 * SQUASH) }
const blanket = { x: -360, y: 780, width: 1790, height: depth - 325 }

function grain(seed: number) {
  return () => {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0
    return seed / 4294967296
  }
}

function grassTile() {
  const { canvas, ctx } = makeCanvas(112, 96)
  const rand = grain(7)
  ctx.fillStyle = '#557849'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  for (let i = 0; i < 620; i++) {
    const x = Math.floor(rand() * canvas.width)
    const y = Math.floor(rand() * canvas.height)
    ctx.fillStyle = i % 4 === 0 ? '#779153' : i % 2 ? '#466943' : '#5c814d'
    ctx.fillRect(x, y, 1 + i % 4, 1 + i % 3)
  }
  return canvas
}

function blanketTile() {
  const { canvas, ctx } = makeCanvas(96, 72)
  const rand = grain(18)
  ctx.fillStyle = '#3e736e'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  for (const x of [5, 41, 77]) {
    ctx.fillStyle = '#6f9c87'
    ctx.fillRect(x, 0, 13, canvas.height)
    ctx.fillStyle = '#9ab29b'
    ctx.fillRect(x + 13, 0, 3, canvas.height)
  }
  for (const y of [1, 25, 49]) {
    ctx.fillStyle = '#92b7a64a'
    ctx.fillRect(0, y, canvas.width, 11)
    ctx.fillStyle = '#9ab29b9a'
    ctx.fillRect(0, y + 11, canvas.width, 2)
  }
  ctx.fillStyle = '#203e3b29'
  for (let i = 0; i < 420; i++) {
    ctx.fillRect(Math.floor(rand() * canvas.width), Math.floor(rand() * canvas.height), 1, 1)
  }
  return canvas
}

function tableclothTile() {
  const cell = 56
  const cellHeight = Math.round(cell * SQUASH)
  const { canvas, ctx } = makeCanvas(cell * 2, cellHeight * 2)
  const rand = grain(11)
  ctx.fillStyle = '#e19277'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = '#b95147'
  ctx.fillRect(0, 0, cell, cellHeight)
  ctx.fillStyle = '#f2d8ad'
  ctx.fillRect(cell, cellHeight, cell, cellHeight)
  for (let y = 1; y < canvas.height; y += 3) {
    ctx.fillStyle = '#6e362118'
    ctx.fillRect(0, y, canvas.width, 1)
  }
  for (let x = 1; x < canvas.width; x += 3) {
    ctx.fillStyle = '#fff1d226'
    ctx.fillRect(x, 0, 1, canvas.height)
  }
  for (let i = 0; i < 300; i++) {
    ctx.fillStyle = i % 2 ? '#ffeac829' : '#6a3e2520'
    ctx.fillRect(Math.floor(rand() * canvas.width), Math.floor(rand() * canvas.height), 2, 1)
  }
  return canvas
}

function woodTile() {
  const { canvas, ctx } = makeCanvas(216, 96)
  const rand = grain(24)
  ctx.fillStyle = '#bd8950'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  for (let i = 0; i < 520; i++) {
    ctx.fillStyle = i % 3 ? '#7e502528' : '#f2b97038'
    ctx.fillRect(Math.floor(rand() * canvas.width), Math.floor(rand() * canvas.height), 2 + i % 18, 1)
  }
  return canvas
}

function routeMarks() {
  const scuffs = new Path2D()
  const crumbs = new Path2D()
  const arrows = new Path2D()
  const rand = grain(31)
  let distance = 0
  let lastArrow = -100
  let lastTrail = 0
  for (const [i, point] of route.entries()) {
    if (i > 0) distance += Math.hypot(point.x - route[i - 1].x, point.y - route[i - 1].y)
    const { x, y, forward } = point
    if (distance - lastTrail > 32 && distance > 85) {
      lastTrail = distance
      const side = (rand() - 0.5) * 62
      const trailX = Math.round(x - forward.y * side)
      const trailY = Math.round(y + forward.x * side)
      for (let j = 0; j < 5; j++) {
        const fx = Math.round(trailX + (rand() - 0.5) * 20)
        const fy = Math.round(trailY + (rand() - 0.5) * 16)
        const flecks = j % 2 ? crumbs : scuffs
        flecks.rect(fx, fy, 2 + j % 3, 2)
      }
    }
    if (distance - lastArrow < 175 || distance < 155) continue
    lastArrow = distance
    const arrowPoint = (dx: number, dy: number) => [
      x + dx * forward.x - dy * forward.y, y + dx * forward.y + dy * forward.x,
    ] as const
    for (const dx of [-13, 3]) {
      arrows.moveTo(...arrowPoint(dx, -11))
      arrows.lineTo(...arrowPoint(dx + 11, 0))
      arrows.lineTo(...arrowPoint(dx, 11))
    }
  }
  return { scuffs, crumbs, arrows }
}

const groundKeys = ['wood_planks', 'checkered_tablecloth', 'blanket', 'grass'] as const
type GroundKey = typeof groundKeys[number]
type Textures = Record<GroundKey, HTMLImageElement | HTMLCanvasElement>

async function loadTexture(url: string | undefined, fallback: () => HTMLCanvasElement) {
  if (!url) return fallback()
  const image = new Image()
  image.src = url
  return image.decode().then(() => image, fallback)
}

export async function loadTable() {
  const manifest = await loadManifest() as { ground?: Partial<Record<GroundKey, string>> }
  const fallback = { wood_planks: woodTile, checkered_tablecloth: tableclothTile, blanket: blanketTile, grass: grassTile }
  const textures = Object.fromEntries(await Promise.all(groundKeys.map(async key => {
    const filename = manifest.ground?.[key]
    const url = filename ? groundUrl(filename) : key === 'wood_planks' ? tableTileUrl : undefined
    return [key, await loadTexture(url, fallback[key])]
  }))) as Textures
  return new Table(textures, !manifest.ground?.wood_planks)
}

export class Table {
  private readonly marks = routeMarks()
  private patterns?: Record<GroundKey, CanvasPattern | null>
  private readonly stitches = makeCanvas(12, 8).canvas
  private stitchPattern?: CanvasPattern | null

  constructor(private readonly textures: Textures, private readonly plankDetail: boolean) {
    const ctx = this.stitches.getContext('2d')!
    ctx.fillStyle = '#7b3b3190'
    ctx.fillRect(2, 5, 5, 1)
    ctx.fillStyle = '#fae3be'
    ctx.fillRect(2, 4, 5, 1)
  }

  draw(ctx: CanvasRenderingContext2D, left: number, top: number, scale: number, width: number, height: number) {
    this.patterns ??= Object.fromEntries(groundKeys.map(key => [
      key, ctx.createPattern(this.textures[key], 'repeat'),
    ])) as Record<GroundKey, CanvasPattern | null>
    const patterns = this.patterns
    const panorama = scale < 1
    // Align the base and props to whole screen pixels at normal gameplay zoom.
    left = panorama ? left : Math.round(left)
    top = panorama ? top : Math.round(top)
    ctx.save()
    ctx.translate(left, top)
    ctx.scale(scale, scale)
    ctx.fillStyle = patterns.grass ?? '#557849'
    ctx.fillRect(-left / scale, -top / scale, width / scale, height / scale)

    ctx.fillStyle = '#273b3b64'
    ctx.fillRect(blanket.x + 10, blanket.y + 14, blanket.width, blanket.height)
    ctx.fillStyle = patterns.blanket ?? '#3e736e'
    ctx.fillRect(blanket.x, blanket.y, blanket.width, blanket.height)
    ctx.strokeStyle = '#a6b59d'
    ctx.lineWidth = 4
    ctx.strokeRect(blanket.x + 5, blanket.y + 5, blanket.width - 10, blanket.height - 10)

    ctx.fillStyle = '#30291e55'
    ctx.fillRect(12, 11, TABLE_WIDTH + 8, depth + 27)
    ctx.fillStyle = '#633c25'
    ctx.fillRect(-4, -3, TABLE_WIDTH + 8, depth + 27)
    ctx.fillStyle = '#975a36'
    ctx.fillRect(-2, 0, TABLE_WIDTH + 4, depth + 20)
    ctx.fillStyle = '#ac7243'
    ctx.fillRect(0, depth + 6, TABLE_WIDTH, 8)
    ctx.fillStyle = patterns.wood_planks ?? '#bd8950'
    ctx.fillRect(0, 0, TABLE_WIDTH, depth)

    if (this.plankDetail) this.drawPlankDetail(ctx)
    this.drawCloth(ctx, patterns.checkered_tablecloth ?? '#b95147')
    this.drawCues(ctx)
    ctx.strokeStyle = '#f5c47b'
    ctx.lineWidth = 2
    ctx.strokeRect(2, 2, TABLE_WIDTH - 4, depth - 4)
    ctx.strokeStyle = '#81512e65'
    ctx.lineWidth = 1
    ctx.strokeRect(7, 7, TABLE_WIDTH - 14, depth - 14)
    ctx.restore()
  }

  private drawPlankDetail(ctx: CanvasRenderingContext2D) {
    const board = 125
    for (let y = board; y < depth; y += board) {
      if (y % (board * 2)) {
        ctx.fillStyle = '#8b512845'
        ctx.fillRect(0, y, TABLE_WIDTH, Math.min(board, depth - y))
      }
      ctx.fillStyle = '#8a512875'
      ctx.fillRect(0, y, TABLE_WIDTH, 2)
      ctx.fillStyle = '#f3bd736f'
      ctx.fillRect(0, y + 2, TABLE_WIDTH, 1)
    }
    for (const x of [24, TABLE_WIDTH - 28]) {
      for (let y = 18; y < depth - 10; y += board) {
        ctx.fillStyle = '#8152309c'
        ctx.fillRect(x, y, 4, 3)
        ctx.fillStyle = '#f2be80a8'
        ctx.fillRect(x + 1, y + 3, 3, 1)
      }
    }
  }

  private drawCloth(ctx: CanvasRenderingContext2D, pattern: CanvasPattern | string) {
    const { x, y, width, height } = cloth
    ctx.save()
    ctx.translate(x, y)
    ctx.fillStyle = '#6b3a2a55'
    ctx.fillRect(4, 4, width + 1, height + 2)
    ctx.fillStyle = '#9d4138'
    ctx.fillRect(0, 0, width, height)
    ctx.fillStyle = pattern
    ctx.fillRect(8, 8, width - 16, height - 16)
    ctx.strokeStyle = '#e38b73'
    ctx.lineWidth = 1
    ctx.strokeRect(1.5, 1.5, width - 3, height - 3)
    ctx.strokeStyle = '#77382a85'
    ctx.strokeRect(7.5, 7.5, width - 15, height - 15)
    this.stitchPattern ??= ctx.createPattern(this.stitches, 'repeat-x')
    const stitch = this.stitchPattern
    if (stitch) {
      ctx.fillStyle = stitch
      for (const edge of [0, height - 8]) {
        ctx.save()
        ctx.translate(0, edge)
        ctx.fillRect(8, 0, width - 16, 8)
        ctx.restore()
      }
      for (const edge of [8, width]) {
        ctx.save()
        ctx.translate(edge, 0)
        ctx.rotate(Math.PI / 2)
        ctx.fillRect(8, 0, height - 16, 8)
        ctx.restore()
      }
    }
    ctx.restore()
  }

  private drawCues(ctx: CanvasRenderingContext2D) {
    ctx.save()
    ctx.scale(1, SQUASH)
    ctx.fillStyle = '#66372029'
    ctx.fill(this.marks.scuffs)
    ctx.fillStyle = '#fff0c768'
    ctx.fill(this.marks.crumbs)
    ctx.lineWidth = 6
    ctx.lineJoin = 'miter'
    ctx.strokeStyle = '#603b2a5b'
    ctx.save()
    ctx.translate(0, 1)
    ctx.stroke(this.marks.arrows)
    ctx.restore()
    ctx.lineWidth = 4
    ctx.strokeStyle = '#fff0caa0'
    ctx.stroke(this.marks.arrows)

    const start = gates[0]
    ctx.translate(start.x, start.y)
    ctx.rotate(Math.atan2(start.forward.y, start.forward.x))
    const square = 14
    const rows = 14
    ctx.fillStyle = '#5c3a286f'
    ctx.fillRect(-23, -100, 46, 200)
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < 3; col++) {
        ctx.fillStyle = (row + col) % 2 ? '#59433a' : '#fae2b6'
        ctx.fillRect((col - 1.5) * square, (row - rows / 2) * square, square, square)
      }
    }
    ctx.restore()
  }
}
