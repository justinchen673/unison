import { DEFAULT_STAGE, gridLines } from './stage.ts'
import { GAP, HOLD, defaultStart, roundTime, shiftFrom } from './timing.ts'
import type { Choreography, Dancer, Formation, Point, Positions, StageSize } from './types.ts'

export const PALETTE = ['#f87171', '#fb923c', '#facc15', '#a3e635', '#34d399', '#22d3ee', '#60a5fa', '#818cf8', '#c084fc', '#f472b6', '#e2e8f0', '#a8a29e']

/** Random id; avoids crypto.randomUUID, which some browsers only expose on https/localhost (not file://). */
export function uid(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => b.toString(16).padStart(2, '0')).join('')
}

export const formationTitle = (formation: Formation, index: number) => formation.name.trim() || `Formation ${index + 1}`

export function createDancer(index: number): Dancer {
  return { id: uid(), name: `Dancer ${index + 1}`, label: String(index + 1), color: PALETTE[index % PALETTE.length] }
}

export function createFormation(name: string, positions: Positions, start = 0): Formation {
  return { id: uid(), name, positions, notes: '', start, end: start + HOLD }
}

/** Centered rows of dancers, as spread out as fits across the stage: 6 or 4 ft apart, else 2 ft apart in rows. */
export function lineUp(count: number, stage: StageSize): Point[] {
  const spacing = [6, 4].find((s) => (count - 1) * s <= stage.width) ?? 2
  const perRow = Math.max(1, Math.min(count, Math.floor(stage.width / spacing) + 1))
  const rows = Math.ceil(count / perRow)
  return Array.from({ length: count }, (_, i) => {
    const row = Math.floor(i / perRow)
    const inRow = Math.min(perRow, count - row * perRow)
    return { x: ((i % perRow) - (inRow - 1) / 2) * spacing, y: (row - (rows - 1) / 2) * spacing }
  })
}

const byDancer = (dancers: Dancer[], points: Point[]): Positions => Object.fromEntries(dancers.map((d, i) => [d.id, points[i]]))

export function createChoreography(dancerCount: number): Choreography {
  const stage = { ...DEFAULT_STAGE }
  const dancers = Array.from({ length: dancerCount }, (_, i) => createDancer(i))
  return { format: 'unison', version: 3, name: 'Untitled piece', stage, dancers, formations: [createFormation('', byDancer(dancers, lineUp(dancerCount, stage)))] }
}

/** Sample project with named dancers and several formations, used by unit tests (the app never loads it). */
export function createDemo(): Choreography {
  const base = createChoreography(6)
  const dancers = base.dancers.map((d, i) => ({ ...d, name: ['Ava', 'Ben', 'Cleo', 'Dev', 'Eli', 'Fay'][i], label: 'ABCDEF'[i] }))
  const at = (points: [number, number][]) => byDancer(dancers, points.map(([x, y]) => ({ x, y })))
  const opening = createFormation('Opening line', at([[-15, 0], [-9, 0], [-3, 0], [3, 0], [9, 0], [15, 0]]))
  opening.notes = 'Welcome to Unison! Drag dancers to move them, Shift+click or drag a box to select several, and use ← → to step through formations.'
  return {
    ...base,
    name: 'Demo piece',
    dancers,
    formations: [
      opening,
      createFormation('V', at([[-15, -6], [-9, -2], [-3, 3], [3, 3], [9, -2], [15, -6]]), defaultStart(1)),
      createFormation('Circle', at([[-4, -7], [-8, 0], [-4, 7], [4, 7], [8, 0], [4, -7]]), defaultStart(2)),
      createFormation('Exit to wings', at([[-23, -6], [-23, 0], [-23, 6], [23, 6], [23, 0], [23, -6]]), defaultStart(3)),
    ],
  }
}

function withFormation(doc: Choreography, index: number, update: (f: Formation) => Formation): Choreography {
  return { ...doc, formations: doc.formations.map((f, i) => (i === index ? update(f) : f)) }
}

export function setPositions(doc: Choreography, index: number, updates: Positions): Choreography {
  return withFormation(doc, index, (f) => ({ ...f, positions: { ...f.positions, ...updates } }))
}

export function updateFormation(doc: Choreography, index: number, patch: Partial<Pick<Formation, 'name' | 'notes'>>): Choreography {
  return withFormation(doc, index, (f) => ({ ...f, ...patch }))
}

export function updateDancers(doc: Choreography, ids: string[], patch: Partial<Omit<Dancer, 'id'>>): Choreography {
  return { ...doc, dancers: doc.dancers.map((d) => (ids.includes(d.id) ? { ...d, ...patch } : d)) }
}

function freeSpot(taken: Point[], stage: StageSize): Point {
  const spots = gridLines(stage.depth / 2, stage.grid).flatMap((y) => gridLines(stage.width / 2, stage.grid).map((x) => ({ x, y })))
  spots.sort((a, b) => Math.hypot(a.x, a.y) - Math.hypot(b.x, b.y))
  return spots.find((s) => taken.every((p) => Math.hypot(p.x - s.x, p.y - s.y) >= 4)) ?? { x: 0, y: 0 }
}

/** Adds a dancer at the free grid spot nearest center stage in formation `index`, using that spot in every formation. */
export function addDancer(doc: Choreography, index: number): { doc: Choreography; id: string } {
  const dancer = createDancer(doc.dancers.length)
  const spot = freeSpot(Object.values(doc.formations[index].positions), doc.stage)
  return {
    id: dancer.id,
    doc: { ...doc, dancers: [...doc.dancers, dancer], formations: doc.formations.map((f) => ({ ...f, positions: { ...f.positions, [dancer.id]: spot } })) },
  }
}

export function removeDancers(doc: Choreography, ids: string[]): Choreography {
  return {
    ...doc,
    dancers: doc.dancers.filter((d) => !ids.includes(d.id)),
    formations: doc.formations.map((f) => ({ ...f, positions: Object.fromEntries(Object.entries(f.positions).filter(([id]) => !ids.includes(id))) })),
  }
}

/**
 * Inserts a copy of formation `index` right after it, like ArrangeUs' "Add formation". The copy's block starts at
 * `start` (default: a GAP after the original ends) and lasts HOLD seconds; later formations move later only if they
 * would otherwise begin less than a GAP after it.
 */
export function duplicateFormation(doc: Choreography, index: number, start?: number): Choreography {
  const original = doc.formations[index]
  const s = roundTime(Math.max(start ?? original.end + GAP, original.end))
  const copy = { ...original, id: uid(), name: '', notes: '', start: s, end: s + HOLD }
  const next = doc.formations[index + 1]
  const inserted = { ...doc, formations: [...doc.formations.slice(0, index + 1), copy, ...doc.formations.slice(index + 1)] }
  return next ? shiftFrom(inserted, index + 2, copy.end + GAP - next.start) : inserted
}

export function removeFormation(doc: Choreography, index: number): Choreography {
  return doc.formations.length <= 1 ? doc : { ...doc, formations: doc.formations.filter((_, i) => i !== index) }
}

export function moveFormation(doc: Choreography, from: number, to: number): Choreography {
  if (from === to || to < 0 || to >= doc.formations.length) return doc
  const formations = [...doc.formations]
  formations.splice(to, 0, ...formations.splice(from, 1))
  // Formations swap places but the time slots stay put, so the piece still lines up with the music.
  return { ...doc, formations: formations.map((f, i) => ({ ...f, start: doc.formations[i].start, end: doc.formations[i].end })) }
}
