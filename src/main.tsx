import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { loadAutosave, loadRecent, loadView, restoreFileLink, startAutosave } from './state/persistence.ts'
import { editor } from './state/store.ts'

const restored = await loadAutosave()
editor.init(restored?.doc ?? null, loadView(), restored && !restored.unsaved ? restored.doc : null)
startAutosave()
// Without its music the restored project must not be linked to its file, or Save would write it back without the music.
if (!restored?.lostMusic) void restoreFileLink()
void loadRecent()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

if (restored?.lostMusic) {
  setTimeout(() => alert(`The music for "${restored.doc.name}" couldn't be restored from the browser's storage. Open the project file again to get it back.`), 100)
}
