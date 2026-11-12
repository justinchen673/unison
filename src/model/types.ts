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
  /** 2 = feet. Version 1 files measured in meters and are converted when opened. */
  version: 2
  name: string
  stage: StageSize
  dancers: Dancer[]
  formations: Formation[]
}
