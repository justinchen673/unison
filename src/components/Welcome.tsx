import { FILE_EXTENSION, canAutosave, newPiece, openPiece } from '../state/persistence.ts'
import type { RecentProject } from '../state/store.ts'
import { Logo } from './Icon.tsx'
import { RecentList } from './RecentList.tsx'

/** Start screen shown while no project is open. */
export function Welcome({ recent }: { recent: RecentProject[] }) {
  return (
    <main className="welcome">
      <div className="welcome-card">
        <h1><Logo />Unison</h1>
        <p>Plan formations for your dance team: place dancers, build formations, and see how everyone moves between them.</p>
        <div className="welcome-actions">
          <button className="btn primary" onClick={newPiece}>New project</button>
          <button className="btn" onClick={() => void openPiece()}>Open project…</button>
        </div>
        {recent.length > 0 && (
          <section className="welcome-recent">
            <h2>Recent projects</h2>
            <RecentList recent={recent} />
          </section>
        )}
        <p className="muted">Projects save as <code>{FILE_EXTENSION}</code> files. Your open project is kept in this browser and comes back the next time you open Unison.</p>
        {!canAutosave && <p className="warn">This browser can't keep your project between visits. Use Save to keep your work.</p>}
      </div>
    </main>
  )
}
