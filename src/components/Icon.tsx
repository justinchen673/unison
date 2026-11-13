const PATHS = {
  prev: 'M6 5h2v14H6zM19 5v14L9 12z',
  next: 'M16 5h2v14h-2zM5 5v14l10-7z',
  plus: 'M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z',
  undo: 'M3 10L9 5V9H14A6 6 0 0 1 14 21H11V19H14A4 4 0 0 0 14 11H9V15Z',
  redo: 'M21 10L15 5V9H10A6 6 0 0 0 10 21H13V19H10A4 4 0 0 1 10 11H15V15Z',
  left: 'M15 5l2 2-5 5 5 5-2 2-7-7z',
  right: 'M9 5l7 7-7 7-2-2 5-5-5-5z',
  down: 'M7 10l5 5 5-5z',
  expand: 'M4 4h6v2H6v4H4zM14 4h6v6h-2V6h-4zM4 14h2v4h4v2H4zM18 14h2v6h-6v-2h4z',
  collapse: 'M8 4h2v6H4V8h4zM14 4h2v4h4v2h-6zM4 14h6v6H8v-4H4zM14 14h6v2h-4v4h-2z',
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
