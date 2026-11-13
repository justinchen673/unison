import { createChoreography } from '../model/choreography.ts'
import { parseChoreography, serialize } from '../model/file.ts'
import type { Choreography } from '../model/types.ts'
import { ensurePermission, loadRecentProjects, pickFileToOpen, pickFileToSave, recallFile, rememberFile, saveRecentProjects, supportsFileHandles, writeFile } from './fileHandles.ts'
import { editor, hasUnsavedChanges, type RecentProject, type ViewOptions } from './store.ts'

const AUTOSAVE_KEY = 'unison.autosave.v1'
/** '0' when the autosaved project matches its file, '1' when it has unsaved changes. */
const UNSAVED_KEY = 'unison.unsaved.v1'
const VIEW_KEY = 'unison.view.v1'
/** Project files are the JSON from `serialize`, saved with this extension. */
export const FILE_EXTENSION = '.unison'
const DEFAULT_VIEW: ViewOptions = { snap: true, names: true, prevPaths: true, nextPaths: false, hideBars: false }

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

export function loadAutosave(): { doc: Choreography; unsaved: boolean } | null {
  try {
    const json = localStorage.getItem(AUTOSAVE_KEY)
    return json ? { doc: parseChoreography(json), unsaved: localStorage.getItem(UNSAVED_KEY) !== '0' } : null
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

/** Mirrors the open project, whether it has unsaved changes, and view options into localStorage shortly after each change. */
export function startAutosave() {
  let { doc, savedDoc, view } = editor.get()
  let timer = 0
  editor.subscribe(() => {
    const latest = editor.get()
    if (latest.doc === doc && latest.savedDoc === savedDoc && latest.view === view) return
    doc = latest.doc
    savedDoc = latest.savedDoc
    view = latest.view
    clearTimeout(timer)
    timer = window.setTimeout(() => {
      try {
        if (doc) {
          localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(doc))
          localStorage.setItem(UNSAVED_KEY, doc === savedDoc ? '0' : '1')
        } else {
          localStorage.removeItem(AUTOSAVE_KEY)
          localStorage.removeItem(UNSAVED_KEY)
        }
        localStorage.setItem(VIEW_KEY, JSON.stringify(view))
      } catch {
        // Storage full or unavailable; Save to a file still works.
      }
    }, 400)
  })
}

/** The file Save writes to (Edge and Chrome only). Not in the store because nothing renders it; the store keeps its name. */
let linkedFile: FileSystemFileHandle | null = null
/** Bumped whenever the project is replaced, so slow file operations for an old project can't affect the new one. */
let generation = 0

function replaceProject(doc: Choreography, file: FileSystemFileHandle | null, saved: boolean) {
  generation++
  linkedFile = file
  void rememberFile(file)
  editor.open(doc, file?.name ?? null, saved)
}

/** Re-links the file the open project was saved to before the browser was closed. */
export async function restoreFileLink() {
  if (!supportsFileHandles || !editor.get().doc) return
  const startedAt = generation
  const file = await recallFile()
  if (!file || generation !== startedAt) return
  linkedFile = file
  editor.setFileName(file.name)
}

const errorText = (error: unknown) => (error instanceof Error ? error.message : '')
const baseName = (doc: Choreography) => doc.name.replace(/[\\/:*?"<>|]+/g, '').trim().slice(0, 80) || 'Untitled'

/** True if there are no unsaved changes, or the user agrees to lose them. */
function okToReplace() {
  const state = editor.get()
  return !hasUnsavedChanges(state) || confirm(`"${state.doc?.name.trim() || 'Untitled'}" has changes that aren't saved to a file. Discard them?`)
}

/** Closes the open project (asking first if it has unsaved changes) and goes back to the welcome screen. */
export function closeProject() {
  if (!okToReplace()) return
  generation++
  linkedFile = null
  void rememberFile(null)
  editor.close()
}

export function newPiece() {
  if (!okToReplace()) return
  const answer = prompt('Start a new project. How many dancers?', '8')
  if (answer === null) return
  const count = Math.round(Number(answer))
  if (!(count >= 1 && count <= 100)) {
    alert('Enter a number of dancers from 1 to 100.')
    return
  }
  replaceProject(createChoreography(count), null, false)
}

function pickTextFile(): Promise<string | null> {
  return new Promise((resolve) => {
    const input = Object.assign(document.createElement('input'), { type: 'file', accept: FILE_EXTENSION })
    input.addEventListener('change', () => resolve(input.files?.[0]?.text() ?? null))
    input.addEventListener('cancel', () => resolve(null))
    input.click()
  })
}

/** Opens a project file. In Edge and Chrome the file stays linked, so Save writes back to it. */
export async function openPiece() {
  if (!okToReplace()) return
  try {
    if (supportsFileHandles) {
      const file = await pickFileToOpen(FILE_EXTENSION)
      if (!file) return
      const doc = parseChoreography(await (await file.getFile()).text())
      replaceProject(doc, file, true)
      void addRecent(file, doc.name)
    } else {
      const json = await pickTextFile()
      if (json !== null) replaceProject(parseChoreography(json), null, true)
    }
  } catch (error) {
    alert(`Couldn't open that file. ${errorText(error)}`)
  }
}

const RECENT_LIMIT = 8

function updateRecent(list: RecentProject[]) {
  editor.setRecent(list)
  void saveRecentProjects(list)
}

/** Puts the file at the top of the recent-projects list, replacing any older entry for the same file. */
async function addRecent(file: FileSystemFileHandle, projectName: string) {
  const others: RecentProject[] = []
  for (const entry of editor.get().recent) if (!(await file.isSameEntry(entry.handle))) others.push(entry)
  updateRecent([{ handle: file, projectName }, ...others].slice(0, RECENT_LIMIT))
}

export function forgetRecent(entry: RecentProject) {
  updateRecent(editor.get().recent.filter((e) => e !== entry))
}

/** Loads the recent-projects list saved by earlier sessions (Edge and Chrome only). */
export async function loadRecent() {
  if (supportsFileHandles) editor.setRecent(await loadRecentProjects())
}

/**
 * Reopens a recent project without a file window. After a browser restart the browser asks once to let Unison edit the
 * file, which also covers later saves.
 */
export async function openRecent(entry: RecentProject) {
  if (!okToReplace()) return
  try {
    if (!(await ensurePermission(entry.handle, 'readwrite'))) return
    const doc = parseChoreography(await (await entry.handle.getFile()).text())
    replaceProject(doc, entry.handle, true)
    void addRecent(entry.handle, doc.name)
  } catch (error) {
    if (error instanceof DOMException && error.name === 'NotFoundError') {
      alert(`"${entry.handle.name}" was moved or deleted, so it has been removed from your recent projects.`)
      forgetRecent(entry)
    } else {
      alert(`Couldn't open "${entry.handle.name}". ${errorText(error)}`)
    }
  }
}

/** Writes the project back to its linked file; without one (new project, or Safari/Firefox) it works like Save as. */
export async function savePiece() {
  const { doc } = editor.get()
  if (!doc) return
  const file = linkedFile
  if (!file) return saveAsPiece()
  const startedAt = generation
  try {
    if (!(await writeFile(file, serialize(doc)))) {
      alert(`Unison wasn't allowed to edit "${file.name}". Use Save as… to save a copy somewhere else.`)
      return
    }
    if (generation !== startedAt) return
    editor.markSaved(doc, file.name)
    void addRecent(file, doc.name)
  } catch (error) {
    if (error instanceof DOMException && error.name === 'NotFoundError') return saveAsPiece()
    alert(`Couldn't save to "${file.name}". ${errorText(error)}`)
  }
}

/** Saves to a new file chosen by the user (Edge and Chrome), which becomes the linked file. Other browsers download it. */
export async function saveAsPiece() {
  const { doc } = editor.get()
  if (!doc) return
  const name = `${baseName(doc)}${FILE_EXTENSION}`
  if (!supportsFileHandles) {
    download(doc, name)
    editor.markSaved(doc, null)
    return
  }
  const startedAt = generation
  try {
    const file = await pickFileToSave(FILE_EXTENSION, name)
    if (!file || !(await writeFile(file, serialize(doc))) || generation !== startedAt) return
    linkedFile = file
    void rememberFile(file)
    editor.markSaved(doc, file.name)
    void addRecent(file, doc.name)
  } catch (error) {
    alert(`Couldn't save the file. ${errorText(error)}`)
  }
}

/** Plain download. The generic binary type stops browsers from appending their own extension, such as `.json`. */
function download(doc: Choreography, fileName: string) {
  const url = URL.createObjectURL(new Blob([serialize(doc)], { type: 'application/octet-stream' }))
  const link = Object.assign(document.createElement('a'), { href: url, download: fileName })
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
