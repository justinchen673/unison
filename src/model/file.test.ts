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
      format: 'unison', version: 2, dancers: [{ id: 'a' }, { id: 'b' }],
      formations: [{ positions: { a: { x: 1, y: 2 }, b: { x: 3, y: 0 } } }, { positions: { a: { x: 0, y: 0 } } }],
    }))
    expect(doc.dancers[1]).toMatchObject({ name: 'Dancer 2', label: '2' })
    expect(doc.stage.grid).toBe(2)
    expect(doc.formations[1].positions).toEqual({ a: { x: 0, y: 0 }, b: { x: 3, y: 0 } })
  })

  it('rounds the grid square size to half feet within 1–20 ft', () => {
    const grid = (value: number) => parseChoreography(JSON.stringify({ format: 'unison', version: 2, stage: { grid: value } })).stage.grid
    expect([grid(2.7), grid(0.2), grid(99)]).toEqual([2.5, 1, 20])
  })

  it('converts version 1 files from meters to feet', () => {
    const doc = parseChoreography(JSON.stringify({
      format: 'unison', version: 1, stage: { width: 12, depth: 8 }, dancers: [{ id: 'a' }],
      formations: [{ positions: { a: { x: 1, y: -2 } } }],
    }))
    expect(doc).toMatchObject({ version: 3, stage: { width: 39, depth: 26, grid: 2 } })
    expect(doc.formations[0].positions.a).toEqual({ x: 3.281, y: -6.562 })
  })

  it('drops the hold and transition times that version 1 stored, using default timing instead', () => {
    const doc = parseChoreography(JSON.stringify({
      format: 'unison', version: 1, dancers: [{ id: 'a' }],
      formations: [{ id: 'f', name: 'Start', positions: { a: { x: 0, y: 0 } }, hold: 2, transition: 1.5, notes: '' }],
    }))
    expect(doc.formations[0]).toEqual({ id: 'f', name: 'Start', positions: { a: { x: 0, y: 0 } }, notes: '', start: 0, end: 4 })
  })

  it('gives untimed formations back-to-back blocks and pushes overlapping blocks apart', () => {
    const times = (formations: object[]) => parseChoreography(JSON.stringify({ format: 'unison', version: 3, formations })).formations.map((f) => [f.start, f.end])
    expect(times([{}, {}, {}])).toEqual([[0, 4], [6, 10], [12, 16]])
    expect(times([{ start: 5, end: 9 }, { start: 7, end: 6 }, { end: 30 }, { start: -1 }])).toEqual([[5, 9], [9, 9], [11, 30], [32, 36]])
  })

  it('keeps embedded music and ignores music without audio data', () => {
    const doc = { ...createDemo(), music: { id: 'm', name: 'song.mp3', type: 'audio/mpeg', duration: 12.5, data: 'AAAA' } }
    expect(parseChoreography(serialize(doc)).music).toEqual(doc.music)
    expect(parseChoreography(serialize({ ...doc, music: { ...doc.music, data: '' } })).music).toBeUndefined()
  })

  it('refuses files from a newer version of Unison', () => {
    expect(() => parseChoreography('{"format": "unison", "version": 4}')).toThrow('Unsupported Unison file version: 4')
  })
})
