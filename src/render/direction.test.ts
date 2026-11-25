import { describe, expect, it, vi } from 'vitest'
import type { DirectionAsset } from './assets'
import { DirectionSprite, directionFrame, directionSourceFrame } from './direction'
import { SQUASH } from './stack'

describe('car direction frames', () => {
  it.each([
    ['E', 0], ['SE', 1], ['S', 2], ['SW', 3],
    ['W', 4], ['NW', 5], ['N', 6], ['NE', 7],
  ])('maps %s across full clockwise and counterclockwise revolutions', (_, frame) => {
    const heading = frame * Math.PI / 4
    for (const turns of [-3, -1, 0, 1, 3]) {
      expect(directionFrame(heading + turns * 2 * Math.PI, 8)).toBe(frame)
    }
  })

  it('selects the closest direction at the east wraparound', () => {
    expect(directionFrame(-Math.PI / 9, 8)).toBe(0)
    expect(directionFrame(Math.PI / 9, 8)).toBe(0)
    expect(directionFrame(-Math.PI / 7, 8)).toBe(7)
    expect(directionFrame(Math.PI / 7, 8)).toBe(1)
  })

  it.each([
    ['stripe', [0, 3, 2, 1, 4, 7, 6, 5]],
    ['pickup', [0, 3, 2, 1, 4, 5, 6, 7]],
    ['f1', [0, 3, 2, 1, 4, 5, 6, 7]],
    ['taxi', [0, 3, 2, 1, 4, 7, 6, 5]],
  ])('selects the correct image in the shipped %s strip', (car, sourceFrames) => {
    const asset = { source: `art/handoff/cars_v3_${car}_8dir.png`, directions: 8 }
    expect(sourceFrames.map((_, frame) => directionSourceFrame(frame, asset))).toEqual(sourceFrames)
  })

  it.each([8, 16, 32])('uses canonical order in other %i-direction strips', directions => {
    const frames = Array.from({ length: directions }, (_, frame) => frame)
    expect(frames.map(frame => directionSourceFrame(frame, { source: 'custom.png', directions }))).toEqual(frames)
  })

  it('draws the remapped body and shadow at the same wrapped screen-space rotation', () => {
    const ctx = {
      save: vi.fn(), restore: vi.fn(), translate: vi.fn(), rotate: vi.fn(),
      drawImage: vi.fn(), clearRect: vi.fn(), fillRect: vi.fn(),
    }
    const masks: unknown[] = []
    vi.stubGlobal('document', { createElement: () => {
      const canvas = { width: 0, height: 0, getContext: () => ({ ...ctx, canvas }) }
      masks.push(canvas)
      return canvas
    } })
    try {
      const asset: DirectionAsset = {
        type: 'direction', source: 'art/handoff/cars_v3_f1_8dir.png', directions: 8,
        slices: 8, sliceWidth: 32, sliceHeight: 32, image: {} as HTMLImageElement,
      }
      const sprite = new DirectionSprite(asset)
      const draw = (heading: number) => {
        ctx.rotate.mockClear()
        ctx.drawImage.mockClear()
        sprite.setHeading(heading)
        const canvasContext = ctx as unknown as CanvasRenderingContext2D
        sprite.draw(canvasContext, 100, 100, 2, 'shadow')
        sprite.draw(canvasContext, 100, 100, 2, 'body')
      }
      for (const frame of [0, 1, 2, 3, 4, 5, 6, 7]) {
        for (const turns of [-1, 0, 1]) {
          draw(frame * Math.PI / 4 + turns * 2 * Math.PI)
          const source = [0, 3, 2, 1, 4, 5, 6, 7][frame]
          expect(ctx.rotate.mock.calls).toEqual([[0], [0]])
          expect(ctx.drawImage.mock.calls[0][0]).toBe(masks[source])
          expect(ctx.drawImage.mock.calls[1].slice(0, 2)).toEqual([asset.image, source * 32])
        }
      }

      const heading = -Math.PI + 0.1
      draw(heading)
      const [[shadowRotation], [bodyRotation]] = ctx.rotate.mock.calls
      expect(shadowRotation).toBe(bodyRotation)
      expect(bodyRotation).toBeCloseTo(Math.atan(Math.tan(0.1) * SQUASH), 12)
    } finally {
      vi.unstubAllGlobals()
    }
  })
})
