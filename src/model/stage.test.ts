import { describe, expect, it } from 'vitest'
import { dragOffset } from './stage.ts'

describe('dragOffset', () => {
  const stage = { width: 40, depth: 24, grid: 2 }
  const positions = { a: { x: 0, y: 0 }, b: { x: 1.5, y: 1 } }

  it('snaps the grabbed dancer to half a grid square and moves the group rigidly', () => {
    expect(dragOffset(positions, ['a', 'b'], 'a', { x: 0.7, y: 1.4 }, stage, true)).toEqual({ x: 1, y: 1 })
    expect(dragOffset(positions, ['a', 'b'], 'a', { x: 2, y: 4 }, { ...stage, grid: 3 }, true)).toEqual({ x: 1.5, y: 4.5 })
  })

  it('stops the group at the outer edge of the wings and the stage depth', () => {
    expect(dragOffset(positions, ['a', 'b'], 'a', { x: 50, y: 50 }, stage, false)).toEqual({ x: 24.5, y: 11 })
  })
})
