import { describe, expect, it } from 'vitest'
import { createDemo } from './choreography.ts'
import { retime, sampleAt } from './timing.ts'

describe('music mode timing', () => {
  const doc = createDemo()
  const times = (d: typeof doc) => d.formations.map((f) => [f.start, f.end])

  it('holds each formation during its block and moves between blocks', () => {
    const [first, second] = doc.formations
    expect(sampleAt(doc.formations, -1)).toMatchObject({ index: 0, positions: first.positions, moving: false })
    expect(sampleAt(doc.formations, 4)).toMatchObject({ index: 0, positions: first.positions, moving: false })
    expect(sampleAt(doc.formations, 6)).toMatchObject({ index: 1, positions: second.positions, moving: false })
    const halfway = sampleAt(doc.formations, 5)
    const id = doc.dancers[1].id
    expect(halfway).toMatchObject({ index: 0, moving: true })
    expect(halfway.positions[id].x).toBeCloseTo((first.positions[id].x + second.positions[id].x) / 2)
    expect(halfway.positions[id].y).toBeCloseTo((first.positions[id].y + second.positions[id].y) / 2)
    expect(sampleAt(doc.formations, 99)).toMatchObject({ index: 3, positions: doc.formations[3].positions })
  })

  it('pushes overlapping neighbors along, keeping their lengths', () => {
    expect(times(retime(doc, 1, 9, 15))).toEqual([[0, 4], [9, 15], [15, 19], [19, 23]])
    expect(times(retime(doc, 2, 9, 13))).toEqual([[0, 4], [5, 9], [9, 13], [18, 22]])
  })

  it('never starts before the earlier formations fit, and never ends before it starts', () => {
    expect(times(retime(doc, 2, 3, 2))).toEqual([[0, 4], [4, 8], [8, 8], [18, 22]])
  })
})
