import { memo, useEffect, useRef } from 'react'
import { formationTitle } from '../model/choreography.ts'
import { DANCER_RADIUS, WING } from '../model/stage.ts'
import type { Choreography, Dancer, Formation, StageSize } from '../model/types.ts'
import { Icon } from './Icon.tsx'

interface TimelineProps {
  doc: Choreography
  current: number
  onSelect: (index: number) => void
  onAdd: () => void
}

export function Timeline({ doc, current, onSelect, onAdd }: TimelineProps) {
  const stripRef = useRef<HTMLOListElement>(null)
  const last = doc.formations.length - 1

  useEffect(() => {
    stripRef.current?.children[current]?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [current])

  return (
    <footer className="timeline">
      <div className="transport">
        <button className="btn icon" title="Previous formation (←)" disabled={current === 0} onClick={() => onSelect(current - 1)}><Icon name="prev" /></button>
        <button className="btn icon" title="Next formation (→)" disabled={current === last} onClick={() => onSelect(current + 1)}><Icon name="next" /></button>
        <span className="position">Formation {current + 1} of {doc.formations.length}</span>
      </div>
      <ol className="strip" ref={stripRef}>
        {doc.formations.map((f, i) => (
          <li key={f.id}>
            <button className={`card${i === current ? ' current' : ''}`} aria-current={i === current} onClick={() => onSelect(i)}>
              <Thumbnail formation={f} dancers={doc.dancers} stage={doc.stage} />
              <span className="card-title"><b>{i + 1}</b>{formationTitle(f, i)}</span>
              <span className="card-meta">{f.notes.trim() ? 'Has notes' : '\u00a0'}</span>
            </button>
          </li>
        ))}
        <li>
          <button className="card add" title="Add a formation after the current one (starts as a copy)" onClick={onAdd}><Icon name="plus" />Formation</button>
        </li>
      </ol>
    </footer>
  )
}

/** Thumbnail SVG units per foot. */
const T = 3

const Thumbnail = memo(function Thumbnail({ formation, dancers, stage }: { formation: Formation; dancers: Dancer[]; stage: StageSize }) {
  const outer = stage.width / 2 + WING
  return (
    <svg className="thumb" viewBox={`${-outer * T} ${(-stage.depth / 2) * T} ${2 * outer * T} ${stage.depth * T}`} aria-hidden="true">
      <rect className="thumb-floor" x={(-stage.width / 2) * T} y={(-stage.depth / 2) * T} width={stage.width * T} height={stage.depth * T} />
      {dancers.map((d) => {
        const p = formation.positions[d.id]
        return p ? <circle key={d.id} cx={p.x * T} cy={p.y * T} r={DANCER_RADIUS * T * 1.4} fill={d.color} /> : null
      })}
    </svg>
  )
})
