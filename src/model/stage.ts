import type { Point, Positions, StageSize } from './types.ts'

/** Dancers snap to grid lines and the midpoints between them. */
export const SNAP_STEP = 0.5
/** Width of the offstage wing on each side of the stage. */
export const WING = 2
export const DANCER_RADIUS = 0.32

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
export const snap = (value: number) => Math.round(value / SNAP_STEP) * SNAP_STEP
/** Rounds away floating-point noise so saved files stay readable. */
export const tidy = (value: number) => Math.round(value * 1000) / 1000

export const isOffstage = (p: Point, stage: StageSize) => Math.abs(p.x) > stage.width / 2

/** New positions for `ids` after moving them by `offset`. */
export const shift = (positions: Positions, ids: string[], offset: Point): Positions =>
  Object.fromEntries(ids.map((id) => [id, { x: tidy(positions[id].x + offset.x), y: tidy(positions[id].y + offset.y) }]))

/**
 * Offset to apply when moving the dancers in `ids` by `delta`. With snapping, the grabbed `anchor` dancer lands
 * on the snap grid while the group keeps its spacing. The group never leaves the stage and wings.
 */
export function dragOffset(positions: Positions, ids: string[], anchor: string, delta: Point, stage: StageSize, snapping: boolean): Point {
  const a = positions[anchor]
  const dx = snapping ? snap(a.x + delta.x) - a.x : delta.x
  const dy = snapping ? snap(a.y + delta.y) - a.y : delta.y
  const xs = ids.map((id) => positions[id].x)
  const ys = ids.map((id) => positions[id].y)
  const halfWidth = stage.width / 2 + WING
  return {
    x: clamp(dx, -halfWidth - Math.min(...xs), halfWidth - Math.max(...xs)),
    y: clamp(dy, -stage.depth / 2 - Math.min(...ys), stage.depth / 2 - Math.max(...ys)),
  }
}
