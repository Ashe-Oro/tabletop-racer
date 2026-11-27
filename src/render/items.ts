import type { Car } from '../game/car'
import { BLAST_RADIUS, BOMB_ARM, BOMB_FUSE, OIL_LIFE } from '../game/items'
import type { ItemId, ItemSystem } from '../game/items'
import { makeCanvas } from './assets'
import { SHADOW_OFFSET } from './shadow'
import { SQUASH } from './stack'

/** Palette keys for the item pixel maps. Colors come from art/STYLE.md and the HUD sheet. */
const PALETTE: Record<string, string> = {
  k: '#1a1210', c: '#f4f0e6', s: '#c9c2b4', r: '#e23a2b', R: '#8e1e32', h: '#ff6a4a',
  g: '#f0c53a', o: '#a8742a', y: '#f5d76a', Y: '#fff4c2', t: '#2a8f8a', T: '#1c3d4a',
  a: '#a8e4f0', m: '#8a9098', M: '#4a5058', w: '#e8ecf0', b: '#1c1c20', B: '#3a3a44',
}

const shell = ['kkkk', 'khrk', 'khrk', 'khRk', 'kRRk', 'kgok', 'kkkk']
const shotgun = Array.from({ length: 9 }, (_, row) => {
  const side = shell[row - 2] ?? '....'
  const middle = shell[row] ?? '....'
  return `${side}.${middle}.${side}`
})

/** Original item art, one character per art pixel. `.` is transparent. */
export const ITEM_PIXELS: Record<ItemId | 'oil_puddle', readonly string[]> = {
  nitro: [
    '..kkk..',
    '..kmk..',
    '.kkkkk.',
    'ktattTk',
    'ktattTk',
    'kccccsk',
    'ktattTk',
    'ktattTk',
    'ktattTk',
    '.kkkkk.',
    '..ygy..',
    '...y...',
  ],
  bullet: [
    '.kkk.',
    'kmwmk',
    'kmwmk',
    'kkkkk',
    'kygok',
    'kygok',
    'kygok',
    'kygok',
    'kkkkk',
  ],
  shotgun,
  bomb: [
    '......Y..',
    '.....gYg.',
    '......s..',
    '...kkks..',
    '..kBBbbk.',
    '.kBwbbbbk',
    '.kBbbbbbk',
    '.kbbbbbbk',
    '..kbbbbk.',
    '...kkkk..',
  ],
  oil: [
    '....kkkkk......',
    '..kkbbbbbkkk...',
    '.kbbBabbbbbbkk.',
    'kbbBaabbbbbBbbk',
    'kbbbbbbbbBabbbk',
    '.kbbbbTbbbbbbk.',
    '..kkbbbbbbbkk..',
    '....kkkkkkk....',
  ],
  // The on-table puddle drops the outline so it reads as a spill, not an object.
  oil_puddle: [
    '....bbbbb......',
    '..bbbbbbbbbb...',
    '.bbbBabbbbbbbb.',
    'bbbBaabbbbbBbbb',
    'bbbbbbbbbBabbbb',
    '.bbbbbTbbbbbbb.',
    '..bbbbbbbbbbb..',
    '....bbbbbbb....',
  ],
}

export function paintPixels(rows: readonly string[]) {
  const width = Math.max(...rows.map(row => row.length))
  const { canvas, ctx } = makeCanvas(width, rows.length)
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const color = PALETTE[row[x]]
      if (!color) continue
      ctx.fillStyle = color
      ctx.fillRect(x, y, 1, 1)
    }
  })
  return canvas
}

interface Sprite {
  image: HTMLCanvasElement
}

function sprite(rows: readonly string[]): Sprite {
  return { image: paintPixels(rows) }
}

/** Pickups and dropped bombs draw at 2× art scale so they read next to the 24 px cars. */
const ITEM_SCALE = 2

export class ItemArt {
  private readonly sprites = Object.fromEntries(
    Object.entries(ITEM_PIXELS).map(([id, rows]) => [id, sprite(rows)]),
  ) as Record<keyof typeof ITEM_PIXELS, Sprite>
  private time = 0

