/**
 * Stage coordinates are in feet measured from center stage.
 * +x points to the audience's right (stage left) and +y points downstage, toward the audience.
 */
export interface Point {
  x: number
  y: number
}

/** Dancer positions keyed by dancer id. */
export type Positions = Record<string, Point>

export interface Dancer {
  id: string
  name: string
  /** 1–3 characters drawn inside the dancer's marker. */
  label: string
  color: string
}

export interface Formation {
  id: string
  /** Optional; the UI falls back to "Formation N". */
  name: string
  positions: Positions
  notes: string
  /**
   * Music mode timing, in seconds from the start of the piece: dancers hold this formation from `start` to `end`, then
   * move during the gap until the next formation's `start`. Formations never overlap: start ≤ end ≤ next start.
   */
  start: number
  end: number
  /** Custom paths for how dancers get here from the previous formation, by dancer id. Dancers without one move in a straight line. */
  paths: Record<string, Path>
}

/**
 * A dancer's route from their spot in one formation to their spot in the next, through `points`. Points are stored
 * relative to the straight line between the two spots, so the path's shape follows along when either spot moves.
 */
export interface Path {
  points: PathPoint[]
  /** Straight segments with sharp corners at the points, instead of a smooth curve through them. */
  corners: boolean
}

export interface PathPoint {
  /** How far along the straight line from start to end, as a fraction (0 = start, 1 = end; may go beyond). */
  along: number
  /** Feet to the side of the straight line; positive is to the right of the direction of travel, as seen on screen. */
  across: number
}

/** An audio file embedded in the project so it travels with the .unison file. */
export interface Music {
  /** Random id; lets autosave match the audio it keeps separately in IndexedDB. */
  id: string
  /** Original file name. */
  name: string
  /** MIME type, such as audio/mpeg. */
  type: string
  /** Length in seconds. */
  duration: number
  /** The audio file, base64-encoded. */
  data: string
}

/** Size of the performance area (offstage wings are added on both sides) and of the grid squares, all in feet. */
export interface StageSize {
  width: number
  depth: number
  /** Side length of each grid square. */
  grid: number
}

export interface Choreography {
  format: 'unison'
  /** 4 added custom paths; 3 added formation timing and music. Older files are upgraded (version 1 files are also converted from meters to feet). */
  version: 4
  name: string
  stage: StageSize
  dancers: Dancer[]
  formations: Formation[]
  music?: Music
}
