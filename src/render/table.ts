import { TABLE_HEIGHT, TABLE_WIDTH, TRACK_HALF_WIDTH, gates, route } from '../game/track'
import { makeCanvas } from './assets'
import { SQUASH } from './stack'

function randomSource(seed: number) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return seed / 0x100000000
  }
}

function circuitPath(ctx: CanvasRenderingContext2D) {
  ctx.beginPath()
  ctx.moveTo(route[0].x, route[0].y)
  for (const p of route) ctx.lineTo(p.x, p.y)
  ctx.closePath()
}

export const EDGE = 21

export function bakeTable() {
  const depth = Math.ceil(TABLE_HEIGHT * SQUASH)
  const { canvas, ctx } = makeCanvas(TABLE_WIDTH + EDGE * 2, depth + EDGE * 2 + 26)
  const random = randomSource(718)
  ctx.translate(EDGE, EDGE)
  ctx.fillStyle = '#2c1e1c'
  ctx.fillRect(-2, 8, TABLE_WIDTH + 4, depth + 18)
  ctx.fillStyle = '#604030'
  ctx.fillRect(-2, 0, TABLE_WIDTH + 4, depth + 18)
  ctx.fillStyle = '#8e5737'
  ctx.fillRect(0, 0, TABLE_WIDTH, depth + 10)
  ctx.fillStyle = '#af7047'
  ctx.fillRect(0, depth - 4, TABLE_WIDTH, 8)

  ctx.save()
  ctx.beginPath()
  ctx.rect(0, 0, TABLE_WIDTH, depth)
  ctx.clip()
  const plankColors = ['#ad714b', '#b67b51', '#b1744d', '#bd8054', '#b4774d', '#b87b51']
  const plankHeight = 85
  for (let y = 0; y < depth; y += plankHeight) {
    ctx.fillStyle = plankColors[Math.floor(y / plankHeight) % plankColors.length]
    ctx.fillRect(0, y, TABLE_WIDTH, plankHeight)
    ctx.fillStyle = '#8f593d'
    ctx.fillRect(0, y, TABLE_WIDTH, 2)
    ctx.fillStyle = '#c89161'
    ctx.fillRect(0, y + 2, TABLE_WIDTH, 1)
  }
  for (let i = 0; i < 3100; i++) {
    const x = Math.floor(random() * TABLE_WIDTH)
    const y = Math.floor(random() * depth)
    const length = Math.floor(4 + random() ** 2 * 142)
    ctx.fillStyle = i % 3 === 0 ? '#6e453222' : '#f1bf8c2c'
    ctx.fillRect(x, y, length, 1)
    if (i % 11 === 0) ctx.fillRect(x + length, y - 1, Math.ceil(length / 3), 1)
  }
  for (let i = 0; i < 37; i++) {
    const x = Math.floor(random() * TABLE_WIDTH)
    const y = Math.floor(random() * depth)
    const radius = 3 + Math.floor(random() * 8)
    for (let ring = 1; ring <= 3; ring++) {
      ctx.strokeStyle = ring === 1 ? '#76483140' : '#8f583434'
      ctx.beginPath()
      ctx.ellipse(x, y, ring * radius * 2.4, ring * radius * 0.48, 0, 0, 2 * Math.PI)
      ctx.stroke()
    }
  }

  ctx.save()
  ctx.scale(1, SQUASH)
  circuitPath(ctx)
  ctx.lineWidth = TRACK_HALF_WIDTH * 2 + 6
  ctx.strokeStyle = '#633c2c5e'
  ctx.stroke()
  ctx.lineWidth = TRACK_HALF_WIDTH * 2
  ctx.strokeStyle = '#f0bb7b45'
  ctx.stroke()
  ctx.lineWidth = TRACK_HALF_WIDTH * 2 - 5
  ctx.strokeStyle = '#f4cea32c'
  ctx.stroke()
  ctx.lineWidth = TRACK_HALF_WIDTH * 2 - 11
  ctx.strokeStyle = '#f5c88b30'
  ctx.stroke()

  for (let i = 32; i < route.length; i += 49) {
    const { x, y, forward } = route[i]
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(Math.atan2(forward.y, forward.x))
    ctx.strokeStyle = '#f9dbaa8c'
    ctx.lineWidth = 4
    for (const dx of [-7, 6]) {
      ctx.beginPath()
      ctx.moveTo(dx - 7, -10)
      ctx.lineTo(dx + 2, 0)
      ctx.lineTo(dx - 7, 10)
      ctx.stroke()
    }
    ctx.restore()
  }

  const start = gates[0]
  ctx.save()
  ctx.translate(start.x, start.y)
  ctx.rotate(Math.atan2(start.forward.y, start.forward.x))
  ctx.fillStyle = '#82583f'
  ctx.fillRect(-17, -81, 34, 162)
  ctx.fillStyle = '#e6bd87'
  ctx.fillRect(-15, -80, 30, 160)
  for (let row = 0; row < 16; row++) {
    for (let col = 0; col < 2; col++) {
      ctx.fillStyle = (row + col) % 2 ? '#564136' : '#f9e5b8'
      ctx.fillRect(col * 10 - 10, row * 10 - 80, 10, 10)
    }
  }
  ctx.restore()
  ctx.restore()

  ctx.strokeStyle = '#e5a76d'
  ctx.lineWidth = 2
  ctx.strokeRect(2, 2, TABLE_WIDTH - 4, depth - 4)
  ctx.strokeStyle = '#99613e'
  ctx.strokeRect(7, 7, TABLE_WIDTH - 14, depth - 14)
  ctx.restore()
  return canvas
}
