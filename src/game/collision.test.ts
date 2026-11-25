import { describe, expect, it } from 'vitest'
import { boxContact, circleContact, overlaps, resolveContact, tableContacts } from './collision'

describe('arcade contacts', () => {
  it('uses radial circle normals, including at coincident centres', () => {
    const obstacle = { x: 0, y: 0, radius: 3 }
    expect(circleContact({ x: 3, y: 4, radius: 3 }, obstacle)).toEqual({
      depth: 1, normal: { x: 0.6, y: 0.8 },
    })
    expect(circleContact({ x: 10, y: 0, radius: 3 }, obstacle)).toBeUndefined()
    expect(circleContact({ x: 0, y: 0, radius: 3 }, obstacle)).toEqual({
      depth: 6, normal: { x: 1, y: 0 },
    })
  })

  it('detects the thin face of a rotated box and pushes an interior circle out', () => {
    const ruler = { x: 10, y: 20, halfWidth: 2, halfLength: 10, angle: Math.PI / 2 }
    const edge = boxContact({ x: 14, y: 23, radius: 2 }, ruler)
    expect(edge?.depth).toBeCloseTo(1)
    expect(edge?.normal.x).toBeCloseTo(0)
    expect(edge?.normal.y).toBeCloseTo(1)
    const inside = boxContact({ x: 14, y: 21, radius: 2 }, ruler)
    expect(inside?.depth).toBeCloseTo(3)
    expect(boxContact({ x: 24, y: 21, radius: 2 }, ruler)).toBeUndefined()
  })

  it('uses the diagonal normal at a box corner', () => {
    const contact = boxContact({ x: 3, y: 3, radius: 2 }, {
      x: 0, y: 0, halfWidth: 2, halfLength: 2, angle: 0,
    })
    expect(contact?.depth).toBeCloseTo(2 - Math.SQRT2)
    expect(contact?.normal.x).toBeCloseTo(Math.SQRT1_2)
    expect(contact?.normal.y).toBeCloseTo(Math.SQRT1_2)
  })

  it('bounces normal velocity while preserving tangential motion and avoids a second impulse', () => {
    const position = { x: 2, y: 0 }
    const velocity = { x: -10, y: 6 }
    const contact = { normal: { x: 1, y: 0 }, depth: 2 }
    expect(resolveContact(position, velocity, contact, 0.7)).toBe(10)
    expect(position.x).toBeCloseTo(4.03)
    expect(velocity).toEqual({ x: 7, y: 6 })
    expect(resolveContact(position, velocity, contact, 0.7)).toBe(0)
    expect(velocity).toEqual({ x: 7, y: 6 })
  })

  it('keeps clearance between rotated track props', () => {
    const horizontal = { x: 0, y: 0, halfWidth: 10, halfLength: 50, angle: Math.PI / 2 }
    const vertical = { x: 63, y: 0, halfWidth: 10, halfLength: 50, angle: 0 }
    expect(overlaps(horizontal, vertical, 0)).toBe(false)
    expect(overlaps(horizontal, vertical, 4)).toBe(true)
    expect(overlaps(horizontal, { x: -30, y: 30, radius: 11 }, 4)).toBe(false)
    expect(overlaps(horizontal, { x: 30, y: 23, radius: 11 }, 4)).toBe(true)
  })

  it('produces separate wall contacts at a tabletop corner', () => {
    expect(tableContacts({ x: 98, y: 1, radius: 5 }, 100, 60)).toEqual([
      { normal: { x: -1, y: 0 }, depth: 3 },
      { normal: { x: 0, y: 1 }, depth: 4 },
    ])
  })
})
