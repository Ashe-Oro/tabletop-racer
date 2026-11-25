import { loadManifest, sliceUrl } from './asset-source'
import { cars } from '../game/cars'
import type { CarId } from '../game/cars'
import { propIds } from '../game/track'
import type { PropId } from '../game/track'

interface StripEntry {
  slices: number
  sliceWidth: number
  sliceHeight: number
  source: string
}

interface StackEntry extends StripEntry {
  type?: 'stack'
}

interface DirectionEntry extends StripEntry {
  type: 'direction'
  directions: number
}

interface SpriteEntry {
  type: 'sprite'
  source: string
  width: number
  height: number
  frames?: number
  alphaBounds: readonly [number, number, number, number]
}

export type AssetEntry = StackEntry | DirectionEntry | SpriteEntry

export interface StackAsset extends StackEntry {
  pixels: Uint32Array
  footprint: Uint8Array
}

export interface DirectionAsset extends DirectionEntry {
  image: HTMLImageElement
}

export interface FlatAsset extends SpriteEntry {
  image: HTMLImageElement
}

export type CarAsset = StackAsset | DirectionAsset
type PropAsset = StackAsset | FlatAsset
export type Assets = Record<PropId, PropAsset> & Record<CarId, CarAsset>

function positiveInteger(n: unknown): n is number {
  return typeof n === 'number' && Number.isSafeInteger(n) && n > 0
}

export function validateEntry(id: string, value: unknown): AssetEntry {
  if (!value || typeof value !== 'object') throw new Error(`Missing manifest entry for "${id}"`)
  const entry = value as Record<string, unknown>
  if (typeof entry.source !== 'string' || !entry.source.trim()) {
    throw new Error(`Invalid manifest entry for "${id}"`)
  }
  if (entry.type === 'sprite') {
    const { width, height, frames, alphaBounds } = entry
    if (!positiveInteger(width) || !positiveInteger(height)
      || (frames !== undefined && !positiveInteger(frames))
      || !Array.isArray(alphaBounds) || alphaBounds.length !== 4 || !alphaBounds.every(Number.isSafeInteger)
      || alphaBounds[0] < 0 || alphaBounds[1] < 0
      || alphaBounds[2] <= alphaBounds[0] || alphaBounds[3] <= alphaBounds[1]
      || alphaBounds[2] > width || alphaBounds[3] > height) {
      throw new Error(`Invalid flat sprite manifest entry for "${id}"`)
    }
    return entry as unknown as SpriteEntry
  }
  if (![entry.slices, entry.sliceWidth, entry.sliceHeight].every(positiveInteger)
    || (entry.type !== undefined && entry.type !== 'stack' && entry.type !== 'direction')) {
    throw new Error(`Invalid manifest entry for "${id}"`)
  }
  if (entry.type === 'direction') {
    if (typeof entry.directions !== 'number' || entry.slices !== entry.directions
        || ![8, 16, 32].includes(entry.directions)
        || entry.sliceWidth !== entry.sliceHeight) {
      throw new Error(`Invalid direction sheet manifest entry for "${id}"`)
    }
  } else if (entry.directions !== undefined) {
    throw new Error(`Unexpected directions in stack manifest entry for "${id}"`)
  }
  return entry as unknown as AssetEntry
}

export function validateStrip(id: string, entry: AssetEntry, width: number, height: number) {
  const expectedWidth = entry.type === 'sprite' ? entry.width * (entry.frames ?? 1) : entry.slices * entry.sliceWidth
  const expectedHeight = entry.type === 'sprite' ? entry.height : entry.sliceHeight
  if (width !== expectedWidth || height !== expectedHeight) {
    throw new Error(`"${id}" strip is ${width}×${height}; expected ${expectedWidth}×${expectedHeight}`)
  }
}

export function makeCanvas(width: number, height: number) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D is unavailable.')
  ctx.imageSmoothingEnabled = false
  return { canvas, ctx }
}

async function loadImage(id: string, entry: AssetEntry) {
  const image = new Image()
  image.src = sliceUrl(id)
  await image.decode()
  validateStrip(id, entry, image.naturalWidth, image.naturalHeight)
  return image
}

async function loadStack(id: string, entry: AssetEntry): Promise<StackAsset> {
  if (entry.type === 'direction' || entry.type === 'sprite') throw new Error(`"${id}" requires a stack sprite`)
  const image = await loadImage(id, entry)
  const { ctx } = makeCanvas(image.naturalWidth, image.naturalHeight)
  ctx.drawImage(image, 0, 0)
  const rgba = ctx.getImageData(0, 0, image.naturalWidth, image.naturalHeight).data
  const strip = new Uint32Array(rgba.buffer)
  const { slices, sliceWidth: w, sliceHeight: h } = entry
  const area = w * h
  const pixels = new Uint32Array(area * slices)
  const footprint = new Uint8Array(area)
  for (let z = 0; z < slices; z++) {
    for (let y = 0; y < h; y++) {
      const offset = y * image.naturalWidth + z * w
      pixels.set(strip.subarray(offset, offset + w), z * area + y * w)
      for (let x = 0; x < w; x++) {
        if (rgba[(offset + x) * 4 + 3]) footprint[y * w + x] = 1
      }
    }
  }
  return { ...entry, type: entry.type, pixels, footprint }
}

export async function loadAssets(): Promise<Assets> {
  const manifest = await loadManifest()
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) throw new Error('Invalid asset manifest')
  const manifestEntries = manifest as Record<string, unknown>
  const loadStackEntry = (id: string) => loadStack(id, validateEntry(id, manifestEntries[id]))
  let fallback: Promise<StackAsset> | undefined
  const carEntries = cars.map(async ({ id }) => {
    try {
      const entry = validateEntry(id, manifestEntries[id])
      const asset = entry.type === 'direction'
        ? { ...entry, image: await loadImage(id, entry) }
        : await loadStack(id, entry)
      return [id, asset] as const
    } catch (error) {
      console.warn(`Could not load "${id}". Falling back to "car_placeholder".`, error)
      fallback ??= loadStackEntry('car_placeholder')
      return [id, await fallback] as const
    }
  })
  async function loadProp(id: PropId): Promise<PropAsset> {
    const entry = validateEntry(id, manifestEntries[id])
    return entry.type === 'sprite' ? { ...entry, image: await loadImage(id, entry) } : loadStack(id, entry)
  }
  const ant = loadProp('ant')
  const propEntries = propIds.map(async id => {
    if (id === 'ant') return [id, await ant] as const
    try {
      return [id, await loadProp(id)] as const
    } catch (error) {
      if (id !== 'ant_walk') throw error
      console.warn('Could not load "ant_walk". Falling back to "ant".', error)
      return [id, await ant] as const
    }
  })
  return Object.fromEntries(await Promise.all([...propEntries, ...carEntries])) as Assets
}
