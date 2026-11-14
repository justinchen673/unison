import { LABEL_SIZE, U, fontFamily, inkFor, labelOffset } from '../components/ui.ts'
import { DANCER_RADIUS, WING, gridLines, isOffstage } from '../model/stage.ts'
import type { Choreography, Positions } from '../model/types.ts'

// Draws the stage on a canvas the way the editor's SVG Stage does (same drawing units and margins), for exports.

export interface Theme {
  background: string
  floor: string
  floorEdge: string
  grid: string
  gridCenter: string
  wing: string
  wingBorder: string
  wingLabel: string
  muted: string
  text: string
}

/** The editor's look (index.css), used for videos. */
export const DARK: Theme = {
  background: '#0e1016', floor: '#1d2333', floorEdge: '#4a5576', grid: '#283047', gridCenter: '#46517a',
  wing: '#12151d', wingBorder: '#272e3f', wingLabel: '#3a4258', muted: '#8a93a8', text: '#e7eaf1',
}

/** A white-paper version, used for PDFs so they print well. */
export const LIGHT: Theme = {
  background: '#ffffff', floor: '#f3f4f7', floorEdge: '#6b7280', grid: '#d5d9e1', gridCenter: '#9aa1b2',
  wing: '#e8eaef', wingBorder: '#c3c8d2', wingLabel: '#9aa1b2', muted: '#6b7280', text: '#111827',
}

export interface Box {
  x: number
  y: number
  width: number
  height: number
}

/** Draws the stage with the dancers at `positions`, as large as fits in `box` (in the context's current units) and centered in it. */
export function drawStage(ctx: CanvasRenderingContext2D, doc: Choreography, positions: Positions, theme: Theme, box: Box, names: boolean) {
  const { width: W, depth: D, grid } = doc.stage
  const outer = W / 2 + WING
  // The same view box as Stage.tsx: the stage and wings plus margins for the labels.
  const viewWidth = 2 * outer * U + 8
  const viewHeight = D * U + 58
  const k = Math.min(box.width / viewWidth, box.height / viewHeight)
  const font = fontFamily()
  const top = (-D / 2) * U
  const bottom = (D / 2) * U

  ctx.save()
  ctx.translate(box.x + (box.width - viewWidth * k) / 2, box.y + (box.height - viewHeight * k) / 2)
  ctx.scale(k, k)
  ctx.translate(outer * U + 4, (D / 2) * U + 20)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  const label = (text: string, x: number, y: number, size: number, color: string, weight = 400, spacing = 0) => {
    ctx.font = `${weight} ${size}px ${font}`
    ctx.letterSpacing = `${spacing}px`
    ctx.fillStyle = color
    ctx.fillText(text, x, y)
    ctx.letterSpacing = '0px'
  }
  const line = (x1: number, y1: number, x2: number, y2: number) => {
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.stroke()
  }

  for (const x of [-outer * U, (W / 2) * U]) {
    ctx.fillStyle = theme.wing
    ctx.fillRect(x, top, WING * U, D * U)
    ctx.strokeStyle = theme.wingBorder
    ctx.lineWidth = 1
    ctx.setLineDash([4, 4])
    ctx.strokeRect(x, top, WING * U, D * U)
    ctx.setLineDash([])
  }
  for (const [x, angle, text] of [[-outer + WING / 2, -Math.PI / 2, 'STAGE RIGHT'], [outer - WING / 2, Math.PI / 2, 'STAGE LEFT']] as const) {
    ctx.save()
    ctx.translate(x * U, 0)
    ctx.rotate(angle)
    label(text, 0, 0, 7.5, theme.wingLabel, 600, 2)
    ctx.restore()
  }

  ctx.fillStyle = theme.floor
  ctx.fillRect((-W / 2) * U, top, W * U, D * U)
  const xs = gridLines(W / 2, grid)
  const ys = gridLines(D / 2, grid)
  ctx.lineWidth = 1
  for (const x of xs) {
    ctx.strokeStyle = x === 0 ? theme.gridCenter : theme.grid
    ctx.setLineDash(x === 0 ? [6, 4] : [])
    line(x * U, top, x * U, bottom)
  }
  for (const y of ys) {
    ctx.strokeStyle = y === 0 ? theme.gridCenter : theme.grid
    ctx.setLineDash(y === 0 ? [6, 4] : [])
    line((-W / 2) * U, y * U, (W / 2) * U, y * U)
  }
  ctx.setLineDash([])
  ctx.strokeStyle = theme.floorEdge
  ctx.lineWidth = 2
  ctx.strokeRect((-W / 2) * U, top, W * U, D * U)

  // Like the editor: number every grid line, or every few when squares are small, so numbers stay 2 ft apart.
  const labelEvery = Math.ceil(2 / grid - 1e-9)
  for (const x of xs) if (Math.abs(Math.round(x / grid)) % labelEvery === 0) label(String(Math.abs(x)), x * U, bottom + 11, 9, theme.muted)
  label('UPSTAGE', 0, top - 10, 7.5, theme.muted, 600, 2)
  label('AUDIENCE', 0, bottom + 29, 7.5, theme.muted, 600, 2)

  const r = DANCER_RADIUS * U
  for (const d of doc.dancers) {
    const p = positions[d.id]
    if (!p) continue
    const x = p.x * U
    const y = p.y * U
    ctx.globalAlpha = isOffstage(p, doc.stage) ? 0.5 : 1
    ctx.beginPath()
    ctx.arc(x, y, r, 0, 2 * Math.PI)
    ctx.fillStyle = d.color
    ctx.fill()
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)'
    ctx.lineWidth = 1.5
    ctx.stroke()
    const size = LABEL_SIZE[Math.min([...d.label].length, 3)]
    const offset = labelOffset(d.label, size)
    ctx.textBaseline = 'alphabetic'
    label(d.label, x + offset.x, y + offset.y, size, inkFor(d.color), 700)
    ctx.textBaseline = 'middle'
    if (names) {
      ctx.font = `400 11px ${font}`
      ctx.lineJoin = 'round'
      ctx.lineWidth = 3
      ctx.strokeStyle = theme.background
      ctx.strokeText(d.name, x, y + r + 12)
      ctx.fillStyle = theme.text
      ctx.fillText(d.name, x, y + r + 12)
    }
  }
  ctx.globalAlpha = 1
  ctx.restore()
}

/** `text` wrapped to `width` with the context's current font, at most `maxLines` lines (the last ending in "…" if cut). */
export function wrapLines(ctx: CanvasRenderingContext2D, text: string, width: number, maxLines: number): string[] {
  const lines: string[] = []
  for (const paragraph of text.split('\n')) {
    let current = ''
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const next = current ? `${current} ${word}` : word
      if (current && ctx.measureText(next).width > width) {
        lines.push(current)
        current = word
      } else current = next
    }
    lines.push(current)
  }
  const shown = lines.slice(0, maxLines)
  if (lines.length > maxLines) shown[maxLines - 1] = `${shown[maxLines - 1]}…`
  return shown
}
