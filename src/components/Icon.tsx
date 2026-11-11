const PATHS = {
  play: 'M8 5v14l11-7z',
  pause: 'M6 5h4v14H6zM14 5h4v14h-4z',
  prev: 'M6 5h2v14H6zM19 5v14L9 12z',
  next: 'M16 5h2v14h-2zM5 5v14l10-7z',
  plus: 'M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z',
  undo: 'M3 10L9 5V9H14A6 6 0 0 1 14 21H11V19H14A4 4 0 0 0 14 11H9V15Z',
  redo: 'M21 10L15 5V9H10A6 6 0 0 0 10 21H13V19H10A4 4 0 0 1 10 11H15V15Z',
  left: 'M15 5l2 2-5 5 5 5-2 2-7-7z',
  right: 'M9 5l7 7-7 7-2-2 5-5-5-5z',
}

export function Icon({ name }: { name: keyof typeof PATHS }) {
  return (
    <svg className="glyph" viewBox="0 0 24 24" aria-hidden="true">
      <path d={PATHS[name]} />
    </svg>
  )
}

export function Logo() {
  return (
    <svg className="logo" viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#8b6cff" />
      <circle cx="9" cy="11" r="3.5" fill="#fff" />
      <circle cx="23" cy="11" r="3.5" fill="#fff" />
      <circle cx="16" cy="22" r="3.5" fill="#fff" />
    </svg>
  )
}
