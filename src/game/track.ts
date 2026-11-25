import { overlaps } from './collision'
import type { Solid } from './collision'
import type { Footprint, Point } from './geometry'
import type { Gate } from './race'

export const TABLE_WIDTH = 1400
export const TABLE_HEIGHT = 950
export const TRACK_HALF_WIDTH = 83

const corners: Point[] = [
  { x: 701, y: 752 }, { x: 1033, y: 747 }, { x: 1190, y: 656 },
  { x: 1211, y: 438 }, { x: 1102, y: 238 }, { x: 921, y: 201 },
  { x: 795, y: 310 }, { x: 656, y: 318 }, { x: 526, y: 201 },
  { x: 326, y: 203 }, { x: 186, y: 349 }, { x: 177, y: 566 },
  { x: 278, y: 718 }, { x: 455, y: 750 },
]

function spline(i: number, t: number): Point {
  const vertex = (offset: number) => corners[(i + offset + corners.length) % corners.length]
  const sample = (axis: keyof Point) => {
    const [a, b, c, d] = [-1, 0, 1, 2].map(offset => vertex(offset)[axis])
    return (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t
      + (-a + 3 * b - 3 * c + d) * t * t * t) / 2
  }
  return { x: sample('x'), y: sample('y') }
}

const SUBDIVISIONS = 36
const raw = corners.flatMap((_, i) => Array.from({ length: SUBDIVISIONS }, (_, j) => spline(i, j / SUBDIVISIONS)))
export const route = raw.map((p, i) => {
  const a = raw[(i + raw.length - 1) % raw.length]
  const b = raw[(i + 1) % raw.length]
  const length = Math.hypot(b.x - a.x, b.y - a.y)
  const forward = { x: (b.x - a.x) / length, y: (b.y - a.y) / length }
  return { ...p, forward }
})

export const gates: Gate[] = [0, 2, 3, 5, 7, 8, 10, 11, 12].map(corner => ({
  ...route[corner * SUBDIVISIONS], halfWidth: TRACK_HALF_WIDTH + 3,
}))

export const spawn = {
  x: gates[0].x + 22 * gates[0].forward.x,
  y: gates[0].y + 22 * gates[0].forward.y,
  heading: Math.atan2(gates[0].forward.y, gates[0].forward.x),
}

export type PropId = 'ruler' | 'pencil' | 'coin' | 'mug' | 'cereal_box'
export interface Prop extends Point {
  asset: PropId
  angle: number
  solid: Solid
}

function boundaryProps(side: number, footprints: Record<PropId, Footprint>): Prop[] {
  const props: Prop[] = []
  let distance = side > 0 ? 12 : 64
  for (let i = 0; i < route.length; i++) {
    const p = route[i]
    const prev = route[(i + route.length - 1) % route.length]
    distance += Math.hypot(p.x - prev.x, p.y - prev.y)
    const bend = Math.floor(i / SUBDIVISIONS)
    const curved = [1, 3, 4, 5, 7, 8, 9, 11, 12].includes(bend)
    if (distance < (curved ? 49 : 116)) continue
    distance = 0
    const asset = curved ? 'coin' : bend % 2 === 0 ? 'ruler' : 'pencil'
    const halfWidth = footprints[asset].sliceWidth / 2
    const halfLength = footprints[asset].sliceHeight / 2
    const offset = side * (TRACK_HALF_WIDTH + halfWidth + (curved ? -1 : 7))
    const x = p.x - p.forward.y * offset
    const y = p.y + p.forward.x * offset
    const angle = Math.atan2(p.forward.y, p.forward.x) - Math.PI / 2
    const solid = asset === 'coin' ? { x, y, radius: Math.max(halfWidth, halfLength) }
      : { x, y, angle, halfWidth, halfLength }
    props.push({ x, y, angle, asset, solid })
  }
  return props
}

const mug = { x: 1145, y: 348, angle: 3.93 }
const box = { x: 728, y: 280, angle: -0.33 }
function mugCircle(offset: number, radius: number): Solid {
  return {
    x: mug.x - Math.sin(mug.angle) * offset,
    y: mug.y + Math.cos(mug.angle) * offset,
    radius,
  }
}

export function buildTrack(footprints: Record<PropId, Footprint>) {
  const bowlWidth = Math.min(footprints.mug.sliceWidth, footprints.mug.sliceHeight)
  const handleLength = footprints.mug.sliceHeight - bowlWidth
  const props: Prop[] = [
    { ...mug, asset: 'mug', solid: mugCircle(handleLength / 2, bowlWidth / 2) },
    { ...box, asset: 'cereal_box', solid: {
      ...box, halfWidth: footprints.cereal_box.sliceWidth / 2, halfLength: footprints.cereal_box.sliceHeight / 2,
    } },
  ]
  const solids = props.map(prop => prop.solid)
  if (handleLength > 0) {
    const handleRadius = Math.min(bowlWidth * 0.1, handleLength / 2)
    const circles = Math.ceil(handleLength / (2 * handleRadius))
    for (let i = 0; i < circles; i++) {
      const offset = (i + 0.5) * handleLength / circles - footprints.mug.sliceHeight / 2
      solids.push(mugCircle(offset, handleRadius))
    }
  }
  for (const prop of [...boundaryProps(1, footprints), ...boundaryProps(-1, footprints)]) {
    if (solids.some(solid => overlaps(prop.solid, solid, 4))) continue
    props.push(prop)
    solids.push(prop.solid)
  }
  return { props, solids }
}
