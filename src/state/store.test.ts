import { beforeEach, describe, expect, it } from 'vitest'
import { createChoreography } from '../model/choreography.ts'
import { editor } from './store.ts'

const view = { snap: true, names: true, prevPaths: true, nextPaths: false }

describe('editor store', () => {
  beforeEach(() => editor.init(null, view))

  it('ignores edits while no project is open', () => {
    editor.commit((d) => ({ ...d, name: 'x' }))
    expect(editor.get()).toMatchObject({ doc: null, past: [] })
  })

  it('opens the first project with no undo history', () => {
    const doc = createChoreography(3)
    editor.open(doc)
    expect(editor.get()).toMatchObject({ doc, past: [], future: [] })
  })

  it('makes replacing an open project undoable', () => {
    const first = createChoreography(3)
    const second = createChoreography(5)
    editor.open(first)
    editor.open(second)
    editor.undo()
    expect(editor.get().doc).toBe(first)
  })
})
