import { useEffect, useEffectEvent } from 'react'
import { Inspector } from './components/Inspector.tsx'
import { Stage } from './components/Stage.tsx'
import { Timeline } from './components/Timeline.tsx'
import { TopBar } from './components/TopBar.tsx'
import { Welcome } from './components/Welcome.tsx'
import { duplicateFormation, removeDancers, setPositions } from './model/choreography.ts'
import { SNAP_STEP, dragOffset, shift } from './model/stage.ts'
import { openPiece, saveAsPiece, savePiece } from './state/persistence.ts'
import { editor, isOpen, useEditor, type OpenState } from './state/store.ts'
import { useMotion } from './state/useMotion.ts'

const ARROWS = new Map([['ArrowLeft', [-1, 0]], ['ArrowRight', [1, 0]], ['ArrowUp', [0, -1]], ['ArrowDown', [0, 1]]])

/** Shows the welcome screen until a project is created or opened, then the editor. */
export default function App() {
  const state = useEditor()
  return isOpen(state) ? <Editor state={state} /> : <Welcome />
}

function Editor({ state }: { state: OpenState }) {
  const { doc, current, selection, view } = state
  const motion = useMotion(doc, current)

  const addFormation = () => {
    editor.commit((d) => duplicateFormation(d, current))
    motion.goTo(current + 1)
  }

  const nudge = ([sx, sy]: number[], step: number) => {
    motion.stop()
    const { positions } = doc.formations[current]
    const offset = dragOffset(positions, selection, selection[0], { x: sx * step, y: sy * step }, doc.stage, false)
    if (!offset.x && !offset.y) return
    editor.commit((d) => setPositions(d, current, shift(positions, selection, offset)), `nudge:${current}:${selection.join()}`)
  }

  const onKeyDown = useEffectEvent((e: KeyboardEvent) => {
    const mod = e.ctrlKey || e.metaKey
    const key = e.key.toLowerCase()
    if (mod && (key === 'z' || key === 'y')) {
      e.preventDefault()
      if (key === 'y' || e.shiftKey) editor.redo()
      else editor.undo()
      return
    }
    if (mod && key === 's') {
      e.preventDefault()
      void (e.shiftKey ? saveAsPiece() : savePiece())
      return
    }
    if (mod && key === 'o') {
      e.preventDefault()
      motion.stop()
      void openPiece()
      return
    }
    const target = e.target instanceof Element ? e.target : null
    if (target?.closest('input, textarea, select, [contenteditable="true"]')) return
    if (mod && key === 'a') {
      e.preventDefault()
      editor.select(doc.dancers.map((d) => d.id))
      return
    }
    if (mod || e.altKey) return

    const arrow = ARROWS.get(e.key)
    if (e.key === 'Escape') {
      editor.select([])
    } else if ((e.key === 'Delete' || e.key === 'Backspace') && selection.length) {
      e.preventDefault()
      editor.commit((d) => removeDancers(d, selection))
    } else if (arrow) {
      e.preventDefault()
      if (selection.length) nudge(arrow, e.shiftKey ? 1 : SNAP_STEP)
      else if (arrow[0]) motion.goTo(current + arrow[0])
    }
  })

  useEffect(() => {
    const listener = (e: KeyboardEvent) => onKeyDown(e)
    window.addEventListener('keydown', listener)
    return () => window.removeEventListener('keydown', listener)
  }, [])

  return (
    <div className="app">
      <TopBar state={state} onBeforeReplace={motion.stop} />
      <main className="stage-wrap">
        <Stage doc={doc} current={current} positions={motion.positions} selection={selection} view={view} moving={motion.moving} onEditStart={motion.stop} />
      </main>
      <Inspector state={state} onAddFormation={addFormation} />
      <Timeline doc={doc} current={current} onSelect={motion.goTo} onAdd={addFormation} />
    </div>
  )
}
