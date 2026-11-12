import { beforeEach, describe, expect, it } from 'vitest'
import { createChoreography } from '../model/choreography.ts'
import { editor, hasUnsavedChanges } from './store.ts'

const view = { snap: true, names: true, prevPaths: true, nextPaths: false }
const rename = (name: string) => editor.commit((d) => ({ ...d, name }))

describe('editor store', () => {
  beforeEach(() => editor.init(null, view))

  it('ignores edits while no project is open', () => {
    rename('x')
    expect(editor.get()).toMatchObject({ doc: null, past: [] })
  })

  it('starts every opened project with fresh undo history', () => {
    editor.open(createChoreography(3), null, false)
    rename('edited')
    const next = createChoreography(5)
    editor.open(next, 'Next.unison', true)
    expect(editor.get()).toMatchObject({ doc: next, fileName: 'Next.unison', past: [], future: [] })
  })

  it('tracks unsaved changes against the last save, including through undo', () => {
    editor.open(createChoreography(3), null, true)
    expect(hasUnsavedChanges(editor.get())).toBe(false)
    rename('edited')
    expect(hasUnsavedChanges(editor.get())).toBe(true)
    editor.markSaved(editor.get().doc!, 'Show.unison')
    expect(hasUnsavedChanges(editor.get())).toBe(false)
    editor.undo()
    expect(hasUnsavedChanges(editor.get())).toBe(true)
    editor.redo()
    expect(hasUnsavedChanges(editor.get())).toBe(false)
  })

  it('treats a new, never-saved project as unsaved', () => {
    editor.open(createChoreography(3), null, false)
    expect(hasUnsavedChanges(editor.get())).toBe(true)
  })

  it('closing goes back to no open project with nothing left to undo', () => {
    editor.open(createChoreography(3), 'Show.unison', true)
    rename('edited')
    editor.close()
    expect(editor.get()).toMatchObject({ doc: null, savedDoc: null, fileName: null, past: [], future: [] })
    expect(hasUnsavedChanges(editor.get())).toBe(false)
  })
})
