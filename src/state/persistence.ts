import { createChoreography } from '../model/choreography.ts'
import { parseChoreography, serialize } from '../model/file.ts'
import type { Choreography } from '../model/types.ts'
import { editor, type ViewOptions } from './store.ts'

const AUTOSAVE_KEY = 'unison.autosave.v1'
const VIEW_KEY = 'unison.view.v1'
/** Project files are the JSON from `serialize`, saved with this extension. */
export const FILE_EXTENSION = '.unison'
const DEFAULT_VIEW: ViewOptions = { snap: true, names: true, prevPaths: true, nextPaths: false }

/** Whether browser storage works here; some browsers restrict it for pages opened from file://. */
export const canAutosave = (() => {
  try {
    localStorage.setItem('unison.probe', '1')
    localStorage.removeItem('unison.probe')
    return true
  } catch {
    return false
  }
})()

export function loadAutosave(): Choreography | null {
  try {
    const json = localStorage.getItem(AUTOSAVE_KEY)
    return json ? parseChoreography(json) : null
  } catch {
    return null
  }
}

export function loadView(): ViewOptions {
  try {
    return { ...DEFAULT_VIEW, ...JSON.parse(localStorage.getItem(VIEW_KEY) ?? '{}') }
  } catch {
    return DEFAULT_VIEW
  }
}

/** Mirrors the open piece and view options into localStorage shortly after each change. */
export function startAutosave() {
  let { doc, view } = editor.get()
  let timer = 0
  editor.subscribe(() => {
    const latest = editor.get()
    if (latest.doc === doc && latest.view === view) return
    doc = latest.doc
    view = latest.view
    clearTimeout(timer)
    timer = window.setTimeout(() => {
      try {
        if (doc) localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(doc))
        localStorage.setItem(VIEW_KEY, JSON.stringify(view))
      } catch {
        // Storage full or unavailable; Save to a file still works.
      }
    }, 400)
  })
}

export function newPiece() {
  const answer = prompt('Start a new project. How many dancers?', '8')
  if (answer === null) return
  const count = Math.round(Number(answer))
  if (!(count >= 1 && count <= 100)) {
    alert('Enter a number of dancers from 1 to 100.')
    return
  }
  editor.open(createChoreography(count))
}

function pickTextFile(): Promise<string | null> {
  return new Promise((resolve) => {
    const input = Object.assign(document.createElement('input'), { type: 'file', accept: FILE_EXTENSION })
    input.addEventListener('change', () => resolve(input.files?.[0]?.text() ?? null))
    input.addEventListener('cancel', () => resolve(null))
    input.click()
  })
}

export async function openPiece() {
  const json = await pickTextFile()
  if (json === null) return
  try {
    editor.open(parseChoreography(json))
  } catch (error) {
    alert(`Couldn't open that file. ${error instanceof Error ? error.message : ''}`)
  }
}

/**
 * Downloads the project as `<name>.unison` (a plain download works the same in every browser and OS).
 * The generic binary type stops browsers from appending their own extension, such as `.json`.
 */
export function savePiece() {
  const { doc } = editor.get()
  if (!doc) return
  const baseName = doc.name.replace(/[\\/:*?"<>|]+/g, '').trim().slice(0, 80) || 'Untitled'
  const url = URL.createObjectURL(new Blob([serialize(doc)], { type: 'application/octet-stream' }))
  const link = Object.assign(document.createElement('a'), { href: url, download: `${baseName}${FILE_EXTENSION}` })
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
