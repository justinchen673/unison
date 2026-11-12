import { FILE_EXTENSION, canAutosave, newPiece, openPiece, saveAsPiece, savePiece } from '../state/persistence.ts'
import { supportsFileHandles } from '../state/fileHandles.ts'
import { editor, hasUnsavedChanges, type OpenState } from '../state/store.ts'
import { Icon, Logo } from './Icon.tsx'
import { shortcut } from './ui.ts'

interface TopBarProps {
  state: OpenState
  /** Called before the open project is replaced (New / Open) so a glide in progress can stop. */
  onBeforeReplace: () => void
}

export function TopBar({ state, onBeforeReplace }: TopBarProps) {
  const unsaved = hasUnsavedChanges(state)
  return (
    <header className="topbar">
      <div className="brand"><Logo />Unison</div>
      <input className="piece-name" aria-label="Project name" value={state.doc.name} onChange={(e) => editor.commit((d) => ({ ...d, name: e.target.value }), 'piece-name')} />
      <span className={`save-status${unsaved ? ' unsaved' : ''}`} title={state.fileName ? `Save writes to ${state.fileName}` : undefined}>
        {unsaved ? 'Unsaved changes' : state.fileName ? `Saved to ${state.fileName}` : 'Saved'}
      </span>
      {!canAutosave && <span className="warn">Autosave is unavailable in this browser. Use Save to keep your work.</span>}
      <div className="actions">
        <button className="btn icon" title={`Undo (${shortcut('Mod+Z')})`} disabled={!state.past.length} onClick={() => editor.undo()}><Icon name="undo" /></button>
        <button className="btn icon" title={`Redo (${shortcut('Mod+Shift+Z')})`} disabled={!state.future.length} onClick={() => editor.redo()}><Icon name="redo" /></button>
        <span className="divider" />
        <button className="btn" title="Start a new project" onClick={() => { onBeforeReplace(); newPiece() }}>New</button>
        <button className="btn" title={`Open a ${FILE_EXTENSION} project file (${shortcut('Mod+O')})`} onClick={() => { onBeforeReplace(); void openPiece() }}>Open…</button>
        {supportsFileHandles && <button className="btn" title={`Save to a new ${FILE_EXTENSION} file (${shortcut('Mod+Shift+S')})`} onClick={() => void saveAsPiece()}>Save as…</button>}
        <button className="btn primary" title={`${state.fileName ? `Save to ${state.fileName}` : `Save as a ${FILE_EXTENSION} project file`} (${shortcut('Mod+S')})`} onClick={() => void savePiece()}>Save</button>
      </div>
    </header>
  )
}
