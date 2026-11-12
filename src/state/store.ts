import { useSyncExternalStore } from 'react'
import type { Choreography } from '../model/types.ts'

interface Snapshot {
  doc: Choreography
  current: number
}

export interface ViewOptions {
  snap: boolean
  names: boolean
  /** Ghosts and paths showing where dancers come from (previous formation). */
  prevPaths: boolean
  /** Ghosts and paths showing where dancers go next. */
  nextPaths: boolean
}

export interface EditorState {
  /** The open project, or null before one has been created or opened. */
  doc: Choreography | null
  /** The project as last saved or opened from a file; null if it has never been saved. `doc !== savedDoc` means unsaved changes. */
  savedDoc: Choreography | null
  /** Name of the file Save writes to (browsers with file access only), or null. */
  fileName: string | null
  /** Index of the formation being edited. */
  current: number
  /** Selected dancer ids. */
  selection: string[]
  view: ViewOptions
  past: Snapshot[]
  future: Snapshot[]
}

/** Editor state while a project is open. */
export type OpenState = EditorState & { doc: Choreography }
export const isOpen = (s: EditorState): s is OpenState => s.doc !== null
export const hasUnsavedChanges = (s: EditorState) => s.doc !== null && s.doc !== s.savedDoc

const HISTORY_LIMIT = 200
const listeners = new Set<() => void>()
let state: EditorState
let coalesceKey: string | undefined

function set(patch: Partial<EditorState>) {
  const next = { ...state, ...patch }
  if (next.doc) {
    next.current = Math.min(Math.max(0, next.current), next.doc.formations.length - 1)
    if (next.doc !== state.doc) {
      const ids = new Set(next.doc.dancers.map((d) => d.id))
      if (next.selection.some((id) => !ids.has(id))) next.selection = next.selection.filter((id) => ids.has(id))
    }
  }
  state = next
  listeners.forEach((listener) => listener())
}

/** Single global editor store. Every document change goes through `commit` so it can be undone. */
export const editor = {
  init(doc: Choreography | null, view: ViewOptions, savedDoc: Choreography | null = null) {
    state = { doc, savedDoc, fileName: null, current: 0, selection: [], view, past: [], future: [] }
  },
  get: () => state,
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
  /** Applies an undoable change to the open project (no-op when none is open). Consecutive changes with the same `coalesce` key (e.g. typing in one field) form a single undo step. */
  commit(recipe: (doc: Choreography) => Choreography, coalesce?: string) {
    if (!state.doc) return
    const doc = recipe(state.doc)
    if (doc === state.doc) return
    const merge = coalesce !== undefined && coalesce === coalesceKey
    coalesceKey = coalesce
    set({ doc, future: [], past: merge ? state.past : [...state.past, { doc: state.doc, current: state.current }].slice(-HISTORY_LIMIT) })
  },
  /**
   * Shows `doc` as the open project with a fresh undo history (like opening a document in a desktop app), so undo can
   * never bring back a different project while Save points at this one's file. `saved` marks it as matching a file.
   */
  open(doc: Choreography, fileName: string | null, saved: boolean) {
    coalesceKey = undefined
    set({ doc, savedDoc: saved ? doc : null, fileName, current: 0, selection: [], past: [], future: [] })
  },
  /** Records that `doc` was just written to a file (`fileName` is null for a plain download). */
  markSaved(doc: Choreography, fileName: string | null) {
    set({ savedDoc: doc, fileName })
  },
  setFileName(fileName: string | null) {
    set({ fileName })
  },
  undo() {
    const previous = state.past.at(-1)
    if (!previous || !state.doc) return
    coalesceKey = undefined
    set({ ...previous, past: state.past.slice(0, -1), future: [...state.future, { doc: state.doc, current: state.current }] })
  },
  redo() {
    const next = state.future.at(-1)
    if (!next || !state.doc) return
    coalesceKey = undefined
    set({ ...next, future: state.future.slice(0, -1), past: [...state.past, { doc: state.doc, current: state.current }] })
  },
  setCurrent(current: number) {
    if (current !== state.current) set({ current })
  },
  select(selection: string[]) {
    set({ selection })
  },
  setView(patch: Partial<ViewOptions>) {
    set({ view: { ...state.view, ...patch } })
  },
}

export const useEditor = () => useSyncExternalStore(editor.subscribe, editor.get)
