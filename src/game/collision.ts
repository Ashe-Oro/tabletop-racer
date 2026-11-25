import { clamp, dot } from './geometry'
import type { Point } from './geometry'

export interface Circle extends Point {
  radius: number
}

export interface Box extends Point {
  angle: number
  halfWidth: number
  halfLength: number
}

export type Solid = Circle | Box

export interface Contact {
  normal: Point
  depth: number
}

export function circleContact(body: Circle, solid: Circle): Contact | undefined {
  const dx = body.x - solid.x
  const dy = body.y - solid.y
  const distance = Math.hypot(dx, dy)
  const depth = body.radius + solid.radius - distance
  if (depth <= 0) return
  return { normal: distance ? { x: dx / distance, y: dy / distance } : { x: 1, y: 0 }, depth }
}

export function boxContact(body: Circle, box: Box): Contact | undefined {
  const c = Math.cos(box.angle)
  const s = Math.sin(box.angle)
  const dx = body.x - box.x
  const dy = body.y - box.y
  const x = c * dx + s * dy
  const y = -s * dx + c * dy
  const nearestX = clamp(x, -box.halfWidth, box.halfWidth)
  const nearestY = clamp(y, -box.halfLength, box.halfLength)
  const ox = x - nearestX
  const oy = y - nearestY
  const distance = Math.hypot(ox, oy)
  if (distance >= body.radius) return

  let nx: number, ny: number, depth: number
  if (distance > 0) {
    nx = ox / distance
    ny = oy / distance
    depth = body.radius - distance
  } else {
    const edgeX = box.halfWidth - Math.abs(x)
    const edgeY = box.halfLength - Math.abs(y)
    nx = edgeX <= edgeY ? Math.sign(x) || 1 : 0
    ny = edgeX > edgeY ? Math.sign(y) || 1 : 0
    depth = body.radius + Math.min(edgeX, edgeY)
  }
  return { normal: { x: c * nx - s * ny, y: s * nx + c * ny }, depth }
}

export function tableContacts(body: Circle, width: number, height: number): Contact[] {
  const { x, y, radius } = body
  const contacts: Contact[] = []
  if (x < radius) contacts.push({ normal: { x: 1, y: 0 }, depth: radius - x })
  if (x > width - radius) contacts.push({ normal: { x: -1, y: 0 }, depth: x + radius - width })
  if (y < radius) contacts.push({ normal: { x: 0, y: 1 }, depth: radius - y })
  if (y > height - radius) contacts.push({ normal: { x: 0, y: -1 }, depth: y + radius - height })
  return contacts
}

export function resolveContact(position: Point, velocity: Point, contact: Contact, restitution = 0.63): number {
  const { normal, depth } = contact
  position.x += normal.x * (depth + 0.03)
  position.y += normal.y * (depth + 0.03)
  const incoming = dot(velocity, normal)
  if (incoming >= 0) return 0
  const impulse = (1 + restitution) * incoming
  velocity.x -= impulse * normal.x
  velocity.y -= impulse * normal.y
  return -incoming
}

export function overlaps(a: Solid, b: Solid, gap: number): boolean {
  if ('radius' in a) {
    const padded = { ...a, radius: a.radius + gap }
    return Boolean('radius' in b ? circleContact(padded, b) : boxContact(padded, b))
  }
  if ('radius' in b) return overlaps(b, a, gap)

  const axes = (box: Box) => {
    const x = Math.cos(box.angle)
    const y = Math.sin(box.angle)
    return [{ x, y }, { x: -y, y: x }]
  }
  const [ax, ay] = axes(a)
  const [bx, by] = axes(b)
  const difference = { x: b.x - a.x, y: b.y - a.y }
  return [ax, ay, bx, by].every(axis =>
    Math.abs(dot(difference, axis)) <
    a.halfWidth * Math.abs(dot(ax, axis)) + a.halfLength * Math.abs(dot(ay, axis)) +
    b.halfWidth * Math.abs(dot(bx, axis)) + b.halfLength * Math.abs(dot(by, axis)) + gap,
  )
}
