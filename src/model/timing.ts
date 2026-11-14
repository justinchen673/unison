import { ease, interpolate } from './interpolate.ts'
import type { Choreography, Formation, Positions } from './types.ts'

// Music mode timing. Each formation is a block from `start` to `end` (seconds) where dancers hold still; they move
// during the gap before the next block.

/** Default length of a new formation's block. */
export const HOLD = 4
/** Default gap (time to move) before a new formation. */
export const GAP = 2

/** Rounds to milliseconds so saved files stay readable. */
export const roundTime = (t: number) => Math.max(0, Math.round(t * 1000) / 1000)

/** Default block for the formation at `index` when none is saved: back to back, each HOLD long with a GAP between. */
export const defaultStart = (index: number) => index * (HOLD + GAP)

export interface Sample {
  /** The formation reached most recently (the first one before the piece starts). */
  index: number
  positions: Positions
  /** True between blocks, while dancers move to the next formation. */
  moving: boolean
}

/** Where the dancers are `t` seconds into the piece. */
export function sampleAt(formations: Formation[], t: number): Sample {
  let index = 0
  while (index + 1 < formations.length && formations[index + 1].start <= t) index++
  const f = formations[index]
  const next = formations[index + 1]
  if (!next || t <= f.end) return { index, positions: f.positions, moving: false }
  return { index, positions: interpolate(f.positions, next.positions, ease((t - f.end) / (next.start - f.end))), moving: true }
}

/** Last moment anything happens: the end of the music or of the last formation, whichever is later. */
export const pieceLength = (doc: Choreography) => Math.max(doc.music?.duration ?? 0, doc.formations.at(-1)?.end ?? 0)

/** Earliest possible start for formation `index`: every earlier formation packed back to back from 0. */
export const earliestStart = (doc: Choreography, index: number) => doc.formations.slice(0, index).reduce((sum, f) => sum + f.end - f.start, 0)

/**
 * Sets formation `index`'s block (start no earlier than `earliestStart`, end no earlier than start). Neighbors it
 * would overlap are pushed out of the way, keeping their length, like beads on a string.
 */
export function retime(doc: Choreography, index: number, start: number, end: number): Choreography {
  const s = roundTime(Math.max(start, earliestStart(doc, index)))
  const e = roundTime(Math.max(end, s))
  const old = doc.formations[index]
  if (old.start === s && old.end === e) return doc
  const formations = [...doc.formations]
  formations[index] = { ...old, start: s, end: e }
  for (let j = index + 1; j < formations.length; j++) {
    const push = formations[j - 1].end - formations[j].start
    if (push <= 0) break
    formations[j] = { ...formations[j], start: roundTime(formations[j].start + push), end: roundTime(formations[j].end + push) }
  }
  for (let j = index - 1; j >= 0; j--) {
    const push = formations[j].end - formations[j + 1].start
    if (push <= 0) break
    formations[j] = { ...formations[j], start: roundTime(formations[j].start - push), end: roundTime(formations[j].end - push) }
  }
  return { ...doc, formations }
}

/** Moves every formation from `index` on later by `seconds`. */
export function shiftFrom(doc: Choreography, index: number, seconds: number): Choreography {
  if (seconds <= 0 || index >= doc.formations.length) return doc
  return { ...doc, formations: doc.formations.map((f, i) => (i < index ? f : { ...f, start: roundTime(f.start + seconds), end: roundTime(f.end + seconds) })) }
}
