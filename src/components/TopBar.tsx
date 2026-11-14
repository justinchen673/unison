import { FILE_EXTENSION, canAutosave, closeProject, newPiece, openPiece, saveAsPiece, savePiece } from '../state/persistence.ts'
import { supportsFileHandles } from '../state/fileHandles.ts'
import { editor, hasUnsavedChanges, type OpenState } from '../state/store.ts'
import { Icon, Logo } from './Icon.tsx'
import { OpenMenu } from './OpenMenu.tsx'
import { shortcut } from './ui.ts'

interface TopBarProps {
  state: OpenState
  /** Called before the open project is replaced (New / Open) so a glide in progress can stop. */
  onBeforeReplace: () => void
  onExport: () => void
}

export function TopBar({ state, onBeforeReplace, onExport }: TopBarProps) {
  const unsaved = hasUnsavedChanges(state)
  const { mode } = state.view
  return (
    <header className="topbar">
      <button className="brand" title="Close this project and go back to the start screen" onClick={() => { onBeforeReplace(); closeProject() }}><Logo />Unison</button>
      <input className="piece-name" aria-label="Project name" value={state.doc.name} onChange={(e) => editor.commit((d) => ({ ...d, name: e.target.value }), 'piece-name')} />
      <span className={`save-status${unsaved ? ' unsaved' : ''}`} title={state.fileName ? `Save writes to ${state.fileName}` : undefined}>
        {unsaved ? 'Unsaved changes' : state.fileName ? `Saved to ${state.fileName}` : 'Saved'}
      </span>
      <div className="mode-switch" role="group" aria-label="Mode">
        <button aria-pressed={mode === 'formations'} title="Arrange formations, without timing (M)" onClick={() => editor.setView({ mode: 'formations' })}>Formations</button>
        <button aria-pressed={mode === 'music'} title="Time formations to music (M)" onClick={() => editor.setView({ mode: 'music' })}>Music</button>
      </div>
      {!canAutosave && <span className="warn">Autosave is unavailable in this browser. Use Save to keep your work.</span>}
      <div className="actions">
        <button className="btn icon" title={`Undo (${shortcut('Mod+Z')})`} disabled={!state.past.length} onClick={() => editor.undo()}><Icon name="undo" /></button>
        <button className="btn icon" title={`Redo (${shortcut('Mod+Shift+Z')})`} disabled={!state.future.length} onClick={() => editor.redo()}><Icon name="redo" /></button>
        <span className="divider" />
        <button className="btn" title="Start a new project" onClick={() => { onBeforeReplace(); newPiece() }}>New</button>
        {state.recent.length > 0
          ? <OpenMenu recent={state.recent} onBeforeReplace={onBeforeReplace} />
          : <button className="btn" title={`Open a ${FILE_EXTENSION} project file (${shortcut('Mod+O')})`} onClick={() => { onBeforeReplace(); void openPiece() }}>Open…</button>}
        <button className="btn" title="Export the piece as a PDF or an MP4 video" onClick={onExport}>Export…</button>
        {supportsFileHandles && <button className="btn" title={`Save to a new ${FILE_EXTENSION} file (${shortcut('Mod+Shift+S')})`} onClick={() => void saveAsPiece()}>Save as…</button>}
        <button className="btn primary" title={`${state.fileName ? `Save to ${state.fileName}` : `Save as a ${FILE_EXTENSION} project file`} (${shortcut('Mod+S')})`} onClick={() => void savePiece()}>Save</button>
      </div>
    </header>
  )
}
