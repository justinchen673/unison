import { describe, expect, it } from 'vitest'
import { dragOffset } from './stage.ts'

describe('dragOffset', () => {
  const stage = { width: 12, depth: 8 }
  const positions = { a: { x: 0, y: 0 }, b: { x: 1.25, y: 1 } }

  it('snaps the grabbed dancer to the half-unit grid and moves the group rigidly', () => {
    expect(dragOffset(positions, ['a', 'b'], 'a', { x: 0.7, y: 0.8 }, stage, true)).toEqual({ x: 0.5, y: 1 })
  })

  it('stops the group at the outer edge of the wings and the stage depth', () => {
    expect(dragOffset(positions, ['a', 'b'], 'a', { x: 20, y: 20 }, stage, false)).toEqual({ x: 6.75, y: 3 })
  })
})
