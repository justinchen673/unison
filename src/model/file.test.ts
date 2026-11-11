import { describe, expect, it } from 'vitest'
import { createDemo } from './choreography.ts'
import { parseChoreography, serialize } from './file.ts'

describe('parseChoreography', () => {
  it('round-trips a saved piece', () => {
    const doc = createDemo()
    expect(parseChoreography(serialize(doc))).toEqual(doc)
  })

  it('rejects files that are not Unison pieces', () => {
    expect(() => parseChoreography('not json')).toThrow('not valid JSON')
    expect(() => parseChoreography('{"hello": 1}')).toThrow('not a Unison file')
  })

  it("fills in missing dancer details and positions (from the previous formation)", () => {
    const doc = parseChoreography(JSON.stringify({
      format: 'unison', version: 1, dancers: [{ id: 'a' }, { id: 'b' }],
      formations: [{ positions: { a: { x: 1, y: 2 }, b: { x: 3, y: 0 } } }, { positions: { a: { x: 0, y: 0 } } }],
    }))
    expect(doc.dancers[1]).toMatchObject({ name: 'Dancer 2', label: '2' })
    expect(doc.formations[1].positions).toEqual({ a: { x: 0, y: 0 }, b: { x: 3, y: 0 } })
  })
})
