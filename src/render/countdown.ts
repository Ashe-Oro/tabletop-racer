import type { Countdown } from '../game/race'

const glyphs = {
  3: ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
  2: ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
  1: ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  G: ['01110', '10001', '10000', '10111', '10001', '10001', '01110'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  '!': ['00100', '00100', '00100', '00100', '00100', '00000', '00100'],
}

export function paintCountdown(ctx: CanvasRenderingContext2D, countdown: NonNullable<Countdown>) {
  const { width, height } = ctx.canvas
  ctx.clearRect(0, 0, width, height)
  const word = countdown === 'GO!' ? ['G', 'O', '!'] as const : [countdown]
  const left = (width - (word.length * 6 - 1)) / 2
  const ink: [number, number][] = []
  word.forEach((glyph, index) => {
    glyphs[glyph].forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        if (row[x] === '1') ink.push([left + index * 6 + x, y + 1])
      }
    })
  })
  if (countdown === 'GO!') {
    ctx.fillStyle = '#f4f0e6'
    for (const [x, y] of ink) ctx.fillRect(x - 1, y - 1, 3, 3)
  }
  ctx.fillStyle = countdown === 'GO!' ? '#e23a2b' : countdown === 2 ? '#f0c53a' : '#f4f0e6'
  for (const [x, y] of ink) ctx.fillRect(x, y, 1, 1)
}
