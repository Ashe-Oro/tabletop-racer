export interface Point {
  x: number
  y: number
}

interface StackFootprint {
  sliceWidth: number
  sliceHeight: number
  footprint?: Uint8Array
}

interface SpriteFootprint {
  width: number
  height: number
  alphaBounds: readonly number[]
}

export type Footprint = StackFootprint | SpriteFootprint

export const dot = (a: Point, b: Point) => a.x * b.x + a.y * b.y
export const delta = (a: Point, b: Point): Point => ({ x: a.x - b.x, y: a.y - b.y })
export const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))
