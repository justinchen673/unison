import { PALETTE, createFormation, lineUp, uid } from './choreography.ts'
import { clamp } from './stage.ts'
import type { Choreography, Dancer, Formation, Point } from './types.ts'

export const serialize = (doc: Choreography) => JSON.stringify(doc, null, 2)

type Json = Record<string, unknown>
const isObject = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v)
const isPoint = (v: unknown): v is Point => isObject(v) && Number.isFinite(v.x) && Number.isFinite(v.y)
const text = (v: unknown, fallback: string) => (typeof v === 'string' ? v : fallback)
const seconds = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : fallback)
const size = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? clamp(Math.round(v), 2, 60) : fallback)
const objects = (v: unknown) => (Array.isArray(v) ? v.filter(isObject) : [])

/** Reads a saved piece, filling in anything missing so hand-edited or partially broken files still open. */
export function parseChoreography(json: string): Choreography {
  let raw: unknown
  try {
    raw = JSON.parse(json)
  } catch {
    throw new Error('The file is not valid JSON.')
  }
  if (!isObject(raw) || raw.format !== 'unison') throw new Error('This is not a Unison file.')
  if (raw.version !== 1) throw new Error(`Unsupported Unison file version: ${String(raw.version)}.`)

  const stageJson = isObject(raw.stage) ? raw.stage : {}
  const stage = { width: size(stageJson.width, 12), depth: size(stageJson.depth, 8) }

  const dancers: Dancer[] = []
  for (const d of objects(raw.dancers)) {
    if (typeof d.id !== 'string' || dancers.some((x) => x.id === d.id)) continue
    const n = dancers.length
    dancers.push({ id: d.id, name: text(d.name, `Dancer ${n + 1}`), label: text(d.label, String(n + 1)).slice(0, 3), color: text(d.color, PALETTE[n % PALETTE.length]) })
  }

  const lined = lineUp(dancers.length, stage)
  const formations: Formation[] = []
  for (const f of objects(raw.formations)) {
    const given = isObject(f.positions) ? f.positions : {}
    const previous = formations.at(-1)?.positions
    const positions = Object.fromEntries(dancers.map((d, i) => {
      const p = given[d.id]
      return [d.id, isPoint(p) ? { x: p.x, y: p.y } : (previous?.[d.id] ?? lined[i])]
    }))
    const id = typeof f.id === 'string' && !formations.some((x) => x.id === f.id) ? f.id : uid()
    formations.push({ id, name: text(f.name, ''), positions, hold: seconds(f.hold, 2), transition: seconds(f.transition, 1.5), notes: text(f.notes, '') })
  }
  if (!formations.length) formations.push(createFormation('', Object.fromEntries(dancers.map((d, i) => [d.id, lined[i]]))))

  return { format: 'unison', version: 1, name: text(raw.name, 'Untitled piece'), stage, dancers, formations }
}
