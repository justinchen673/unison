import type { Positions } from './types.ts'

/** Ease-in-out so dancers accelerate and settle instead of moving at a constant speed. */
export const ease = (t: number) => (1 - Math.cos(Math.PI * Math.min(1, Math.max(0, t)))) / 2

/** Positions part-way (`t` from 0 to 1) between two formations. Dancers missing from `from` stay at their `to` position. */
export function interpolate(from: Positions, to: Positions, t: number): Positions {
  const out: Positions = {}
  for (const [id, b] of Object.entries(to)) {
    const a = from[id] ?? b
    out[id] = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
  }
  return out
}
