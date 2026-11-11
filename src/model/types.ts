/**
 * Stage coordinates are in stage units (1 unit ≈ 1 m) measured from center stage.
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
  /** Seconds this formation is held during playback. */
  hold: number
  /** Seconds spent travelling from this formation into the next one during playback. */
  transition: number
  notes: string
}

/** Size of the performance area; offstage wings are added on both sides. */
export interface StageSize {
  width: number
  depth: number
}

export interface Choreography {
  format: 'unison'
  version: 1
  name: string
  stage: StageSize
  dancers: Dancer[]
  formations: Formation[]
}
