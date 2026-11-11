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
  doc: Choreography
  /** Index of the formation being edited. */
  current: number
  /** Selected dancer ids. */
  selection: string[]
  view: ViewOptions
  past: Snapshot[]
  future: Snapshot[]
}

const HISTORY_LIMIT = 200
const listeners = new Set<() => void>()
let state: EditorState
let coalesceKey: string | undefined

function set(patch: Partial<EditorState>) {
  const next = { ...state, ...patch }
  next.current = Math.min(Math.max(0, next.current), next.doc.formations.length - 1)
  if (next.doc !== state.doc) {
    const ids = new Set(next.doc.dancers.map((d) => d.id))
    if (next.selection.some((id) => !ids.has(id))) next.selection = next.selection.filter((id) => ids.has(id))
  }
  state = next
  listeners.forEach((listener) => listener())
}

/** Single global editor store. Every document change goes through `commit` so it can be undone. */
export const editor = {
  init(doc: Choreography, view: ViewOptions) {
    state = { doc, current: 0, selection: [], view, past: [], future: [] }
  },
  get: () => state,
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
  /** Applies an undoable change. Consecutive changes with the same `coalesce` key (e.g. typing in one field) form a single undo step. */
  commit(recipe: (doc: Choreography) => Choreography, coalesce?: string) {
    const doc = recipe(state.doc)
    if (doc === state.doc) return
    const merge = coalesce !== undefined && coalesce === coalesceKey
    coalesceKey = coalesce
    set({ doc, future: [], past: merge ? state.past : [...state.past, { doc: state.doc, current: state.current }].slice(-HISTORY_LIMIT) })
  },
  undo() {
    const previous = state.past.at(-1)
    if (!previous) return
    coalesceKey = undefined
    set({ ...previous, past: state.past.slice(0, -1), future: [...state.future, { doc: state.doc, current: state.current }] })
  },
  redo() {
    const next = state.future.at(-1)
    if (!next) return
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
