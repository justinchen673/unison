import { describe, expect, it } from 'vitest'
import { interpolate } from './interpolate.ts'

describe('interpolate', () => {
  it('blends each dancer between two formations; dancers missing from the start stay at their end position', () => {
    const from = { a: { x: 0, y: 0 } }
    const to = { a: { x: 4, y: -2 }, b: { x: 1, y: 1 } }
    expect(interpolate(from, to, 0.5)).toEqual({ a: { x: 2, y: -1 }, b: { x: 1, y: 1 } })
  })
})
