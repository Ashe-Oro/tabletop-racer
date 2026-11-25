import { afterEach, describe, expect, it, vi } from 'vitest'
import manifest from '../../public/assets/manifest.json'
import { cars } from '../game/cars'
import { propIds } from '../game/track'
import { loadAssets, validateEntry, validateStrip } from './assets'
import { directionFrame } from './direction'
import { viewportScale } from './scene'
import { carTurn } from './stack'

const entry = { slices: 16, sliceWidth: 20, sliceHeight: 36, source: 'art/placeholders/car.png' }
const carIds = cars.map(({ id }) => id)
const directionEntry = (directions: number) => ({
  type: 'direction' as const, directions, slices: directions, sliceWidth: 32, sliceHeight: 32,
  source: 'art/handoff/cars_v3_hero_red_8dir.png',
})

describe('car loading', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it.each(['invalid manifest entry', 'missing strip', 'wrong strip dimensions'])('uses the placeholder for a %s', async failure => {
    const fallback = { slices: 1, sliceWidth: 1, sliceHeight: 1, source: 'art/placeholders/car.png' }
    const hero = { ...fallback, source: 'art/handoff/hero_car_a_fourview.png' }
    const fixtures = {
      ...Object.fromEntries([...propIds, ...carIds].map(id => [id, fallback])),
      car_1: failure === 'invalid manifest entry' ? { ...hero, slices: 0 } : hero,
      car_2: directionEntry(16),
      car_placeholder: fallback,
    }
    const decode = vi.fn(async (src: string) => {
      if (src.endsWith('/car_1.png') && failure === 'missing strip') throw new Error('Missing image')
    })
    vi.stubGlobal('fetch', async () => Response.json(fixtures))
    vi.stubGlobal('Image', class {
      src = ''
      get naturalHeight() { return this.src.endsWith('/car_2.png') ? 32 : 1 }
      get naturalWidth() {
        if (this.src.endsWith('/car_1.png')) return 2
        if (this.src.endsWith('/car_2.png')) return 512
        return 1
      }
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

    expect(Object.keys(assets)).toEqual([...propIds, ...carIds])
    expect(assets.car_1).toMatchObject({ ...fallback, footprint: new Uint8Array([1]) })
    expect(assets.car_2).toMatchObject({ ...directionEntry(16), image: expect.any(Image) })
    expect(decode).toHaveBeenCalledWith(expect.stringMatching(/\/slices\/car_placeholder\.png$/))
    expect(warn).toHaveBeenCalledExactlyOnceWith(expect.stringContaining('car_placeholder'), expect.any(Error))
  })
})

describe('sprite strips', () => {
  it('validates the Artist set in the manifest and keeps a car fallback', () => {
    const artistIds = [
      'car', 'pencil', 'coin', 'ruler', 'mug', 'cereal_box', 'eraser',
      'salt_shaker', 'butter_dish', 'crumb_pile',
    ] as const
    for (const id of artistIds) {
      const source = validateEntry(id, manifest[id]).source
      expect(source).toMatch(/^art\/handoff\//)
      expect(source).not.toMatch(/_v1_/)
    }
    expect(validateEntry('car_placeholder', manifest.car_placeholder).source).toBe('art/placeholders/car.png')
    expect(manifest.coin.source).toBe('art/handoff/prop_coin_stack_slices.png')
    expect(manifest.car.source).toBe('art/handoff/hero_car_a_slices.png')
    expect(manifest.pencil.source).toBe('art/handoff/prop_pencil_slices.png')
    expect(manifest.ruler.source).toBe('art/handoff/prop_ruler_slices.png')
    for (const id of [...propIds, ...carIds]) expect(validateEntry(id, manifest[id])).toBeTruthy()
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

  it.each([8, 16, 32])('validates %i-direction manifests and clockwise frame order', directions => {
    const entry = directionEntry(directions)
    expect(validateEntry('car_1', entry)).toEqual(entry)
    expect(() => validateStrip('car_1', entry, directions * 32, 32)).not.toThrow()
    expect(() => validateStrip('car_1', entry, directions * 32 - 1, 32)).toThrow()
    const compass = { E: 0, SE: 1, S: 2, SW: 3, W: 4, NW: 5, N: 6, NE: 7 }
    for (const octant of Object.values(compass)) {
      const heading = octant * Math.PI / 4
      const expected = octant * directions / 8
      expect(directionFrame(heading, directions)).toBe(expected)
      expect(directionFrame(heading - 4 * Math.PI, directions)).toBe(expected)
    }
    const frameAngle = 2 * Math.PI / directions
    expect(directionFrame(frameAngle * 0.49, directions)).toBe(0)
    expect(directionFrame(frameAngle * 0.51, directions)).toBe(1)
    expect(directionFrame(-frameAngle * 0.51, directions)).toBe(directions - 1)
  })

  it('rejects invalid direction metadata and non-square strips', () => {
    const entry = directionEntry(8)
    for (const bad of [{ ...entry, directions: undefined }, { ...entry, directions: 16 },
      directionEntry(24), { ...entry, sliceWidth: 31 }, { ...entry, type: 'stack' },
      { ...entry, type: 'animated' }]) {
      expect(() => validateEntry('car_1', bad)).toThrow(/manifest entry/)
    }
  })

  it('uses an integer zoom for both gameplay viewport sizes', () => {
    expect(viewportScale(670, 420)).toBe(2)
    expect(viewportScale(669, 420)).toBe(1)
    expect(viewportScale(670, 419)).toBe(1)
  })
})
