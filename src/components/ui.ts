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

/** Seconds as m:ss.s */
export function clock(seconds: number) {
  const tenths = Math.round(seconds * 10)
  return `${Math.floor(tenths / 600)}:${((tenths % 600) / 10).toFixed(1).padStart(4, '0')}`
}

/** Adds `id` to the selection, or removes it if already selected (Shift/Ctrl/⌘+click). */
export const toggleId = (ids: string[], id: string) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id])
