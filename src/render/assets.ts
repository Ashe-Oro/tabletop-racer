export interface AssetEntry {
  slices: number
  sliceWidth: number
  sliceHeight: number
  source: string
}

export interface StackAsset extends AssetEntry {
  pixels: Uint32Array
  footprint: Uint8Array
}

export const assetIds = [
  'car', 'pencil', 'coin', 'ruler', 'mug', 'cereal_box', 'eraser',
  'salt_shaker', 'butter_dish', 'crumb_pile',
] as const
export type AssetId = typeof assetIds[number]
type StackId = AssetId | 'car_placeholder'

export function validateEntry(id: string, value: unknown): AssetEntry {
  if (!value || typeof value !== 'object') throw new Error(`Missing manifest entry for "${id}"`)
  const entry = value as AssetEntry
  if (![entry.slices, entry.sliceWidth, entry.sliceHeight].every(n => Number.isSafeInteger(n) && n > 0)
    || typeof entry.source !== 'string' || !entry.source.trim()) {
    throw new Error(`Invalid manifest entry for "${id}"`)
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

async function loadStack(id: StackId, entry: AssetEntry, base: string): Promise<StackAsset> {
  const image = new Image()
  image.src = `${base}slices/${id}.png`
  await image.decode()
  validateStrip(id, entry, image.naturalWidth, image.naturalHeight)
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
  return { ...entry, pixels, footprint }
}

export async function loadAssets(): Promise<Record<AssetId, StackAsset>> {
  const base = `${import.meta.env.BASE_URL}assets/`
  const result = await fetch(`${base}manifest.json`, { cache: 'no-cache' })
  if (!result.ok) throw new Error(`Asset manifest request returned ${result.status}`)
  const manifest: unknown = await result.json()
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) throw new Error('Invalid asset manifest')
  const manifestEntries = manifest as Record<string, unknown>
  const load = async (id: StackId) => loadStack(id, validateEntry(id, manifestEntries[id]), base)
  const entries = await Promise.all(assetIds.map(async id => {
    const asset = id === 'car' ? await load(id).catch(error => {
      console.warn('Could not load "car". Falling back to "car_placeholder".', error)
      return load('car_placeholder')
    }) : await load(id)
    return [id, asset] as const
  }))
  return Object.fromEntries(entries) as Record<AssetId, StackAsset>
}
