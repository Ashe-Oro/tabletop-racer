import { afterEach, describe, expect, it, vi } from 'vitest'
import manifest from '../../public/assets/manifest.json'
import { assetIds, loadAssets, validateEntry, validateStrip } from './assets'
import { carTurn } from './stack'

const entry = { slices: 16, sliceWidth: 20, sliceHeight: 36, source: 'art/placeholders/car.png' }

describe('car loading', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it.each(['invalid manifest entry', 'missing strip', 'wrong strip dimensions'])('uses the placeholder for a %s', async failure => {
    const fallback = { slices: 1, sliceWidth: 1, sliceHeight: 1, source: 'art/placeholders/car.png' }
    const hero = { ...fallback, source: 'art/handoff/hero_car_a_fourview.png' }
    const manifest = {
      ...Object.fromEntries(assetIds.map(id => [id, fallback])),
      car: failure === 'invalid manifest entry' ? { ...hero, slices: 0 } : hero,
      car_placeholder: fallback,
    }
    const decode = vi.fn(async (src: string) => {
      if (src.endsWith('/car.png') && failure === 'missing strip') throw new Error('Missing image')
    })
    vi.stubGlobal('fetch', async () => Response.json(manifest))
    vi.stubGlobal('Image', class {
      src = ''
      naturalHeight = 1
      get naturalWidth() { return this.src.endsWith('/car.png') ? 2 : 1 }
      decode() { return decode(this.src) }
    })
    vi.stubGlobal('document', {
      createElement: () => ({ getContext: () => ({
        drawImage: vi.fn(),
        getImageData: () => ({ data: new Uint8ClampedArray([0, 0, 0, 255]) }),
      }) }),
    })
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const assets = await loadAssets()

    expect(Object.keys(assets)).toEqual([...assetIds])
    expect(assets.car).toMatchObject({ ...fallback, footprint: new Uint8Array([1]) })
    expect(decode).toHaveBeenCalledWith(expect.stringMatching(/\/slices\/car_placeholder\.png$/))
    expect(warn).toHaveBeenCalledExactlyOnceWith(expect.stringContaining('car_placeholder'), expect.any(Error))
  })
})

describe('sprite strips', () => {
  it('validates the full Artist v1 set in the manifest and keeps a car fallback', () => {
    expect(assetIds).toEqual([
      'car', 'pencil', 'coin', 'ruler', 'mug', 'cereal_box', 'eraser',
      'salt_shaker', 'butter_dish', 'crumb_pile',
    ])
    for (const id of assetIds) {
      expect(validateEntry(id, manifest[id]).source).toMatch(/^art\/handoff\//)
    }
    expect(validateEntry('car_placeholder', manifest.car_placeholder).source).toBe('art/placeholders/car.png')
    expect(manifest.coin.source).toBe('art/handoff/prop_coin_stack_fourview.png')
    expect(manifest.pencil.source).toBe('art/handoff/prop_pencil_slices.png')
    expect(manifest.ruler.source).toBe('art/handoff/prop_ruler_slices.png')
  })

  it('accepts a complete manifest entry and its exact strip dimensions', () => {
    expect(validateEntry('car', entry)).toEqual(entry)
    expect(() => validateStrip('car', entry, 320, 36)).not.toThrow()
  })

  it('rejects missing or malformed entries', () => {
    for (const bad of [undefined, { ...entry, slices: 0 }, { ...entry, slices: '16' },
      { ...entry, sliceWidth: 20.5 }, { ...entry, sliceHeight: Infinity }, { ...entry, source: '' }]) {
      expect(() => validateEntry('car', bad)).toThrow(/manifest entry/)
    }
  })

  it('rejects non-divisible widths, mismatched slice widths and mismatched heights', () => {
    for (const [w, h] of [[319, 36], [336, 36], [320, 35]]) {
      expect(() => validateStrip('car', entry, w, h)).toThrow(/expected 320×36/)
    }
  })

  it('rotates the native down-facing nose into each forward heading', () => {
    for (const heading of [0, Math.PI / 2, Math.PI, -Math.PI / 2, 0.63]) {
      const turn = carTurn(heading)
      expect(-Math.sin(turn)).toBeCloseTo(Math.cos(heading))
      expect(Math.cos(turn)).toBeCloseTo(Math.sin(heading))
    }
  })
})
