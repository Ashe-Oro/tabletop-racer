import { overlaps } from './collision'
import type { Solid } from './collision'
import type { Footprint, Point } from './geometry'
import type { Gate } from './race'

export const TABLE_WIDTH = 1400
export const TABLE_HEIGHT = 950
export const TRACK_HALF_WIDTH = 83
export const TRACK_CONFIG = { OBSTACLES: false as boolean }

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

const longestSegment = Math.max(...route.map((p, i) => {
  const next = route[(i + 1) % route.length]
  return Math.hypot(next.x - p.x, next.y - p.y)
}))
// Pad the sample circles so they cover the full lane between route points.
const laneRadius = Math.hypot(TRACK_HALF_WIDTH, longestSegment / 2)
const lane = route.map(({ x, y }) => ({ x, y, radius: laneRadius }))

export const gates: Gate[] = [0, 2, 3, 5, 7, 8, 10, 11, 12].map(corner => ({
  ...route[corner * SUBDIVISIONS], halfWidth: TRACK_HALF_WIDTH + 3,
}))

export const spawn = {
  x: gates[0].x + 22 * gates[0].forward.x,
  y: gates[0].y + 22 * gates[0].forward.y,
  heading: Math.atan2(gates[0].forward.y, gates[0].forward.x),
}

export type PropId = 'ruler' | 'pencil' | 'coin' | 'mug' | 'cereal_box'
  | 'eraser' | 'salt_shaker' | 'butter_dish' | 'crumb_pile'
export interface Prop extends Point {
  asset: PropId
  angle: number
  solid: Solid
}

function boxSolid(position: Point & { angle: number }, footprint: Footprint): Solid {
  return { ...position, halfWidth: footprint.sliceWidth / 2, halfLength: footprint.sliceHeight / 2 }
}

function fitsOutline(solid: Solid, solids: Solid[]) {
  const { x, y } = solid
  const extentX = 'radius' in solid ? solid.radius
    : Math.abs(Math.cos(solid.angle)) * solid.halfWidth + Math.abs(Math.sin(solid.angle)) * solid.halfLength
  const extentY = 'radius' in solid ? solid.radius
    : Math.abs(Math.sin(solid.angle)) * solid.halfWidth + Math.abs(Math.cos(solid.angle)) * solid.halfLength
  return x - extentX >= 0 && x + extentX <= TABLE_WIDTH && y - extentY >= 0 && y + extentY <= TABLE_HEIGHT
    && !lane.some(sample => overlaps(sample, solid, 0))
    && !solids.some(other => overlaps(solid, other, 4))
}

function addBoundary(side: number, footprints: Record<PropId, Footprint>, props: Prop[], solids: Solid[]) {
  let distance = side > 0 ? 12 : 64
  for (let i = 0; i < route.length; i++) {
    const p = route[i]
    const prev = route[(i + route.length - 1) % route.length]
    distance += Math.hypot(p.x - prev.x, p.y - prev.y)
    const bend = Math.floor(i / SUBDIVISIONS)
    const curved = [1, 3, 4, 5, 7, 8, 9, 11, 12].includes(bend)
    const asset = curved ? 'coin' : bend % 2 === 0 ? 'ruler' : 'pencil'
    const footprint = footprints[asset]
    const { sliceWidth, sliceHeight } = footprint
    if (distance < (curved ? 49 : sliceHeight * 0.85)) continue
    const angle = Math.atan2(p.forward.y, p.forward.x) - Math.PI / 2
    const radius = Math.max(sliceWidth, sliceHeight) / 2
    const clearance = asset === 'coin' ? radius + 2 : sliceWidth / 2 + 7
    for (const extra of asset === 'coin' ? [0] : [0, 8, 16, 24]) {
      const offset = side * (TRACK_HALF_WIDTH + clearance + extra)
      const x = p.x - p.forward.y * offset
      const y = p.y + p.forward.x * offset
      const solid = asset === 'coin' ? { x, y, radius } : boxSolid({ x, y, angle }, footprint)
      if (!fitsOutline(solid, solids)) continue
      props.push({ x, y, angle, asset, solid })
      solids.push(solid)
      distance = 0
      break
    }
  }
}

const mug = { x: 1145, y: 348, angle: 3.93 }
const obstacles = [
  { asset: 'cereal_box', x: 728, y: 280, angle: -0.33 },
  { asset: 'eraser', x: 477, y: 632, angle: 0.42 },
  { asset: 'salt_shaker', x: 957, y: 606, angle: 0 },
  { asset: 'butter_dish', x: 508, y: 428, angle: -0.24 },
  { asset: 'crumb_pile', x: 870, y: 410, angle: 0.71 },
] as const

function mugPoint(offset: number, axis: number): Point {
  return {
    x: mug.x + Math.cos(axis) * offset,
    y: mug.y + Math.sin(axis) * offset,
  }
}

export function buildTrack(footprints: Record<PropId, Footprint>, config = TRACK_CONFIG) {
  const props: Prop[] = []
  const solids: Solid[] = []
  if (config.OBSTACLES) {
    const { sliceWidth, sliceHeight } = footprints.mug
    const bowlWidth = Math.min(sliceWidth, sliceHeight)
    const handleLength = Math.abs(sliceWidth - sliceHeight)
    // The handoff mug's handle extends toward local −X. The placeholder extends toward −Y.
    const axis = sliceWidth >= sliceHeight ? mug.angle : mug.angle + Math.PI / 2
    props.push({ ...mug, asset: 'mug', solid: { ...mugPoint(handleLength / 2, axis), radius: bowlWidth / 2 } })
    for (const { asset, ...position } of obstacles) {
      const footprint = footprints[asset]
      const solid = asset === 'salt_shaker'
        ? { ...position, radius: Math.max(footprint.sliceWidth, footprint.sliceHeight) / 2 }
        : boxSolid(position, footprint)
      props.push({ ...position, asset, solid })
    }
    solids.push(...props.map(prop => prop.solid))
    if (handleLength > 0) {
      const overlap = 2
      solids.push({
        ...mugPoint((-bowlWidth + overlap) / 2, axis), angle: axis,
        halfWidth: (handleLength + overlap) / 2, halfLength: bowlWidth * (sliceWidth >= sliceHeight ? 0.16 : 0.1),
      })
    }
  }
  addBoundary(1, footprints, props, solids)
  addBoundary(-1, footprints, props, solids)
  return { props, solids }
}
