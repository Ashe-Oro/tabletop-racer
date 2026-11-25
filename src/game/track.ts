import { overlaps } from './collision'
import type { Solid } from './collision'
import type { Footprint, Point } from './geometry'
import type { Gate } from './race'

export const TABLE_WIDTH = 4400
export const TABLE_HEIGHT = 3000
export const TRACK_HALF_WIDTH = 108
export const TRACK_CONFIG = { OBSTACLES: false as boolean }
export const ANT_WALK_DISTANCE = 16

const corners: Point[] = [
  { x: 2100, y: 2500 }, { x: 2770, y: 2500 }, { x: 3450, y: 2420 },
  { x: 3770, y: 2140 }, { x: 3830, y: 1700 }, { x: 3670, y: 1280 },
  { x: 3320, y: 1100 }, { x: 2700, y: 1110 }, { x: 2280, y: 720 },
  { x: 1670, y: 620 }, { x: 1090, y: 740 }, { x: 720, y: 1020 },
  { x: 650, y: 1530 }, { x: 830, y: 1980 }, { x: 1240, y: 2390 },
  { x: 1670, y: 2480 },
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

const segments = route.map((p, i) => {
  const next = route[(i + 1) % route.length]
  return Math.hypot(next.x - p.x, next.y - p.y)
})
export const ROUTE_LENGTH = segments.reduce((total, length) => total + length, 0)

// Pad the circles so they cover the full lane between samples.
const laneRadius = Math.hypot(TRACK_HALF_WIDTH, Math.max(...segments) / 2)
const lane = route.map(({ x, y }) => ({ x, y, radius: laneRadius }))

export const gates: Gate[] = [0, 2, 4, 6, 7, 8, 10, 11, 13, 14].map(corner => ({
  ...route[corner * SUBDIVISIONS], halfWidth: 244,
}))

export const spawn = {
  x: gates[0].x + 22 * gates[0].forward.x,
  y: gates[0].y + 22 * gates[0].forward.y,
  heading: Math.atan2(gates[0].forward.y, gates[0].forward.x),
}

export const propIds = [
  'ruler', 'pencil', 'coin', 'mug', 'cereal_box', 'eraser', 'salt_shaker', 'butter_dish', 'crumb_pile',
  'plate', 'cup', 'basket', 'watermelon', 'ketchup', 'mustard', 'napkins', 'fork', 'sandwich',
  'bottle_cap', 'ant', 'ant_walk',
] as const
export type PropId = typeof propIds[number]

export interface Prop extends Point {
  asset: PropId
  angle: number
}

type Placement = readonly [asset: PropId, x: number, y: number, angle: number]

// Picnic setups, small leftovers and landmarks around the full table.
const picnic: readonly Placement[] = [
  ['basket', 2175, 2250, 0.22], ['plate', 2390, 2310, 0], ['watermelon', 2550, 2205, -0.51],
  ['mustard', 2305, 2115, -0.4], ['sandwich', 2435, 2160, 0.28], ['ketchup', 2520, 2328, 0.16],
  ['bottle_cap', 2290, 2366, -0.33],
  ['cup', 2187, 2670, 0], ['napkins', 2328, 2680, 0.21], ['fork', 2420, 2672, -0.36],
  ['crumb_pile', 2500, 2642, 0], ['cup', 2640, 2330, 0], ['ketchup', 2760, 2285, 1.24],
  ['plate', 2950, 2255, 0], ['watermelon', 3080, 2293, 0.32], ['fork', 3020, 2690, 1.24],
  ['napkins', 3290, 2665, -0.51], ['cup', 3400, 2680, 0], ['basket', 3610, 2695, -0.45],
  ['plate', 4025, 2390, 0], ['napkins', 4160, 2330, 0.62], ['fork', 4200, 2435, 0.38],
  ['sandwich', 3930, 2535, -0.37], ['bottle_cap', 4035, 2535, 0.66],
  ['cup', 4062, 2065, 0], ['ketchup', 4020, 1735, 0.19], ['crumb_pile', 4008, 1840, -0.48],
  ['plate', 3540, 1860, 0], ['watermelon', 3410, 1810, -1.02], ['salt_shaker', 3640, 1898, 0],
  ['basket', 4130, 1360, 0.32], ['cup', 3990, 1245, 0], ['napkins', 4050, 1040, -0.51],
  ['mustard', 4240, 1545, -0.56],
  ['cereal_box', 3510, 1450, -0.36], ['mug', 3440, 1520, 3.2], ['butter_dish', 3445, 1390, -0.61],
  ['plate', 3490, 848, 0], ['fork', 3635, 878, -0.96], ['napkins', 3780, 840, 0.26],
  ['watermelon', 3130, 915, 0.48], ['crumb_pile', 3215, 890, -0.48], ['cup', 3065, 829, 0],
  ['mug', 2920, 1280, 0.64], ['crumb_pile', 2810, 1305, 0], ['salt_shaker', 3060, 1370, 0],
  ['basket', 2750, 740, -0.25], ['plate', 2550, 570, 0], ['ketchup', 2445, 485, 0.74],
  ['sandwich', 2755, 523, 0.58], ['bottle_cap', 2680, 560, 0.4],
  ['fork', 2570, 1280, 0.76], ['plate', 2380, 1185, 0], ['cup', 2290, 1268, 0],
  ['crumb_pile', 2285, 900, -0.24], ['eraser', 2140, 821, 0.54], ['pencil', 1980, 415, -1.03],
  ['mug', 1720, 379, 1.01], ['cereal_box', 1580, 330, -0.25], ['coin', 1650, 432, 0],
  ['basket', 1230, 380, 0.43], ['cup', 1080, 485, 0], ['plate', 912, 462, 0],
  ['napkins', 594, 540, -0.25], ['fork', 494, 579, 1.1], ['watermelon', 480, 825, 0.36],
  ['ketchup', 343, 950, -0.62], ['mustard', 252, 985, 0.22], ['cup', 424, 1123, 0], ['butter_dish', 926, 1018, 0.4],
  ['ruler', 1070, 1045, 1.3], ['pencil', 1180, 1135, 0.7], ['eraser', 1130, 1238, -0.6],
  ['plate', 385, 1430, 0], ['crumb_pile', 412, 1540, 0], ['napkins', 343, 1646, -0.34],
  ['cereal_box', 950, 1565, 0.64], ['mug', 1030, 1610, -1], ['coin', 1002, 1540, 0],
  ['basket', 505, 1920, -0.12], ['cup', 459, 2075, 0], ['salt_shaker', 571, 2045, 0],
  ['sandwich', 400, 2250, -0.58], ['bottle_cap', 513, 2145, 1],
  ['plate', 695, 2230, 0], ['napkins', 698, 2370, -0.82], ['fork', 586, 2244, -0.31],
  ['pencil', 1160, 1980, -0.7], ['ruler', 1280, 2090, 1.12], ['coin', 1310, 2005, 0],
  ['watermelon', 1395, 2690, -0.55], ['cup', 1510, 2650, 0], ['fork', 1618, 2720, 0.8],
  ['butter_dish', 1660, 2270, 0.3], ['mug', 1770, 2255, 2.24], ['eraser', 1830, 2305, -0.48],
  ['watermelon', 1630, 940, 0.22], ['plate', 1750, 1020, 0], ['fork', 1895, 1000, 1.02],
  ['basket', 1420, 1600, -0.38], ['ketchup', 1590, 1530, 0.36], ['cup', 1470, 1755, 0],
  ['mustard', 1655, 1570, 0.61], ['napkins', 2035, 1540, -0.52], ['plate', 2175, 1540, 0],
  ['watermelon', 2130, 1680, -0.21],
  ['salt_shaker', 2000, 1660, 0], ['crumb_pile', 2205, 1705, 0], ['pencil', 2425, 1720, -0.8],
  ['basket', 2780, 1790, 0.34], ['cup', 2930, 1680, 0], ['napkins', 2830, 1980, -0.42],
  ['ruler', 2000, 1980, -1.13], ['eraser', 1940, 2040, -0.21], ['coin', 1900, 2005, 0],
]

function visibleFootprint(asset: Footprint) {
  if ('alphaBounds' in asset) {
    return { width: asset.width, height: asset.height, bounds: asset.alphaBounds }
  }
  const { sliceWidth: width, sliceHeight: height, footprint } = asset
  let left = width
  let top = height
  let right = 0
  let bottom = 0
  if (footprint) {
    for (let i = 0; i < footprint.length; i++) {
      if (!footprint[i]) continue
      const x = i % width
      const y = Math.floor(i / width)
      left = Math.min(left, x)
      top = Math.min(top, y)
      right = Math.max(right, x + 1)
      bottom = Math.max(bottom, y + 1)
    }
  }
  const bounds = left < right && top < bottom ? [left, top, right, bottom] : [0, 0, width, height]
  return { width, height, bounds }
}

function colliders(prop: Prop, footprint: Footprint): Solid[] {
  const { angle, asset } = prop
  if (asset === 'ant' || asset === 'ant_walk') return []
  const { width: frameWidth, height: frameHeight, bounds: [left, top, right, bottom] } = visibleFootprint(footprint)
  const width = right - left
  const length = bottom - top
  // Rotate the visible center around the sprite's canvas-center pivot.
  const dx = (left + right - frameWidth) / 2
  const dy = (top + bottom - frameHeight) / 2
  const x = prop.x + Math.cos(angle) * dx - Math.sin(angle) * dy
  const y = prop.y + Math.sin(angle) * dx + Math.cos(angle) * dy
  if (asset === 'mug') {
    const bowlWidth = Math.min(width, length)
    const handleLength = Math.abs(width - length)
    // The handoff mug handle extends toward local −X. The placeholder extends toward −Y.
    const axis = width >= length ? angle : angle + Math.PI / 2
    const along = (offset: number) => ({
      x: x + Math.cos(axis) * offset,
      y: y + Math.sin(axis) * offset,
    })
    const bowl = { ...along(handleLength / 2), radius: bowlWidth / 2 }
    return handleLength === 0 ? [bowl] : [bowl, {
      ...along((2 - bowlWidth) / 2), angle: axis,
      halfWidth: (handleLength + 2) / 2, halfLength: bowlWidth * (width >= length ? 0.16 : 0.1),
    }]
  }
  if (asset === 'plate' || asset === 'cup' || asset === 'bottle_cap' || asset === 'coin' || asset === 'salt_shaker') {
    return [{ x, y, radius: Math.max(width, length) / 2 }]
  }
  return [{ x, y, angle, halfWidth: width / 2, halfLength: length / 2 }]
}

function insideTable(solid: Solid) {
  const { x, y } = solid
  const extentX = 'radius' in solid ? solid.radius
    : Math.abs(Math.cos(solid.angle)) * solid.halfWidth + Math.abs(Math.sin(solid.angle)) * solid.halfLength
  const extentY = 'radius' in solid ? solid.radius
    : Math.abs(Math.sin(solid.angle)) * solid.halfWidth + Math.abs(Math.cos(solid.angle)) * solid.halfLength
  return x - extentX >= 0 && x + extentX <= TABLE_WIDTH && y - extentY >= 0 && y + extentY <= TABLE_HEIGHT
}

export function buildTrack(footprints: Record<PropId, Footprint>, config = TRACK_CONFIG) {
  const props: Prop[] = []
  const solids: Solid[] = []
  const add = (prop: Prop, keepLaneClear: boolean) => {
    const shapes = colliders(prop, footprints[prop.asset])
    if (!shapes.every(shape => insideTable(shape)
        && !solids.some(other => overlaps(shape, other, 6))
        && (!keepLaneClear || !lane.some(sample => overlaps(sample, shape, 0))))) return
    props.push(prop)
    solids.push(...shapes)
  }

  for (const [asset, x, y, angle] of picnic) add({ asset, x, y, angle }, true)

  for (const { asset, x, y } of [...props]) {
    if (asset !== 'watermelon' && asset !== 'crumb_pile') continue
    for (const [id, dx, dy, angle] of [
      ['ant', -44, 28, 0.9], ['ant_walk', -59, 35, 1.1], ['ant_walk', -76, 38, 1.4],
    ] as const) {
      const ant = { x: x + dx, y: y + dy, radius: 5 + (id === 'ant_walk' ? ANT_WALK_DISTANCE : 0) }
      if (insideTable(ant) && !solids.some(solid => overlaps(ant, solid, 0))
          && !lane.some(sample => overlaps(ant, sample, 0))) {
        props.push({ asset: id, x: ant.x, y: ant.y, angle })
      }
    }
  }

  if (config.OBSTACLES) {
    const challenges = [
      ['cup', 1, 18], ['napkins', 3, 13], ['ketchup', 5, 17],
      ['cereal_box', 8, 18], ['eraser', 11, 16], ['plate', 13, 16],
    ] as const
    for (const [asset, corner, offset] of challenges) {
      const { x, y, forward } = route[corner * SUBDIVISIONS + offset]
      add({ asset, x, y, angle: Math.atan2(forward.y, forward.x) + 0.7 }, false)
    }
  }
  return { props, solids }
}
