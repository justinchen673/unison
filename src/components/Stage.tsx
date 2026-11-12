import { useRef, useState, type PointerEvent } from 'react'
import { setPositions } from '../model/choreography.ts'
import { DANCER_RADIUS, WING, dragOffset, gridLines, isOffstage, shift } from '../model/stage.ts'
import type { Choreography, Point, Positions } from '../model/types.ts'
import { editor, type ViewOptions } from '../state/store.ts'
import { inkFor, toggleId } from './ui.ts'

/** SVG user units per foot. Drawing at this scale keeps text clear of browser minimum-font-size clamps. */
const U = 12
const R = DANCER_RADIUS * U
/** Label font size by character count. */
const LABEL_SIZE = [15, 15, 12.5, 10]
/** Moves shorter than this (feet) count as a click, not a drag. */
const MIN_MOVE = 0.15

type Gesture =
  | { kind: 'drag'; ids: string[]; anchor: string; start: Point; delta: Point }
  | { kind: 'box'; start: Point; end: Point; base: string[] }

interface StageProps {
  doc: Choreography
  current: number
  /** What to draw right now; differs from the current formation while gliding into it. */
  positions: Positions
  selection: string[]
  view: ViewOptions
  moving: boolean
  onEditStart: () => void
}

export function Stage({ doc, current, positions, selection, view, moving, onEditStart }: StageProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const gestureRef = useRef<Gesture | null>(null)
  const [gesture, setGesture] = useState<Gesture | null>(null)
  const { width: W, depth: D } = doc.stage
  const outer = W / 2 + WING
  const formation = doc.formations[current]

  // Pointer handlers read the ref so they never act on a gesture state that hasn't rendered yet.
  const updateGesture = (next: Gesture | null) => {
    gestureRef.current = next
    setGesture(next)
  }

  const toStage = (e: PointerEvent): Point => {
    const matrix = svgRef.current?.getScreenCTM()
    if (!matrix) return { x: 0, y: 0 }
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(matrix.inverse())
    return { x: p.x / U, y: p.y / U }
  }

  const onPointerDown = (e: PointerEvent<SVGSVGElement>) => {
    if (e.button !== 0) return
    onEditStart()
    const p = toStage(e)
    const id = (e.target as Element).closest('[data-dancer]')?.getAttribute('data-dancer')
    const additive = e.shiftKey || e.metaKey || e.ctrlKey
    e.currentTarget.setPointerCapture(e.pointerId)
    if (id && additive) {
      editor.select(toggleId(selection, id))
    } else if (id) {
      const ids = selection.includes(id) ? selection : [id]
      if (ids !== selection) editor.select(ids)
      updateGesture({ kind: 'drag', ids, anchor: id, start: p, delta: { x: 0, y: 0 } })
    } else {
      const base = additive ? selection : []
      editor.select(base)
      updateGesture({ kind: 'box', start: p, end: p, base })
    }
  }

  const onPointerMove = (e: PointerEvent) => {
    const g = gestureRef.current
    if (!g) return
    const p = toStage(e)
    if (g.kind === 'drag') {
      updateGesture({ ...g, delta: { x: p.x - g.start.x, y: p.y - g.start.y } })
      return
    }
    updateGesture({ ...g, end: p })
    const [x0, x1, y0, y1] = [Math.min(g.start.x, p.x), Math.max(g.start.x, p.x), Math.min(g.start.y, p.y), Math.max(g.start.y, p.y)]
    const inside = doc.dancers.filter(({ id }) => positions[id] && positions[id].x >= x0 && positions[id].x <= x1 && positions[id].y >= y0 && positions[id].y <= y1)
    editor.select([...new Set([...g.base, ...inside.map((d) => d.id)])])
  }

  const onPointerUp = (e: PointerEvent) => {
    const g = gestureRef.current
    if (g?.kind === 'drag') {
      const p = toStage(e)
      const delta = { x: p.x - g.start.x, y: p.y - g.start.y }
      const offset = dragOffset(formation.positions, g.ids, g.anchor, delta, doc.stage, view.snap)
      if (Math.hypot(delta.x, delta.y) > MIN_MOVE && (offset.x || offset.y)) {
        editor.commit((d) => setPositions(d, current, shift(d.formations[current].positions, g.ids, offset)))
      }
    }
    updateGesture(null)
  }

  let shown = positions
  if (gesture?.kind === 'drag') {
    shown = { ...positions, ...shift(formation.positions, gesture.ids, dragOffset(formation.positions, gesture.ids, gesture.anchor, gesture.delta, doc.stage, view.snap)) }
  }
  const prev = view.prevPaths ? doc.formations[current - 1]?.positions : undefined
  const next = view.nextPaths ? doc.formations[current + 1]?.positions : undefined
  const box = gesture?.kind === 'box' ? gesture : null
  const xs = gridLines(W / 2, doc.stage.grid)
  const ys = gridLines(D / 2, doc.stage.grid)
  // Number every grid line, or every few lines when squares are small, so stage numbers stay at least 2 ft apart.
  const labelEvery = Math.ceil(2 / doc.stage.grid - 1e-9)
  const numbered = xs.filter((x) => Math.abs(Math.round(x / doc.stage.grid)) % labelEvery === 0)

  // The viewBox margins and label offsets below are in SVG units, not feet, so labels keep their size on any stage.
  return (
    <svg
      ref={svgRef}
      className={`stage${gesture?.kind === 'drag' ? ' dragging' : ''}`}
      viewBox={`${-outer * U - 12} ${(-D / 2) * U - 44} ${2 * outer * U + 24} ${D * U + 116}`}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={() => updateGesture(null)}
      onContextMenu={(e) => e.preventDefault()}
    >
      <rect className="wing" x={-outer * U} y={(-D / 2) * U} width={WING * U} height={D * U} />
      <rect className="wing" x={(W / 2) * U} y={(-D / 2) * U} width={WING * U} height={D * U} />
      <text className="wing-label" transform={`translate(${(-outer + WING / 2) * U} 0) rotate(-90)`}>STAGE RIGHT</text>
      <text className="wing-label" transform={`translate(${(outer - WING / 2) * U} 0) rotate(90)`}>STAGE LEFT</text>
      <rect className="floor" x={(-W / 2) * U} y={(-D / 2) * U} width={W * U} height={D * U} />
      {xs.map((x) => <line key={`x${x}`} className={x === 0 ? 'grid center' : 'grid'} x1={x * U} x2={x * U} y1={(-D / 2) * U} y2={(D / 2) * U} />)}
      {ys.map((y) => <line key={`y${y}`} className={y === 0 ? 'grid center' : 'grid'} x1={(-W / 2) * U} x2={(W / 2) * U} y1={y * U} y2={y * U} />)}
      <rect className="floor-edge" x={(-W / 2) * U} y={(-D / 2) * U} width={W * U} height={D * U} />
      {numbered.map((x) => <text key={`n${x}`} className="stage-number" x={x * U} y={(D / 2) * U + 18}>{Math.abs(x)}</text>)}
      <text className="edge-label" x={0} y={(-D / 2) * U - 22}>UPSTAGE</text>
      <text className="edge-label" x={0} y={(D / 2) * U + 50}>AUDIENCE</text>

      {!moving && doc.dancers.map((d) => (
        <g key={d.id} className="guides" stroke={d.color}>
          {prev?.[d.id] && <Guide from={prev[d.id]} to={shown[d.id]} ghost={prev[d.id]} className="prev" />}
          {next?.[d.id] && <Guide from={shown[d.id]} to={next[d.id]} ghost={next[d.id]} className="next" />}
        </g>
      ))}

      {doc.dancers.map((d) => {
        const p = shown[d.id]
        if (!p) return null
        const selected = selection.includes(d.id)
        return (
          <g key={d.id} data-dancer={d.id} className={`dancer${selected ? ' selected' : ''}${isOffstage(p, doc.stage) ? ' offstage' : ''}`} transform={`translate(${p.x * U} ${p.y * U})`}>
            {selected && <circle className="ring" r={R + 5} />}
            <circle className="body" r={R} fill={d.color} />
            <text className="label" fill={inkFor(d.color)} fontSize={LABEL_SIZE[Math.min([...d.label].length, 3)]}>{d.label}</text>
            {view.names && <text className="name" y={R + 12}>{d.name}</text>}
          </g>
        )
      })}

      {box && (
        <rect className="marquee" x={Math.min(box.start.x, box.end.x) * U} y={Math.min(box.start.y, box.end.y) * U}
          width={Math.abs(box.end.x - box.start.x) * U} height={Math.abs(box.end.y - box.start.y) * U} />
      )}
    </svg>
  )
}

/** Faded "ghost" marker at a neighbouring formation's position plus a dashed path between it and the dancer. */
function Guide({ from, to, ghost, className }: { from: Point; to: Point; ghost: Point; className: string }) {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const length = Math.hypot(dx, dy)
  if (length < MIN_MOVE) return null
  const trim = DANCER_RADIUS / length
  return (
    <g className={className}>
      <circle className="ghost" cx={ghost.x * U} cy={ghost.y * U} r={R} />
      {length > 2 * DANCER_RADIUS && (
        <line x1={(from.x + dx * trim) * U} y1={(from.y + dy * trim) * U} x2={(to.x - dx * trim) * U} y2={(to.y - dy * trim) * U} />
      )}
    </g>
  )
}
