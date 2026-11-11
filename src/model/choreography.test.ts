import { describe, expect, it } from 'vitest'
import { createDemo, duplicateFormation, removeDancers } from './choreography.ts'

describe('choreography edits', () => {
  const doc = createDemo()

  it('inserts a duplicate right after the formation, unnamed and with a fresh id', () => {
    const next = duplicateFormation(doc, 1)
    expect(next.formations).toHaveLength(doc.formations.length + 1)
    expect(next.formations[2]).toMatchObject({ name: '', notes: '', positions: doc.formations[1].positions })
    expect(next.formations[2].id).not.toBe(doc.formations[1].id)
    expect(next.formations[3]).toBe(doc.formations[2])
  })

  it('removes dancers from every formation', () => {
    const [gone] = doc.dancers
    const next = removeDancers(doc, [gone.id])
    expect(next.dancers).not.toContain(gone)
    expect(next.formations.every((f) => !(gone.id in f.positions))).toBe(true)
  })
})
