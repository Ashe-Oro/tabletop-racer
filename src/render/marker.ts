export function drawHeadingMarker(ctx: CanvasRenderingContext2D, x: number, y: number, heading: number,
  color: string, size: number) {
  ctx.save()
  ctx.translate(Math.round(x), Math.round(y))
  ctx.rotate(heading)
  ctx.beginPath()
  ctx.moveTo(size, 0)
  ctx.lineTo(-size * 0.65, size * 0.65)
  ctx.lineTo(-size * 0.35, 0)
  ctx.lineTo(-size * 0.65, -size * 0.65)
  ctx.closePath()
  ctx.lineJoin = 'round'
  ctx.lineWidth = 3
  ctx.strokeStyle = '#1a1210'
  ctx.stroke()
  ctx.fillStyle = color
  ctx.fill()
  ctx.restore()
}

/** Keep clustered cars legible while leaving isolated markers at their true positions. */
export function spreadMarkers(points: readonly { x: number, y: number }[], spacing: number) {
  const markers = points.map(point => ({ ...point }))
  for (let pass = 0; pass < 5; pass++) {
    for (let i = 0; i < markers.length; i++) {
      const a = markers[i]
      for (let j = i + 1; j < markers.length; j++) {
        const b = markers[j]
        const dx = b.x - a.x
        const dy = b.y - a.y
        const distance = Math.hypot(dx, dy)
        if (distance >= spacing) continue
        const push = (spacing - distance) / 2
        const x = distance > 0 ? dx / distance * push : push
        const y = distance > 0 ? dy / distance * push : 0
        a.x -= x
        a.y -= y
        b.x += x
        b.y += y
      }
    }
  }
  return markers
}
