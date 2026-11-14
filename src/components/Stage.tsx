import { useRef, useState, type PointerEvent } from 'react'
import { removePathPoint, setPathPoint, setPositions } from '../model/choreography.ts'
import { controlPoints, fromStage, pieceMidpoints, route, routeLength, sliceRoute } from '../model/path.ts'
import { DANCER_RADIUS, WING, clampToFloor, dragOffset, gridLines, isOffstage, shift, snapPoint } from '../model/stage.ts'
import type { Choreography, Path, Point, Positions } from '../model/types.ts'
import { editor, type ViewOptions } from '../state/store.ts'
import { inkFor, LABEL_SIZE, labelOffset, toggleId, U } from './ui.ts'

const R = DANCER_RADIUS * U
/** Moves shorter than this (feet) count as a click, not a drag. */
const MIN_MOVE = 0.15
/** Two presses on a path point within this many milliseconds delete it. */
const DOUBLE_PRESS_MS = 400

type Gesture =
  | { kind: 'drag'; ids: string[]; anchor: string; start: Point; delta: Point }
  | { kind: 'box'; start: Point; end: Point; base: string[] }
  /** Dragging point `point` of `dancer`'s path into formation `formation` (`insert`: the point doesn't exist yet). */
  | { kind: 'path'; formation: number; dancer: string; point: number; insert: boolean; key: string }

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
  const lastPointPress = useRef<{ id: string; at: number } | null>(null)
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
    const handle = (e.target as Element).closest('[data-path]')
    if (handle) {
      const formation = Number(handle.getAttribute('data-formation'))
      const dancer = handle.getAttribute('data-path-dancer')!
      const point = Number(handle.getAttribute('data-point'))
      const insert = handle.getAttribute('data-path') === 'add'
      const pressed = `${formation}:${dancer}:${point}`
      const last = lastPointPress.current
      lastPointPress.current = insert ? null : { id: pressed, at: e.timeStamp }
      if (!insert && last?.id === pressed && e.timeStamp - last.at < DOUBLE_PRESS_MS) {
        lastPointPress.current = null
        editor.commit((d) => removePathPoint(d, formation, dancer, point))
        return
      }
      updateGesture({ kind: 'path', formation, dancer, point, insert, key: `path:${e.timeStamp}` })
    } else if (id && additive) {
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
    if (g.kind === 'path') {
      const a = doc.formations[g.formation - 1]?.positions[g.dancer]
      const b = doc.formations[g.formation]?.positions[g.dancer]
      if (!a || !b) return
      const q = clampToFloor(view.snap ? snapPoint(p, doc.stage) : p, doc.stage)
      editor.commit((d) => setPathPoint(d, g.formation, g.dancer, g.point, fromStage(q, a, b), g.insert), g.key)
      if (g.insert) updateGesture({ ...g, insert: false })
      return
    }
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
  const prevFormation = doc.formations[current - 1]
  const nextFormation = doc.formations[current + 1]
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
      viewBox={`${-outer * U - 4} ${(-D / 2) * U - 20} ${2 * outer * U + 8} ${D * U + 58}`}
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
      {numbered.map((x) => <text key={`n${x}`} className="stage-number" x={x * U} y={(D / 2) * U + 11}>{Math.abs(x)}</text>)}
      <text className="edge-label" x={0} y={(-D / 2) * U - 10}>UPSTAGE</text>
      <text className="edge-label" x={0} y={(D / 2) * U + 29}>AUDIENCE</text>

      {!moving && doc.dancers.map((d) => {
        // A selected dancer always shows the path into this formation, so it can be edited.
        const from = view.prevPaths || selection.includes(d.id) ? prevFormation?.positions[d.id] : undefined
        const to = view.nextPaths ? nextFormation?.positions[d.id] : undefined
        return (
          <g key={d.id} className="guides" stroke={d.color}>
            {from && <Guide points={route(from, shown[d.id], formation.paths[d.id])} ghost={from} className="prev" />}
            {to && <Guide points={route(shown[d.id], to, nextFormation.paths[d.id])} ghost={to} className="next" />}
          </g>
        )
      })}

      {doc.dancers.map((d) => {
        const p = shown[d.id]
        if (!p) return null
        const selected = selection.includes(d.id)
        return (
          <g key={d.id} data-dancer={d.id} className={`dancer${selected ? ' selected' : ''}${isOffstage(p, doc.stage) ? ' offstage' : ''}`} transform={`translate(${p.x * U} ${p.y * U})`}>
            {selected && <circle className="ring" r={R + 5} />}
            <circle className="body" r={R} fill={d.color} />
            <Label text={d.label} color={d.color} />
            {view.names && <text className="name" y={R + 12}>{d.name}</text>}
          </g>
        )
      })}

      {!moving && gesture?.kind !== 'drag' && doc.dancers.filter((d) => selection.includes(d.id) && shown[d.id]).map((d) => (
        <g key={d.id}>
          {prevFormation?.positions[d.id] && (
            <PathHandles formation={current} dancer={d.id} color={d.color} a={prevFormation.positions[d.id]} b={shown[d.id]} path={formation.paths[d.id]} />
          )}
          {view.nextPaths && nextFormation?.positions[d.id] && (
            <PathHandles formation={current + 1} dancer={d.id} color={d.color} a={shown[d.id]} b={nextFormation.positions[d.id]} path={nextFormation.paths[d.id]} />
          )}
        </g>
      ))}

      {box && (
        <rect className="marquee" x={Math.min(box.start.x, box.end.x) * U} y={Math.min(box.start.y, box.end.y) * U}
          width={Math.abs(box.end.x - box.start.x) * U} height={Math.abs(box.end.y - box.start.y) * U} />
      )}
    </svg>
  )
}

