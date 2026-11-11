import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { loadAutosave, loadView, startAutosave } from './state/persistence.ts'
import { editor } from './state/store.ts'

editor.init(loadAutosave(), loadView())
startAutosave()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
