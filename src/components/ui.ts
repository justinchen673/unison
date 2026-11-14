import { DANCER_RADIUS } from '../model/stage.ts'

const isMac = /Mac|iPhone|iPad/.test(navigator.userAgent)

/** Formats a shortcut like "Mod+Shift+Z" as "⌘⇧Z" on Apple devices and "Ctrl+Shift+Z" elsewhere. */
export const shortcut = (combo: string) => (isMac ? combo.replace('Mod+', '⌘').replace('Shift+', '⇧') : combo.replace('Mod+', 'Ctrl+'))

/** Text color that stays readable on top of `background` (a #rrggbb color). */
export function inkFor(background: string) {
  const match = /^#([0-9a-f]{6})$/i.exec(background)
  if (!match) return '#ffffff'
  const n = parseInt(match[1], 16)
  return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255 > 0.55 ? '#111827' : '#ffffff'
}

/** Adds `id` to the selection, or removes it if already selected (Shift/Ctrl/⌘+click). */
export const toggleId = (ids: string[], id: string) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id])

/** The app's font stack (from index.css), for drawing text on canvases. */
export const fontFamily = () => getComputedStyle(document.documentElement).fontFamily

/** Drawing units per foot for the stage: SVG user units in the editor, scaled to pixels in exports. Large enough to keep text clear of browsers' minimum font sizes. */
export const U = 12
/** Dancer label font size by character count, in drawing units. */
export const LABEL_SIZE = [1.25, 1.25, 1.04, 0.83].map((k) => k * DANCER_RADIUS * U)

const measurer = document.createElement('canvas').getContext('2d')
const MEASURE_SIZE = 1000
/** Label ink offsets per text, as a fraction of the font size. */
const inkOffsets = new Map<string, { x: number; y: number }>()
/**
 * Where to put a bold, center-aligned label's alphabetic baseline so its visible glyphs (not its em box) are centered
 * on a dancer marker. Centering on the em box (`dominant-baseline: central`) leaves digits and capitals noticeably low.
 */
export function labelOffset(text: string, size: number): { x: number; y: number } {
  let ratio = inkOffsets.get(text)
  if (!ratio) {
    ratio = { x: 0, y: 0.35 }
    if (measurer) {
      // Measured at a large size and scaled, because browsers round glyph metrics to whole pixels at small sizes.
      measurer.font = `700 ${MEASURE_SIZE}px ${fontFamily()}`
      measurer.textAlign = 'center'
      const m = measurer.measureText(text)
      ratio = { x: (m.actualBoundingBoxLeft - m.actualBoundingBoxRight) / 2 / MEASURE_SIZE, y: (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2 / MEASURE_SIZE }
    }
    inkOffsets.set(text, ratio)
  }
  return { x: ratio.x * size, y: ratio.y * size }
}

/** Seconds as m:ss.hh (or m:ss with `digits` 0). */
export function formatTime(seconds: number, digits = 2) {
  const scale = 10 ** digits
  const total = Math.round(Math.max(0, seconds) * scale)
  const minutes = Math.floor(total / (60 * scale))
  return `${minutes}:${((total % (60 * scale)) / scale).toFixed(digits).padStart(digits ? digits + 3 : 2, '0')}`
}