/** A dancer's 1–3 character label, optically centered in the marker. */
function Label({ text, color }: { text: string; color: string }) {
  const size = LABEL_SIZE[Math.min([...text].length, 3)]
  const offset = labelOffset(text, size)
  return <text className="label" x={offset.x} y={offset.y} fill={inkFor(color)} fontSize={size}>{text}</text>
}

/** Faded "ghost" marker at a neighbouring formation's position plus a dashed path (straight or custom) between it and the dancer. */
function Guide({ points, ghost, className }: { points: Point[]; ghost: Point; className: string }) {
  const length = routeLength(points)
  if (length < MIN_MOVE) return null
  const line = length > 2 * DANCER_RADIUS ? sliceRoute(points, DANCER_RADIUS, length - DANCER_RADIUS) : null
  return (
    <g className={className}>
      <circle className="ghost" cx={ghost.x * U} cy={ghost.y * U} r={R} />
      {line && <polyline points={line.map((p) => `${p.x * U},${p.y * U}`).join(' ')} />}
    </g>
  )
}

/**
 * Handles for editing a selected dancer's path from `a` (previous formation) to `b` (formation `formation`): a hollow
 * handle halfway along each piece of the path (drag it to bend the path there) and a filled one on each path point
 * (drag to move, double-click to remove). Hidden where they would sit on top of the dancer.
 */
function PathHandles({ formation, dancer, color, a, b, path }: { formation: number; dancer: string; color: string; a: Point; b: Point; path?: Path }) {
  const clear = (p: Point) => Math.hypot(p.x - a.x, p.y - a.y) > 1.6 * DANCER_RADIUS && Math.hypot(p.x - b.x, p.y - b.y) > 1.6 * DANCER_RADIUS
  const data = { 'data-formation': formation, 'data-path-dancer': dancer }
  return (
    <g className="path-handles">
      {pieceMidpoints(a, b, path).map((p, i) => clear(p) && (
        <circle key={`add${i}`} className="path-add" data-path="add" data-point={i} {...data} cx={p.x * U} cy={p.y * U} r={4} stroke={color}>
          <title>Drag to bend the path</title>
        </circle>
      ))}
      {controlPoints(a, b, path).slice(1, -1).map((p, i) => (
        <circle key={`point${i}`} className="path-point" data-path="point" data-point={i} {...data} cx={p.x * U} cy={p.y * U} r={4.5} fill={color}>
          <title>Drag to move this point; double-click to remove it</title>
        </circle>
      ))}
    </g>
  )
}
