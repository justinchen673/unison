import { useState, type ReactNode } from 'react'
import { PALETTE, addDancer, formationTitle, moveFormation, removeDancers, removeFormation, updateDancers, updateFormation } from '../model/choreography.ts'
import { clamp } from '../model/stage.ts'
import type { StageSize } from '../model/types.ts'
import { editor, type OpenState, type ViewOptions } from '../state/store.ts'
import { supportsFileHandles } from '../state/fileHandles.ts'
import { Icon } from './Icon.tsx'
import { inkFor, shortcut, toggleId } from './ui.ts'

interface InspectorProps {
  state: OpenState
  onAddFormation: () => void
}

export function Inspector({ state, onAddFormation }: InspectorProps) {
  const { doc, current, selection, view } = state
  const formation = doc.formations[current]
  const selected = doc.dancers.filter((d) => selection.includes(d.id))

  const setFormation = (patch: Parameters<typeof updateFormation>[2], field: string) =>
    editor.commit((d) => updateFormation(d, current, patch), `${field}:${formation.id}`)
  const moveTo = (index: number) => {
    editor.commit((d) => moveFormation(d, current, index))
    editor.setCurrent(index)
  }
  const resize = (patch: Partial<StageSize>, field: string) =>
    editor.commit((d) => ({ ...d, stage: { ...d.stage, ...patch } }), field)
  const add = () => {
    const added = addDancer(doc, current)
    editor.commit(() => added.doc)
    editor.select([added.id])
  }

  return (
    <aside className="inspector">
      <section key={formation.id}>
        <h2>Formation {current + 1} <span className="muted">of {doc.formations.length}</span></h2>
        <Field label="Name">
          <input value={formation.name} placeholder={formationTitle(formation, current)} onChange={(e) => setFormation({ name: e.target.value }, 'name')} />
        </Field>
        <div className="row">
          <Field label="Hold (sec)">
            <NumberField value={formation.hold} min={0} max={600} step={0.5} onChange={(hold) => setFormation({ hold }, 'hold')} />
          </Field>
          <Field label="Move to next (sec)">
            <NumberField value={formation.transition} min={0} max={600} step={0.5} onChange={(transition) => setFormation({ transition }, 'transition')} />
          </Field>
        </div>
        <Field label="Notes">
          <textarea rows={3} value={formation.notes} placeholder="Counts, cues, reminders…" onChange={(e) => setFormation({ notes: e.target.value }, 'notes')} />
        </Field>
        <div className="row">
          <button className="btn icon" title="Move earlier" disabled={current === 0} onClick={() => moveTo(current - 1)}><Icon name="left" /></button>
          <button className="btn icon" title="Move later" disabled={current === doc.formations.length - 1} onClick={() => moveTo(current + 1)}><Icon name="right" /></button>
          <button className="btn grow" title="Insert a copy after this formation" onClick={onAddFormation}>Duplicate</button>
          <button className="btn danger" disabled={doc.formations.length === 1} onClick={() => editor.commit((d) => removeFormation(d, current))}>Delete</button>
        </div>
      </section>

      {selected.length > 0 && (
        <section>
          <h2>{selected.length === 1 ? 'Selected dancer' : `${selected.length} dancers selected`}</h2>
          {selected.length === 1 && (
            <div className="row">
              <Field label="Name">
                <input value={selected[0].name} onChange={(e) => editor.commit((d) => updateDancers(d, selection, { name: e.target.value }), `dancer-name:${selected[0].id}`)} />
              </Field>
              <Field label="Label" className="narrow">
                <input value={selected[0].label} maxLength={3} onChange={(e) => editor.commit((d) => updateDancers(d, selection, { label: e.target.value }), `dancer-label:${selected[0].id}`)} />
              </Field>
            </div>
          )}
          <div className="field">
            <span>Color</span>
            <div className="swatches">
              {PALETTE.map((color) => (
                <button key={color} className={`swatch${selected.every((d) => d.color === color) ? ' on' : ''}`} style={{ background: color }}
                  title={color} aria-label={`Color ${color}`} onClick={() => editor.commit((d) => updateDancers(d, selection, { color }))} />
              ))}
              <input type="color" className="swatch custom" title="Custom color" value={selected[0].color}
                onChange={(e) => editor.commit((d) => updateDancers(d, selection, { color: e.target.value }), `color:${selection.join()}`)} />
            </div>
          </div>
          <button className="btn danger" onClick={() => editor.commit((d) => removeDancers(d, selection))}>
            Remove {selected.length === 1 ? 'dancer' : `${selected.length} dancers`} from piece
          </button>
        </section>
      )}

      <section>
        <h2>Dancers <span className="muted">{doc.dancers.length}</span></h2>
        <ul className="dancer-list">
          {doc.dancers.map((d) => (
            <li key={d.id}>
              <button className={selection.includes(d.id) ? 'on' : ''} onClick={(e) => editor.select(e.shiftKey || e.metaKey || e.ctrlKey ? toggleId(selection, d.id) : [d.id])}>
                <span className="dot" style={{ background: d.color, color: inkFor(d.color) }}>{d.label}</span>
                {d.name}
              </button>
            </li>
          ))}
        </ul>
        <button className="btn" onClick={add}><Icon name="plus" />Add dancer</button>
      </section>

      <section>
        <h2>Stage &amp; view</h2>
        <div className="row">
          <Field label="Width (m)">
            <NumberField value={doc.stage.width} min={2} max={60} step={1} onChange={(width) => resize({ width: Math.round(width) }, 'stage-width')} />
          </Field>
          <Field label="Depth (m)">
            <NumberField value={doc.stage.depth} min={2} max={60} step={1} onChange={(depth) => resize({ depth: Math.round(depth) }, 'stage-depth')} />
          </Field>
        </div>
        <Toggle view={view} option="snap">Snap to grid</Toggle>
        <Toggle view={view} option="names">Show names</Toggle>
        <Toggle view={view} option="prevPaths">Show where dancers come from</Toggle>
        <Toggle view={view} option="nextPaths">Show where dancers go next</Toggle>
      </section>

      <section>
        <details>
          <summary>Keyboard shortcuts</summary>
          <dl className="shortcuts">
            <dt>Space</dt><dd>Play / pause</dd>
            <dt>← →</dt><dd>Previous / next formation</dd>
            <dt>Arrow keys</dt><dd>Nudge selected dancers ½ m (Shift: 1 m)</dd>
            <dt>Shift+click or drag a box</dt><dd>Select several dancers</dd>
            <dt>{shortcut('Mod+A')}</dt><dd>Select all dancers</dd>
            <dt>Delete</dt><dd>Remove selected dancers</dd>
            <dt>{shortcut('Mod+Z')} / {shortcut('Mod+Shift+Z')}</dt><dd>Undo / redo</dd>
            <dt>{shortcut('Mod+S')} / {shortcut('Mod+O')}</dt><dd>Save / open a project file</dd>
            {supportsFileHandles && <><dt>{shortcut('Mod+Shift+S')}</dt><dd>Save as a new file</dd></>}
          </dl>
        </details>
      </section>
    </aside>
  )
}

function Field({ label, className = '', children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <label className={`field ${className}`}>
      <span>{label}</span>
      {children}
    </label>
  )
}

/** Number input that can be cleared and retyped; the piece only updates while the text is a valid number. */
function NumberField({ value, min, max, step, onChange }: { value: number; min: number; max: number; step: number; onChange: (value: number) => void }) {
  const [draft, setDraft] = useState<string | null>(null)
  return (
    <input type="number" min={min} max={max} step={step} value={draft ?? String(value)} onBlur={() => setDraft(null)}
      onChange={(e) => {
        setDraft(e.target.value)
        if (e.target.value !== '' && Number.isFinite(e.target.valueAsNumber)) onChange(clamp(e.target.valueAsNumber, min, max))
      }} />
  )
}

function Toggle({ view, option, children }: { view: ViewOptions; option: keyof ViewOptions; children: ReactNode }) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={view[option]} onChange={(e) => editor.setView({ [option]: e.target.checked })} />
      {children}
    </label>
  )
}