  /** Draw a sprite standing upright, centered on a ground point, raised by `lift` art px. */
  private stand(ctx: CanvasRenderingContext2D, id: keyof typeof ITEM_PIXELS, x: number, y: number,
    scale: number, lift: number, layer: 'shadow' | 'body') {
    const { image } = this.sprites[id]
    const size = scale * ITEM_SCALE
    const width = image.width * size
    const height = image.height * size
    if (layer === 'shadow') {
      // A flat oval under the item so it reads as resting on, or hovering over, the cloth.
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)'
      const w = Math.round(width * 0.8)
      const h = Math.max(scale, Math.round(3 * scale))
      ctx.fillRect(Math.round(x - w / 2 + SHADOW_OFFSET * scale), Math.round(y - h / 2 + SHADOW_OFFSET * scale), w, h)
      return
    }
    ctx.drawImage(image, Math.round(x - width / 2), Math.round(y - height - lift * scale), width, height)
  }

  /** A turning ring of gold pixels on the cloth marks a pickup as collectible. */
  private drawHalo(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, index: number) {
    const dots = 10
    for (let i = 0; i < dots; i++) {
      const angle = i / dots * Math.PI * 2 + this.time * 1.6 + index
      ctx.fillStyle = i % 2 ? '#f0c53a' : '#f4f0e6'
      ctx.globalAlpha = 0.85
      ctx.fillRect(Math.round(x + Math.cos(angle) * 13 * scale - scale), Math.round(y + Math.sin(angle) * 13 * SQUASH * scale - scale),
        2 * scale, 2 * scale)
    }
    ctx.globalAlpha = 1
  }

  /** Ground layer: pickups, puddles, and armed bombs, drawn under the cars. */
  drawGround(ctx: CanvasRenderingContext2D, items: ItemSystem, left: number, top: number, scale: number, dt: number) {
    this.time += dt
    const sx = (x: number) => left + x * scale
    const sy = (y: number) => top + y * SQUASH * scale

    for (const hazard of items.hazards) {
      if (hazard.kind !== 'oil') continue
      const { image } = this.sprites.oil_puddle
      // Puddles fade out over their final seconds.
      ctx.globalAlpha = 0.85 * Math.min(1, hazard.life / 2) * Math.min(1, (OIL_LIFE - hazard.life) * 8 + 0.3)
      const w = image.width * 2 * scale
      const h = image.height * 2 * scale
      ctx.drawImage(image, Math.round(sx(hazard.x) - w / 2), Math.round(sy(hazard.y) - h / 2), w, h)
      ctx.globalAlpha = 1
    }

    for (const layer of ['shadow', 'body'] as const) {
      for (const [index, spot] of items.spots.entries()) {
        if (spot.cooldown > 0) continue
        const x = sx(spot.x)
        const y = sy(spot.y)
        if (layer === 'shadow') this.drawHalo(ctx, x, y, scale, index)
        const bob = 3 + Math.round(1.5 + 1.5 * Math.sin(this.time * 4 + index))
        this.stand(ctx, spot.item, x, y, scale, bob, layer)
      }
      for (const hazard of items.hazards) {
        if (hazard.kind !== 'bomb') continue
        const x = sx(hazard.x)
        const y = sy(hazard.y)
        this.stand(ctx, 'bomb', x, y, scale, 0, layer)
        if (layer !== 'body') continue
        // The fuse blinks faster as the bomb gets closer to going off.
        const armed = hazard.fuse <= BOMB_FUSE - BOMB_ARM
        const rate = armed ? 4 + 14 * (1 - hazard.fuse / BOMB_FUSE) : 3
        if (Math.sin(this.time * rate * Math.PI * 2) > 0) {
          ctx.fillStyle = armed ? '#e23a2b' : '#f0c53a'
          ctx.fillRect(Math.round(x + 2 * scale), Math.round(y - 20 * scale), 3 * scale, 3 * scale)
        }
      }
    }
  }

  /** Air layer: bullets, explosions, and nitro exhaust, drawn over the cars. */
  drawAir(ctx: CanvasRenderingContext2D, items: ItemSystem, cars: readonly Car[], left: number, top: number, scale: number) {
    const sx = (x: number) => Math.round(left + x * scale)
    const sy = (y: number) => Math.round(top + y * SQUASH * scale)
    const lift = 5 * scale

    for (const car of cars) {
      if (car.nitroTimer <= 0) continue
      const c = Math.cos(car.heading)
      const s = Math.sin(car.heading)
      const flicker = Math.floor(this.time * 30) % 2
      const flames: readonly [number, string, number][] = [[14, '#fff4c2', 2], [17 + flicker, '#f0c53a', 2], [20 + 2 * flicker, '#e23a2b', 1]]
      for (const [back, color, size] of flames) {
        ctx.fillStyle = color
        ctx.fillRect(sx(car.position.x - c * back) - scale, sy(car.position.y - s * back) - 3 * scale, size * scale, size * scale)
      }
    }

    for (const bullet of items.bullets) {
      const speed = Math.hypot(bullet.vx, bullet.vy) || 1
      const tx = -bullet.vx / speed
      const ty = -bullet.vy / speed
      ctx.fillStyle = '#a8742a'
      for (let i = 2; i <= 6; i += 2) {
        ctx.fillRect(sx(bullet.x + tx * i), sy(bullet.y + ty * i) - lift, scale, scale)
      }
      ctx.fillStyle = '#1a1210'
      ctx.fillRect(sx(bullet.x) - 2 * scale, sy(bullet.y) - lift - 2 * scale, 4 * scale, 4 * scale)
      ctx.fillStyle = '#f0c53a'
      ctx.fillRect(sx(bullet.x) - scale, sy(bullet.y) - lift - scale, 2 * scale, 2 * scale)
    }

    for (const effect of items.effects) {
      const t = 1 - effect.life / effect.duration
      const x = sx(effect.x)
      const y = sy(effect.y)
      if (effect.kind === 'blast') {
        const radius = BLAST_RADIUS * (0.3 + 0.7 * t)
        const sparks = 18
        ctx.globalAlpha = 1 - t * 0.8
        for (let i = 0; i < sparks; i++) {
          const angle = i / sparks * Math.PI * 2
          const ring = i % 2 ? radius : radius * 0.6
          ctx.fillStyle = i % 3 === 0 ? '#f4f0e6' : i % 3 === 1 ? '#f0c53a' : '#e23a2b'
          const size = Math.max(1, Math.round(4 - 3 * t)) * scale
          ctx.fillRect(Math.round(x + Math.cos(angle) * ring * scale) - size / 2,
            Math.round(y + Math.sin(angle) * ring * SQUASH * scale) - size / 2, size, size)
        }
        if (t < 0.4) {
          ctx.fillStyle = '#fff4c2'
          const core = Math.round(16 * (1 - t / 0.4)) * scale
          ctx.fillRect(x - core / 2, y - core / 2, core, core)
        }
        ctx.globalAlpha = 1
      } else {
        const reach = (effect.kind === 'hit' ? 8 : 4) * t * scale
        ctx.globalAlpha = 1 - t
        ctx.fillStyle = effect.kind === 'hit' ? '#f4f0e6' : '#8a9098'
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [0.7, 0.7], [-0.7, -0.7], [0.7, -0.7], [-0.7, 0.7]]) {
          ctx.fillRect(Math.round(x + dx * reach) - scale, Math.round(y - lift + dy * reach) - scale, 2 * scale, 2 * scale)
        }
        ctx.globalAlpha = 1
      }
    }
  }
}

/** Paint a held-item icon (or an empty slot) into a HUD canvas. */
export function paintItemIcon(ctx: CanvasRenderingContext2D, item: ItemId | null) {
  const { width, height } = ctx.canvas
  ctx.clearRect(0, 0, width, height)
  if (!item) return
  const image = paintPixels(ITEM_PIXELS[item])
  ctx.drawImage(image, Math.floor((width - image.width) / 2), Math.floor((height - image.height) / 2))
}
