import { describe, expect, it } from 'vitest'
import { validateEntry, validateStrip } from './assets'
import { carTurn } from './stack'

const entry = { slices: 16, sliceWidth: 20, sliceHeight: 36, source: 'art/placeholders/car.png' }

describe('sprite strips', () => {
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
