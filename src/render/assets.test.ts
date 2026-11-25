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
  source: 'art/handoff/cars_v3_stripe_8dir.png',
})

describe('car loading', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it.each(['invalid manifest entry', 'missing strip', 'wrong strip dimensions'])('uses the placeholder for a %s', async failure => {
    const fallback = { slices: 1, sliceWidth: 1, sliceHeight: 1, source: 'art/placeholders/car.png' }
    const hero = directionEntry(8)
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
      get naturalHeight() { return /\/car_[12]\.png$/.test(this.src) ? 32 : 1 }
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

  it.each([
    ['car_1', 'stripe', 'Stripe', '#e23a2b'],
    ['car_2', 'pickup', 'Pickup', '#c43c2b'],
    ['car_3', 'f1', 'F1', '#4c8ee7'],
    ['car_4', 'taxi', 'Taxi', '#f0c53a'],
  ] as const)('installs %s from the %s strip', (id, slug, name, color) => {
    const parsed = validateEntry(id, manifest[id])
    expect(parsed).toEqual({
      ...directionEntry(8), source: `art/handoff/cars_v3_${slug}_8dir.png`,
    })
    expect(() => validateStrip(id, parsed, 256, 32)).not.toThrow()
    expect(cars.find(car => car.id === id)).toEqual({ id, name, color })
  })

  it.each([
    ['basket', 223, 209, [2, 2, 221, 207]],
    ['plate', 133, 135, [2, 2, 131, 133]],
    ['sandwich', 83, 99, [2, 2, 81, 97]],
    ['watermelon', 77, 86, [2, 2, 75, 84]],
    ['ketchup', 26, 70, [2, 2, 24, 68]],
    ['mustard', 28, 70, [2, 2, 26, 68]],
    ['fork', 20, 101, [2, 2, 18, 99]],
    ['napkins', 65, 60, [2, 2, 63, 58]],
    ['cup', 46, 69, [2, 2, 44, 67]],
    ['bottle_cap', 25, 24, [2, 3, 23, 21]],
    ['ant', 16, 16, [3, 5, 12, 11]],
    ['ant_walk', 16, 16, [3, 5, 12, 11]],
  ] as const)('validates the %s flat sprite at its native dimensions', (id, width, height, alphaBounds) => {
    const parsed = validateEntry(id, manifest[id])
    expect(parsed).toMatchObject({ type: 'sprite', width, height, alphaBounds, source: `art/handoff/picnic_${id}.png` })
    const frames = id === 'ant_walk' ? 2 : 1
    expect(() => validateStrip(id, parsed, width * frames, height)).not.toThrow()
    expect(() => validateStrip(id, parsed, width * frames, height + 1)).toThrow()
  })

  it('rejects invalid flat sprite sizes, frame counts and alpha bounds', () => {
    const entry = manifest.ant_walk
    for (const bad of [{ ...entry, width: 0 }, { ...entry, height: 1.5 }, { ...entry, frames: 0 },
      { ...entry, alphaBounds: undefined }, { ...entry, alphaBounds: [3, 5, 3, 11] },
      { ...entry, alphaBounds: [3, 5, 17, 11] }, { ...entry, alphaBounds: [-1, 5, 12, 11] }]) {
      expect(() => validateEntry('ant_walk', bad)).toThrow(/flat sprite manifest entry/)
    }
    expect(() => validateStrip('ant_walk', validateEntry('ant_walk', entry), 16, 16)).toThrow(/expected 32×16/)
  })

  it('uses an integer zoom for both gameplay viewport sizes', () => {
    expect(viewportScale(670, 420)).toBe(2)
    expect(viewportScale(669, 420)).toBe(1)
    expect(viewportScale(670, 419)).toBe(1)
  })
})
