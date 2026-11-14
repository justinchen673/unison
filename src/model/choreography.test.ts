import { describe, expect, it } from 'vitest'
import { createDemo, duplicateFormation, moveFormation, removeDancers, removePathPoint, setPathCorners, setPathPoint, straightenPaths } from './choreography.ts'

describe('choreography edits', () => {
  const doc = createDemo()
  const times = (d: typeof doc) => d.formations.map((f) => [f.start, f.end])

  it('inserts a duplicate right after the formation, unnamed and with a fresh id', () => {
    const next = duplicateFormation(doc, 1)
    expect(next.formations).toHaveLength(doc.formations.length + 1)
    expect(next.formations[2]).toMatchObject({ name: '', notes: '', positions: doc.formations[1].positions })
    expect(next.formations[2].id).not.toBe(doc.formations[1].id)
    expect(next.formations[3].id).toBe(doc.formations[2].id)
  })

  it('times a duplicate after the original, moving later formations only when there is no room', () => {
    expect(times(duplicateFormation(doc, 1))).toEqual([[0, 4], [6, 10], [12, 16], [18, 22], [24, 28]])
    expect(times(duplicateFormation(doc, 3))).toEqual([[0, 4], [6, 10], [12, 16], [18, 22], [24, 28]])
    const roomy = { ...doc, formations: doc.formations.map((f, i) => (i < 2 ? f : { ...f, start: f.start + 20, end: f.end + 20 })) }
    expect(times(duplicateFormation(roomy, 1, 15))).toEqual([[0, 4], [6, 10], [15, 19], [32, 36], [38, 42]])
  })

  it('keeps time slots in place when reordering formations', () => {
    const next = moveFormation(doc, 0, 2)
    expect(next.formations.map((f) => f.name)).toEqual(['V', 'Circle', 'Opening line', 'Exit to wings'])
    expect(times(next)).toEqual(times(doc))
  })

  it('adds and removes path points, dropping paths that become straight', () => {
    const id = doc.dancers[0].id
    let next = setPathPoint(doc, 1, id, 0, { along: 0.5, across: 2 }, true)
    next = setPathPoint(next, 1, id, 0, { along: 0.2, across: 1 }, true)
    next = setPathPoint(next, 1, id, 1, { along: 0.6, across: 3 }, false)
    expect(next.formations[1].paths[id].points).toEqual([{ along: 0.2, across: 1 }, { along: 0.6, across: 3 }])
    next = removePathPoint(removePathPoint(next, 1, id, 0), 1, id, 0)
    expect(next.formations[1].paths).toEqual({})
    next = setPathCorners(next, 1, [id], true)
    expect(next.formations[1].paths[id]).toEqual({ points: [], corners: true })
    expect(straightenPaths(setPathPoint(next, 1, id, 0, { along: 0.5, across: 2 }, true), 1, [id]).formations[1].paths[id]).toEqual({ points: [], corners: true })
  })

  it('gives a duplicate no paths, and drops removed dancers\' paths', () => {
    const id = doc.dancers[0].id
    const curved = setPathPoint(doc, 1, id, 0, { along: 0.5, across: 2 }, true)
    expect(duplicateFormation(curved, 1).formations[2].paths).toEqual({})
    expect(removeDancers(curved, [id]).formations[1].paths).toEqual({})
  })

  it('removes dancers from every formation', () => {
    const [gone] = doc.dancers
    const next = removeDancers(doc, [gone.id])
    expect(next.dancers).not.toContain(gone)
    expect(next.formations.every((f) => !(gone.id in f.positions))).toBe(true)
  })
})
