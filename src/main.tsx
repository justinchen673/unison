import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { loadAutosave, loadRecent, loadView, restoreFileLink, startAutosave } from './state/persistence.ts'
import { editor } from './state/store.ts'

const restored = loadAutosave()
editor.init(restored?.doc ?? null, loadView(), restored && !restored.unsaved ? restored.doc : null)
startAutosave()
void restoreFileLink()
void loadRecent()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
