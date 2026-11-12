// Save-in-place support through the browser's File System Access API (Edge and Chrome only).
// The API isn't in TypeScript's DOM types yet, so the few pieces used are typed here.

interface PickerOptions {
  /** Browsers remember the last folder per id, so open and save share one "projects folder". */
  id?: string
  suggestedName?: string
  types?: { description: string; accept: Record<string, string[]> }[]
}

type Permission = 'granted' | 'denied' | 'prompt'
type WritableHandle = FileSystemFileHandle & {
  queryPermission?(options: { mode: 'readwrite' }): Promise<Permission>
  requestPermission?(options: { mode: 'readwrite' }): Promise<Permission>
}

const api = window as unknown as {
  showOpenFilePicker?: (options: PickerOptions) => Promise<FileSystemFileHandle[]>
  showSaveFilePicker?: (options: PickerOptions) => Promise<FileSystemFileHandle>
}

export const supportsFileHandles = typeof api.showOpenFilePicker === 'function' && typeof api.showSaveFilePicker === 'function'

const pickerOptions = (extension: string): PickerOptions => ({
  id: 'unison-projects',
  types: [{ description: 'Unison project', accept: { 'application/x-unison': [extension] } }],
})

/** Asks the user for a project file. Returns null if they cancel. */
export async function pickFileToOpen(extension: string): Promise<FileSystemFileHandle | null> {
  try {
    const [handle] = await api.showOpenFilePicker!(pickerOptions(extension))
    return handle ?? null
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return null
    throw error
  }
}

/** Asks the user where to save a new project file. Returns null if they cancel. */
export async function pickFileToSave(extension: string, suggestedName: string): Promise<FileSystemFileHandle | null> {
  try {
    return await api.showSaveFilePicker!({ ...pickerOptions(extension), suggestedName })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return null
    throw error
  }
}

/** Overwrites the file. Asks the browser for write permission first if needed; returns false if the user refuses. */
export async function writeFile(handle: FileSystemFileHandle, text: string): Promise<boolean> {
  const h = handle as WritableHandle
  if (h.queryPermission && (await h.queryPermission({ mode: 'readwrite' })) !== 'granted') {
    if ((await h.requestPermission?.({ mode: 'readwrite' })) !== 'granted') return false
  }
  const writable = await handle.createWritable()
  await writable.write(text)
  await writable.close()
  return true
}

// The linked file is remembered in IndexedDB (file handles can't go in localStorage) so Save keeps working after a restart.
const DB = 'unison'
const STORE = 'files'
const KEY = 'current'

function withStore(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(STORE)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const db = request.result
      const op = run(db.transaction(STORE, mode).objectStore(STORE))
      op.onsuccess = () => resolve(op.result)
      op.onerror = () => reject(op.error)
      op.transaction!.oncomplete = () => db.close()
    }
  })
}

export async function rememberFile(handle: FileSystemFileHandle | null): Promise<void> {
  try {
    await withStore('readwrite', (store) => (handle ? store.put(handle, KEY) : store.delete(KEY)))
  } catch {
    // Not remembering the file only means the next Save after a restart asks where to save.
  }
}

export async function recallFile(): Promise<FileSystemFileHandle | null> {
  try {
    return ((await withStore('readonly', (store) => store.get(KEY))) as FileSystemFileHandle | undefined) ?? null
  } catch {
    return null
  }
}
