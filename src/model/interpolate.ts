import { pointAlong, route } from './path.ts'
import type { Path, Positions } from './types.ts'

/** Ease-in-out so dancers accelerate and settle instead of moving at a constant speed. */
export const ease = (t: number) => (1 - Math.cos(Math.PI * Math.min(1, Math.max(0, t)))) / 2

/**
 * Positions part-way (`t` from 0 to 1) between two formations. Dancers missing from `from` stay at their `to` position.
 * Dancers with one of `paths` (the custom paths of the later formation) follow it; with `backward`, `from` is the later
 * formation, so they follow it in reverse.
 */
export function interpolate(from: Positions, to: Positions, t: number, paths?: Record<string, Path>, backward = false): Positions {
  const out: Positions = {}
  for (const [id, b] of Object.entries(to)) {
    const a = from[id] ?? b
    const path = paths?.[id]
    if (path?.points.length) out[id] = backward ? pointAlong(route(b, a, path), 1 - t) : pointAlong(route(a, b, path), t)
    else out[id] = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
  }
  return out
}
