import type { Point, Positions, StageSize } from './types.ts'

// All stage measurements are in feet.

/** Width of the offstage wing on each side of the stage. */
export const WING = 6
export const DANCER_RADIUS = 0.85
export const DEFAULT_STAGE: StageSize = { width: 40, depth: 24, grid: 2 }
export const MIN_STAGE = 6
export const MAX_STAGE = 200
/** Allowed grid square sizes, in half-foot steps. */
export const MIN_GRID = 1
export const MAX_GRID = 20
/** Used to convert files saved before Unison switched from meters to feet. */
export const FEET_PER_METER = 3.28084

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
/** Rounds away floating-point noise so saved files stay readable. */
export const tidy = (value: number) => Math.round(value * 1000) / 1000
/** Rounds a grid square size to the nearest half foot within the allowed range. */
export const gridSize = (feet: number) => clamp(Math.round(feet * 2) / 2, MIN_GRID, MAX_GRID)

/** Dancers snap to the grid lines and the centers of squares, i.e. every half square. */
export const snapStep = (stage: StageSize) => stage.grid / 2
const snap = (value: number, step: number) => tidy(Math.round(value / step) * step)

/** Positions of grid lines from center stage outward, every `step` feet within ±half. */
export function gridLines(half: number, step: number): number[] {
  const n = Math.floor(half / step + 1e-9)
  return Array.from({ length: 2 * n + 1 }, (_, i) => tidy((i - n) * step))
}

export const isOffstage = (p: Point, stage: StageSize) => Math.abs(p.x) > stage.width / 2

/** New positions for `ids` after moving them by `offset`. */
export const shift = (positions: Positions, ids: string[], offset: Point): Positions =>
  Object.fromEntries(ids.map((id) => [id, { x: tidy(positions[id].x + offset.x), y: tidy(positions[id].y + offset.y) }]))

/**
 * Offset to apply when moving the dancers in `ids` by `delta`. With snapping, the grabbed `anchor` dancer lands
 * on the snap grid (every half square) while the group keeps its spacing. The group never leaves the stage and wings.
 */
export function dragOffset(positions: Positions, ids: string[], anchor: string, delta: Point, stage: StageSize, snapping: boolean): Point {
  const a = positions[anchor]
  const step = snapStep(stage)
  const dx = snapping ? snap(a.x + delta.x, step) - a.x : delta.x
  const dy = snapping ? snap(a.y + delta.y, step) - a.y : delta.y
  const xs = ids.map((id) => positions[id].x)
  const ys = ids.map((id) => positions[id].y)
  const halfWidth = stage.width / 2 + WING
  return {
    x: clamp(dx, -halfWidth - Math.min(...xs), halfWidth - Math.max(...xs)),
    y: clamp(dy, -stage.depth / 2 - Math.min(...ys), stage.depth / 2 - Math.max(...ys)),
  }
}
