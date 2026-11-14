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
  /** 3 added formation timing and music. Version 2 files get default timing; version 1 files (meters) are also converted to feet. */
  version: 3
  name: string
  stage: StageSize
  dancers: Dancer[]
  formations: Formation[]
  music?: Music
}
