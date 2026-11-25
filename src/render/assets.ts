import { loadManifest, sliceUrl } from './asset-source'
import { cars } from '../game/cars'
import type { CarId } from '../game/cars'
import { propIds } from '../game/track'
import type { PropId } from '../game/track'

export interface AssetEntry {
  slices: number
  sliceWidth: number
  sliceHeight: number
  source: string
  type?: 'stack' | 'direction'
  directions?: number
}

export interface StackAsset extends AssetEntry {
  type?: 'stack'
  pixels: Uint32Array
  footprint: Uint8Array
}

export interface DirectionAsset extends AssetEntry {
  type: 'direction'
  directions: number
  image: HTMLImageElement
}

export type CarAsset = StackAsset | DirectionAsset
export type Assets = Record<PropId, StackAsset> & Record<CarId, CarAsset>

export function validateEntry(id: string, value: unknown): AssetEntry {
  if (!value || typeof value !== 'object') throw new Error(`Missing manifest entry for "${id}"`)
  const entry = value as AssetEntry
  if (![entry.slices, entry.sliceWidth, entry.sliceHeight].every(n => Number.isSafeInteger(n) && n > 0)
    || typeof entry.source !== 'string' || !entry.source.trim()
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
  return entry
}

export function validateStrip(id: string, entry: AssetEntry, width: number, height: number) {
  if (width % entry.slices !== 0 || width / entry.slices !== entry.sliceWidth || height !== entry.sliceHeight) {
    throw new Error(`"${id}" strip is ${width}×${height}; expected ${entry.slices * entry.sliceWidth}×${entry.sliceHeight}`)
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
  if (entry.type === 'direction') throw new Error(`"${id}" requires a stack sprite`)
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
        ? { ...entry, type: entry.type, directions: entry.directions!, image: await loadImage(id, entry) }
        : await loadStack(id, entry)
      return [id, asset] as const
    } catch (error) {
      console.warn(`Could not load "${id}". Falling back to "car_placeholder".`, error)
      fallback ??= loadStackEntry('car_placeholder')
      return [id, await fallback] as const
    }
  })
  const propEntries = propIds.map(async id => [id, await loadStackEntry(id)] as const)
  return Object.fromEntries(await Promise.all([...propEntries, ...carEntries])) as Assets
}
