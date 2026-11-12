import { useEffect, useRef, useState } from 'react'
import { openPiece } from '../state/persistence.ts'
import type { RecentProject } from '../state/store.ts'
import { Icon } from './Icon.tsx'
import { RecentList } from './RecentList.tsx'
import { shortcut } from './ui.ts'

/** Top-bar "Open" dropdown: open a file, or one click to reopen a recent project. */
export function OpenMenu({ recent, onBeforeReplace }: { recent: RecentProject[]; onBeforeReplace: () => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const closeOutside = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const closeOnEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', closeOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOutside)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  const beforeOpen = () => {
    setOpen(false)
    onBeforeReplace()
  }

  return (
    <div className="menu-wrap" ref={ref}>
      <button className="btn" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}>Open<Icon name="down" /></button>
      {open && (
        <div className="menu">
          <button className="menu-item" onClick={() => { beforeOpen(); void openPiece() }}>
            Open a file…<span className="muted">{shortcut('Mod+O')}</span>
          </button>
          <div className="menu-label">Recent projects</div>
          <RecentList recent={recent} onBeforeOpen={beforeOpen} />
        </div>
      )}
    </div>
  )
}
