import { describe, expect, it } from 'vitest'
import { createDemo } from './choreography.ts'
import { sampleAt, totalDuration } from './timeline.ts'

describe('sampleAt', () => {
  const doc = createDemo()
  const [first, second] = doc.formations
  const id = doc.dancers[0].id

  it('holds a formation, then eases into the next one', () => {
    expect(sampleAt(doc, 1)).toEqual({ index: 0, transition: null, positions: first.positions })
    const midway = sampleAt(doc, first.hold + first.transition / 2)
    expect(midway.index).toBe(0)
    expect(midway.transition).toBeCloseTo(0.5)
    expect(midway.positions[id].y).toBeCloseTo((first.positions[id].y + second.positions[id].y) / 2)
  })

  it('stays on the last formation once the piece is over', () => {
    const last = doc.formations.length - 1
    expect(sampleAt(doc, totalDuration(doc) + 10)).toEqual({ index: last, transition: null, positions: doc.formations[last].positions })
  })
})
