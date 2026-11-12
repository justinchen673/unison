import { forgetRecent, openRecent } from '../state/persistence.ts'
import type { RecentProject } from '../state/store.ts'

/** Recently opened or saved projects. Clicking one reopens it without a file window. */
export function RecentList({ recent, onBeforeOpen }: { recent: RecentProject[]; onBeforeOpen?: () => void }) {
  return (
    <ul className="recent">
      {recent.map((entry, i) => (
        <li key={`${i}:${entry.handle.name}`}>
          <button className="recent-open" title={`Open ${entry.handle.name}`} onClick={() => { onBeforeOpen?.(); void openRecent(entry) }}>
            <span className="recent-name">{entry.projectName.trim() || 'Untitled'}</span>
            <span className="recent-file">{entry.handle.name}</span>
          </button>
          <button className="recent-remove" title="Remove from recent projects" aria-label={`Remove ${entry.handle.name} from recent projects`} onClick={() => forgetRecent(entry)}>×</button>
        </li>
      ))}
    </ul>
  )
}
