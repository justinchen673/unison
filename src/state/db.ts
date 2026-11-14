// Small IndexedDB key-value store for things localStorage can't hold: file handles and audio.
const DB = 'unison'
/** Named "files" because it first held only file handles; it now holds any value. */
const STORE = 'files'

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

export const dbGet = (key: string) => withStore('readonly', (store) => store.get(key))
export const dbPut = async (key: string, value: unknown) => void (await withStore('readwrite', (store) => store.put(value, key)))
export const dbDelete = async (key: string) => void (await withStore('readwrite', (store) => store.delete(key)))
