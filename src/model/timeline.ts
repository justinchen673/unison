import type { Choreography, Positions } from './types.ts'

/** Ease-in-out so dancers accelerate and settle instead of moving at a constant speed. */
export const ease = (t: number) => (1 - Math.cos(Math.PI * Math.min(1, Math.max(0, t)))) / 2

export function interpolate(from: Positions, to: Positions, t: number): Positions {
  const out: Positions = {}
  for (const [id, b] of Object.entries(to)) {
    const a = from[id] ?? b
    out[id] = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
  }
  return out
}

/** Playback start time (seconds) of each formation. */
export function formationStarts(doc: Choreography): number[] {
  let time = 0
  return doc.formations.map((f) => {
    const start = time
    time += f.hold + f.transition
    return start
  })
}

/** Length of the piece; the last formation's transition is never played. */
export function totalDuration(doc: Choreography): number {
  const last = doc.formations.length - 1
  return formationStarts(doc)[last] + doc.formations[last].hold
}

export interface Sample {
  /** The formation being held, or the one being left during a transition. */
  index: number
  /** Progress (0–1) through the transition out of `index`, or null while holding. */
  transition: number | null
  positions: Positions
}

export function sampleAt(doc: Choreography, time: number): Sample {
  const { formations } = doc
  let start = 0
  for (let i = 0; i < formations.length - 1; i++) {
    const f = formations[i]
    const holdEnd = start + f.hold
    if (time < holdEnd) return { index: i, transition: null, positions: f.positions }
    if (time < holdEnd + f.transition) {
      const t = (time - holdEnd) / f.transition
      return { index: i, transition: t, positions: interpolate(f.positions, formations[i + 1].positions, ease(t)) }
    }
    start = holdEnd + f.transition
  }
  const last = formations.length - 1
  return { index: last, transition: null, positions: formations[last].positions }
}
