import { describe, expect, it } from 'vitest'
import { interpolate } from './interpolate.ts'
import { fromStage, pointAlong, route, toStage } from './path.ts'

const close = (p: { x: number; y: number }, x: number, y: number) => {
  expect(p.x).toBeCloseTo(x)
  expect(p.y).toBeCloseTo(y)
}

describe('custom paths', () => {
  const a = { x: 0, y: 0 }
  const b = { x: 10, y: 0 }

  it('stores points relative to the move, so the shape follows when a spot moves', () => {
    const p = fromStage({ x: 5, y: 3 }, a, b)
    expect(p).toEqual({ along: 0.5, across: 3 })
    close(toStage(p, a, { x: 20, y: 0 }), 10, 3)
    close(toStage(p, a, { x: 0, y: 10 }), -3, 5)
  })

  it('measures in feet from the spot when a dancer stays put, so they can still loop around', () => {
    close(toStage(fromStage({ x: 2, y: -1 }, a, a), a, a), 2, -1)
  })

  it('goes through every point, as sharp corners or a smooth curve', () => {
    const points = [{ along: 0.5, across: 5 }]
    expect(route(a, b, { points, corners: true })).toEqual([a, { x: 5, y: 5 }, b])
    const curve = route(a, b, { points, corners: false })
    expect(curve.length).toBeGreaterThan(10)
    expect(curve.some((p) => Math.abs(p.x - 5) < 1e-9 && Math.abs(p.y - 5) < 1e-9)).toBe(true)
    expect(curve.at(-1)).toEqual(b)
  })

  it('moves dancers along the path at an even pace, forward and backward', () => {
    const paths = { d: { points: [{ along: 0.5, across: 5 }], corners: true } }
    close(pointAlong([a, { x: 0, y: 10 }, { x: 10, y: 10 }], 0.75), 5, 10)
    close(interpolate({ d: a }, { d: b }, 0.5, paths).d, 5, 5)
    close(interpolate({ d: b }, { d: a }, 0.25, paths, true).d, 7.5, 2.5)
    close(interpolate({ d: a }, { d: b }, 0.5).d, 5, 0)
  })
})
