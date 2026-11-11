import { memo, useEffect, useRef } from 'react'
import { formationTitle } from '../model/choreography.ts'
import { WING } from '../model/stage.ts'
import type { Choreography, Dancer, Formation, StageSize } from '../model/types.ts'
import { Icon } from './Icon.tsx'
import { clock } from './ui.ts'

interface TimelineProps {
  doc: Choreography
  current: number
  time: number
  total: number
  playing: boolean
  onSelect: (index: number) => void
  onTogglePlay: () => void
  onAdd: () => void
}

export function Timeline({ doc, current, time, total, playing, onSelect, onTogglePlay, onAdd }: TimelineProps) {
  const stripRef = useRef<HTMLOListElement>(null)
  const last = doc.formations.length - 1

  useEffect(() => {
    stripRef.current?.children[current]?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [current])

  return (
    <footer className="timeline">
      <div className="transport">
        <button className="btn icon" title="Previous formation (←)" disabled={current === 0} onClick={() => onSelect(current - 1)}><Icon name="prev" /></button>
        <button className="btn icon primary" title={playing ? 'Pause (Space)' : 'Play (Space)'} onClick={onTogglePlay}><Icon name={playing ? 'pause' : 'play'} /></button>
        <button className="btn icon" title="Next formation (→)" disabled={current === last} onClick={() => onSelect(current + 1)}><Icon name="next" /></button>
        <span className="clock">{clock(time)} / {clock(total)}</span>
        <div className="progress"><div style={{ width: `${total > 0 ? (time / total) * 100 : 0}%` }} /></div>
      </div>
      <ol className="strip" ref={stripRef}>
        {doc.formations.map((f, i) => (
          <li key={f.id}>
            <button className={`card${i === current ? ' current' : ''}`} aria-current={i === current} onClick={() => onSelect(i)}>
              <Thumbnail formation={f} dancers={doc.dancers} stage={doc.stage} />
              <span className="card-title"><b>{i + 1}</b>{formationTitle(f, i)}</span>
              <span className="card-meta">{f.hold}s hold{i < last && ` · ${f.transition}s move`}{f.notes.trim() && ' · notes'}</span>
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

const Thumbnail = memo(function Thumbnail({ formation, dancers, stage }: { formation: Formation; dancers: Dancer[]; stage: StageSize }) {
  const outer = stage.width / 2 + WING
  return (
    <svg className="thumb" viewBox={`${-outer * 10} ${-stage.depth * 5} ${outer * 20} ${stage.depth * 10}`} aria-hidden="true">
      <rect className="thumb-floor" x={-stage.width * 5} y={-stage.depth * 5} width={stage.width * 10} height={stage.depth * 10} />
      {dancers.map((d) => {
        const p = formation.positions[d.id]
        return p ? <circle key={d.id} cx={p.x * 10} cy={p.y * 10} r={4.5} fill={d.color} /> : null
      })}
    </svg>
  )
})
