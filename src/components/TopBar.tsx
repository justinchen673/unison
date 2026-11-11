import { canAutosave, newPiece, openPiece, savePiece } from '../state/persistence.ts'
import { editor, type EditorState } from '../state/store.ts'
import { Icon, Logo } from './Icon.tsx'
import { shortcut } from './ui.ts'

interface TopBarProps {
  state: EditorState
  /** Called before the open piece is replaced (New / Open) so playback can stop. */
  onBeforeReplace: () => void
}

export function TopBar({ state, onBeforeReplace }: TopBarProps) {
  return (
    <header className="topbar">
      <div className="brand"><Logo />Unison</div>
      <input className="piece-name" aria-label="Piece name" value={state.doc.name} onChange={(e) => editor.commit((d) => ({ ...d, name: e.target.value }), 'piece-name')} />
      {!canAutosave && <span className="warn">Autosave is unavailable in this browser. Use Save to keep your work.</span>}
      <div className="actions">
        <button className="btn icon" title={`Undo (${shortcut('Mod+Z')})`} disabled={!state.past.length} onClick={() => editor.undo()}><Icon name="undo" /></button>
        <button className="btn icon" title={`Redo (${shortcut('Mod+Shift+Z')})`} disabled={!state.future.length} onClick={() => editor.redo()}><Icon name="redo" /></button>
        <span className="divider" />
        <button className="btn" title="Start a new piece" onClick={() => { onBeforeReplace(); newPiece() }}>New</button>
        <button className="btn" title={`Open a saved piece (${shortcut('Mod+O')})`} onClick={() => { onBeforeReplace(); void openPiece() }}>Open…</button>
        <button className="btn primary" title={`Save to a file (${shortcut('Mod+S')})`} onClick={savePiece}>Save</button>
      </div>
    </header>
  )
}
