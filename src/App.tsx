import { useEffect, useEffectEvent } from 'react'
import { Icon } from './components/Icon.tsx'
import { Inspector } from './components/Inspector.tsx'
import { MusicTimeline } from './components/MusicTimeline.tsx'
import { Stage } from './components/Stage.tsx'
import { Timeline } from './components/Timeline.tsx'
import { TopBar } from './components/TopBar.tsx'
import { Welcome } from './components/Welcome.tsx'
import { duplicateFormation, removeDancers, setPositions } from './model/choreography.ts'
import { dragOffset, shift, snapStep } from './model/stage.ts'
import { retime, sampleAt } from './model/timing.ts'
import { openPiece, saveAsPiece, savePiece } from './state/persistence.ts'
import { editor, isOpen, useEditor, type OpenState } from './state/store.ts'
import { useMotion } from './state/useMotion.ts'
import { usePlayback } from './state/usePlayback.ts'

const ARROWS = new Map([['ArrowLeft', [-1, 0]], ['ArrowRight', [1, 0]], ['ArrowUp', [0, -1]], ['ArrowDown', [0, 1]]])

/** Shows the welcome screen until a project is created or opened, then the editor. */
export default function App() {
  const state = useEditor()
  return isOpen(state) ? <Editor key={state.opened} state={state} /> : <Welcome recent={state.recent} />
}

function Editor({ state }: { state: OpenState }) {
  const { doc, current, selection, view } = state
  const musicMode = view.mode === 'music'
  const motion = useMotion(doc, current)
  const playback = usePlayback(doc)
  /** In music mode the stage shows the piece at the playhead. */
  const sample = musicMode ? sampleAt(doc.formations, playback.time) : null

  // Entering music mode puts the playhead at the current formation; leaving it stops playback.
  const onModeChange = useEffectEvent(() => {
    if (musicMode) playback.seek(doc.formations[current].start)
    else playback.pause()
  })
  useEffect(() => onModeChange(), [musicMode])

  // When the playhead moves into another formation's time, that formation becomes current. (Editing timing doesn't
  // move the playhead, so dragging the current formation's block away from it keeps that formation current.)
  const followPlayhead = useEffectEvent(() => {
    if (sample && sample.index !== current) editor.setCurrent(sample.index)
  })
  useEffect(() => followPlayhead(), [playback.time])

  /** Makes formation `index` current: in music mode by moving the playhead to it, otherwise with a short glide. */
  const goTo = (index: number) => {
    const formation = editor.get().doc?.formations[index]
    if (!formation) return
    if (!musicMode) return motion.goTo(index)
    editor.setCurrent(index)
    playback.seek(formation.start)
  }

  /**
   * Before dancers are edited, makes the stage show the current formation itself: stops any glide, and in music mode
   * pauses and moves the playhead into the formation if it's elsewhere.
   */
  const prepareEdit = () => {
    motion.stop()
    if (!sample) return
    playback.pause()
    if (sample.index !== current || sample.moving) playback.seek(doc.formations[current].start)
  }

  /** Adds a copy of the current formation after it; in music mode, at the playhead if it's between formations. */
  const addFormation = () => {
    if (!sample) {
      editor.commit((d) => duplicateFormation(d, current))
      return motion.goTo(current + 1)
    }
    playback.pause()
    const { index } = sample
    const t = playback.time
    editor.commit((d) => duplicateFormation(d, index, t > d.formations[index].end ? t : undefined))
    goTo(index + 1)
  }

  /** Starts or ends the current formation at the playhead. */
  const mark = (edge: 'start' | 'end') => {
    const t = playback.time
    editor.commit((d) => {
      const f = d.formations[current]
      return edge === 'start' ? retime(d, current, t, Math.max(f.end, t)) : retime(d, current, Math.min(f.start, t), t)
    })
  }

  const nudge = ([sx, sy]: number[], step: number) => {
    prepareEdit()
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
    } else if (key === 'f') {
      editor.setView({ hideBars: !view.hideBars })
    } else if (key === 'm') {
      editor.setView({ mode: musicMode ? 'formations' : 'music' })
    } else if (musicMode && e.key === ' ') {
      // Also stops Space from clicking whichever button has focus.
      e.preventDefault()
      playback.toggle()
    } else if (musicMode && (e.key === '[' || e.key === ']')) {
      mark(e.key === '[' ? 'start' : 'end')
    } else if (musicMode && e.key === 'Home') {
      e.preventDefault()
      playback.seek(0)
    } else if ((e.key === 'Delete' || e.key === 'Backspace') && selection.length) {
      e.preventDefault()
      editor.commit((d) => removeDancers(d, selection))
    } else if (arrow) {
      e.preventDefault()
      if (selection.length) nudge(arrow, e.shiftKey ? doc.stage.grid : snapStep(doc.stage))
      else if (arrow[0]) goTo(current + arrow[0])
    }
  })

  useEffect(() => {
    const listener = (e: KeyboardEvent) => onKeyDown(e)
    window.addEventListener('keydown', listener)
    return () => window.removeEventListener('keydown', listener)
  }, [])

  const barsHidden = view.hideBars
  return (
    <div className={`app${barsHidden ? ' bars-hidden' : ''}`}>
      {!barsHidden && <TopBar state={state} onBeforeReplace={motion.stop} />}
      <main className="stage-wrap">
        <Stage doc={doc} current={current} positions={sample?.positions ?? motion.positions} selection={selection} view={view}
          moving={sample ? playback.playing || sample.moving : motion.moving} onEditStart={prepareEdit} />
        <div className="stage-buttons">
          {barsHidden && musicMode && (
            <button className="btn icon" title={playback.playing ? 'Pause (Space)' : 'Play (Space)'} onClick={playback.toggle}>
              <Icon name={playback.playing ? 'pause' : 'play'} />
            </button>
          )}
          <button className="btn icon bars-toggle" title={barsHidden ? 'Show the bars (F)' : 'Hide the bars to see only the stage (F)'}
            aria-pressed={barsHidden} onClick={() => editor.setView({ hideBars: !barsHidden })}>
            <Icon name={barsHidden ? 'collapse' : 'expand'} />
          </button>
        </div>
      </main>
      {!barsHidden && <Inspector state={state} onAddFormation={addFormation} onSelect={goTo} />}
      {!barsHidden && (musicMode
        ? <MusicTimeline doc={doc} current={current} playback={playback} onSelect={goTo} onAdd={addFormation} onMark={mark} />
        : <Timeline doc={doc} current={current} onSelect={goTo} onAdd={addFormation} />)}
    </div>
  )
}
