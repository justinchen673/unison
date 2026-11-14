import { Fragment, useEffect, useEffectEvent, useLayoutEffect, useRef, useState, type PointerEvent } from 'react'
import { formationTitle } from '../model/choreography.ts'
import { clamp } from '../model/stage.ts'
import { earliestStart, retime } from '../model/timing.ts'
import type { Choreography } from '../model/types.ts'
import { PEAKS_PER_SECOND, musicPeaks } from '../state/audio.ts'
import { addMusic, removeMusic } from '../state/persistence.ts'
import { editor } from '../state/store.ts'
import type { Playback } from '../state/usePlayback.ts'
import { Icon } from './Icon.tsx'
import { formatTime } from './ui.ts'

/** Zoom limits, in pixels per second. */
const MIN_ZOOM = 2
const MAX_ZOOM = 400
/** Block edges dragged within this many pixels of the playhead snap to it. */
const SNAP_PX = 8
/** Pointer moves shorter than this many pixels are clicks, not drags. */
const CLICK_PX = 3
/** Ruler steps in seconds; the smallest that keeps labels at least 64 px apart is used. */
const STEPS = [0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600]
/** Must match the height of `.wave` in index.css. */
const WAVE_HEIGHT = 44

interface MusicTimelineProps {
  doc: Choreography
  current: number
  playback: Playback
  /** Makes formation `index` current and moves the playhead to its start. */
  onSelect: (index: number) => void
  onAdd: () => void
  /** Starts or ends the current formation at the playhead. */
  onMark: (edge: 'start' | 'end') => void
}

interface BlockDrag {
  edge: 'move' | 'start' | 'end'
  index: number
  x: number
  /** The piece when the drag began; every move re-times from here, so pushed neighbors spring back. */
  origin: Choreography
  /** Makes the whole drag one undo step. */
  key: string
  moved: boolean
}

/** Music mode's bottom bar: transport, the music's waveform, and a block per formation that can be dragged in time. */
export function MusicTimeline({ doc, current, playback, onSelect, onAdd, onMark }: MusicTimelineProps) {
  const scroller = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const drag = useRef<BlockDrag | null>(null)
  const scrubbing = useRef(false)
  const anchor = useRef<{ t: number; x: number } | null>(null)
  const [view, setView] = useState({ left: 0, width: 0 })
  /** Pixels per second; null fits the whole piece in view. */
  const [zoom, setZoom] = useState<number | null>(null)
  const [peaks, setPeaks] = useState<{ id: string; peaks: Float32Array } | null>(null)
  const { time, playing } = playback
  const { music } = doc
  const span = Math.max(playback.length + 8, 20)
  const pps = zoom ?? clamp((view.width - 8) / span, MIN_ZOOM, MAX_ZOOM)
  const wave = music && peaks?.id === music.id ? peaks.peaks : null
  const last = doc.formations.length - 1

  useEffect(() => {
    if (!music) return
    let live = true
    musicPeaks(music).then((p) => live && setPeaks({ id: music.id, peaks: p }), () => {})
    return () => {
      live = false
    }
  }, [music])

  useEffect(() => {
    const el = scroller.current!
    const measure = () => setView({ left: el.scrollLeft, width: el.clientWidth })
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Keeps the time under the zoom anchor at the same spot on screen.
  useLayoutEffect(() => {
    const a = anchor.current
    if (!a || !scroller.current) return
    scroller.current.scrollLeft = a.t * pps - a.x
    anchor.current = null
  }, [pps])

  // Follows the playhead when it leaves the visible part of the timeline.
  const followPlayhead = useEffectEvent(() => {
    const el = scroller.current
    if (!el || drag.current || scrubbing.current) return
    const x = time * pps
    if (x < el.scrollLeft || x > el.scrollLeft + el.clientWidth - 24) el.scrollLeft = Math.max(0, x - el.clientWidth * 0.2)
  })
  useEffect(() => followPlayhead(), [time])

  useEffect(() => {
    const c = canvas.current
    const g = c?.getContext('2d')
    if (!c || !g) return
    const dpr = window.devicePixelRatio || 1
    const width = Math.max(1, Math.round(view.width))
    c.width = width * dpr
    c.height = WAVE_HEIGHT * dpr
    if (!wave) return
    g.scale(dpr, dpr)
    g.fillStyle = getComputedStyle(c).color
    for (let px = 0; px < width; px++) {
      const i0 = Math.floor(((view.left + px) / pps) * PEAKS_PER_SECOND)
      const i1 = Math.max(i0 + 1, Math.floor(((view.left + px + 1) / pps) * PEAKS_PER_SECOND))
      let peak = 0
      for (let i = i0; i < i1 && i < wave.length; i++) if (wave[i] > peak) peak = wave[i]
      if (!peak) continue
      const bar = Math.max(1, peak * (WAVE_HEIGHT - 4))
      g.fillRect(px, (WAVE_HEIGHT - bar) / 2, 1, bar)
    }
  }, [wave, pps, view])

  const zoomTo = (next: number, t: number, x: number) => {
    anchor.current = { t, x }
    setZoom(clamp(next, MIN_ZOOM, MAX_ZOOM))
  }
  /** Zooms around the playhead if it's in view, else around the middle of the view. */
  const zoomBy = (factor: number) => {
    const inView = time * pps >= view.left && time * pps <= view.left + view.width
    const t = inView ? time : (view.left + view.width / 2) / pps
    zoomTo(pps * factor, t, t * pps - view.left)
  }

  const onWheel = useEffectEvent((e: WheelEvent) => {
    const el = scroller.current!
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      const x = e.clientX - el.getBoundingClientRect().left
      zoomTo(pps * Math.exp(-e.deltaY / 300), (el.scrollLeft + x) / pps, x)
    } else if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      e.preventDefault()
      el.scrollLeft += e.deltaY
    }
  })
  useEffect(() => {
    const el = scroller.current!
    const listener = (e: WheelEvent) => onWheel(e)
    el.addEventListener('wheel', listener, { passive: false })
    return () => el.removeEventListener('wheel', listener)
  }, [])

  const timeAt = (e: PointerEvent) => {
    const el = scroller.current!
    return (e.clientX - el.getBoundingClientRect().left + el.scrollLeft) / pps
  }

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    // Ignore the scrollbar, which is part of this element.
    if (e.button !== 0 || e.clientY - el.getBoundingClientRect().top > el.clientHeight) return
    el.setPointerCapture(e.pointerId)
    const target = e.target as Element
    const block = target.closest('[data-block]')
    if (!block) {
      scrubbing.current = true
      playback.seek(timeAt(e))
      return
    }
    const index = Number(block.getAttribute('data-block'))
    const edge = (target.closest('[data-edge]')?.getAttribute('data-edge') ?? 'move') as BlockDrag['edge']
    editor.setCurrent(index)
    drag.current = { edge, index, x: e.clientX, origin: doc, key: `block:${performance.now()}`, moved: false }
  }

  const onPointerMove = (e: PointerEvent) => {
    if (scrubbing.current) return playback.seek(timeAt(e))
    const d = drag.current
    if (!d || (!d.moved && Math.abs(e.clientX - d.x) < CLICK_PX)) return
    if (!d.moved) {
      d.moved = true
      playback.pause()
    }
    const f = d.origin.formations[d.index]
    const dt = (e.clientX - d.x) / pps
    const snap = (t: number) => (Math.abs(t - time) * pps <= SNAP_PX ? time : t)
    let start = f.start
    let end = f.end
    if (d.edge === 'start') {
      start = Math.min(snap(f.start + dt), f.end)
    } else if (d.edge === 'end') {
      end = snap(f.end + dt)
    } else {
      const length = f.end - f.start
      start = f.start + dt
      // Snap whichever end of the block is nearer the playhead.
      start = Math.abs(start + length - time) < Math.abs(start - time) ? snap(start + length) - length : snap(start)
      start = Math.max(start, earliestStart(d.origin, d.index))
      end = start + length
    }
    editor.commit(() => retime(d.origin, d.index, start, end), d.key)
  }

  const onPointerUp = () => {
    const d = drag.current
    if (d && !d.moved) onSelect(d.index)
    drag.current = null
    scrubbing.current = false
  }

  const step = STEPS.find((s) => s * pps >= 64) ?? STEPS.at(-1)!
  const ticks = Array.from({ length: Math.floor(span / step) + 1 }, (_, i) => i * step)

  return (
    <footer className="timeline music-timeline">
      <div className="transport">
        <button className="btn icon primary" title={playing ? 'Pause (Space)' : 'Play (Space)'} onClick={playback.toggle}><Icon name={playing ? 'pause' : 'play'} /></button>
        <span className="clock">{formatTime(time)}<span className="muted"> / {formatTime(playback.length)}</span></span>
        <span className="divider" />
        <button className="btn icon" title="Previous formation (←)" disabled={current === 0} onClick={() => onSelect(current - 1)}><Icon name="prev" /></button>
        <button className="btn icon" title="Next formation (→)" disabled={current === last} onClick={() => onSelect(current + 1)}><Icon name="next" /></button>
        <span className="position">Formation {current + 1} of {doc.formations.length}</span>
        <button className="btn" title="Start the current formation at the playhead ([)" onClick={() => onMark('start')}>[ Start here</button>
        <button className="btn" title="End the current formation at the playhead (])" onClick={() => onMark('end')}>End here ]</button>
        <button className="btn" title="Add a formation at the playhead, starting as a copy of the one before it" onClick={onAdd}><Icon name="plus" />Formation</button>
        <span className="music-tools">
          {music ? (
            <>
              <span className="music-name" title={music.name}>♪ {music.name}</span>
              <button className="btn" title="Use a different audio file" onClick={() => void addMusic()}>Replace…</button>
              <button className="btn danger" title="Remove the music from this project" onClick={removeMusic}>Remove</button>
            </>
          ) : (
            <button className="btn" title="Add an MP3 or other audio file; it is saved inside the project file" onClick={() => void addMusic()}>Add music…</button>
          )}
          <span className="divider" />
          <button className="btn icon" title="Zoom out (Ctrl+scroll)" onClick={() => zoomBy(1 / 1.5)}><Icon name="minus" /></button>
          <button className="btn icon" title="Zoom in (Ctrl+scroll)" onClick={() => zoomBy(1.5)}><Icon name="plus" /></button>
        </span>
      </div>
      <div className="lanes" ref={scroller} onScroll={(e) => setView({ left: e.currentTarget.scrollLeft, width: e.currentTarget.clientWidth })}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
        <div className="lanes-inner" style={{ width: Math.max(span * pps, view.width) }}>
          <div className="ruler">
            {ticks.map((t) => <span key={t} className="tick" style={{ left: t * pps }}>{formatTime(t, step < 1 ? 1 : 0)}</span>)}
          </div>
          <div className="wave-lane" style={{ width: view.width }}>
            <canvas ref={canvas} className="wave" />
            {!music && <span className="wave-empty">No music yet. Add an MP3 to time the formations to it.</span>}
          </div>
          <div className="blocks">
            {doc.formations.map((f, i) => {
              const next = doc.formations[i + 1]
              return (
                <Fragment key={f.id}>
                  <div data-block={i} className={`block${i === current ? ' current' : ''}`} style={{ left: f.start * pps, width: Math.max((f.end - f.start) * pps, 6) }}
                    title={`${formationTitle(f, i)}: holds ${formatTime(f.start)}–${formatTime(f.end)}`}>
                    <span className="block-label"><b>{i + 1}</b>{formationTitle(f, i)}</span>
                    <span data-edge="start" className="edge start" />
                    <span data-edge="end" className="edge end" />
                  </div>
                  {next && next.start > f.end && <div className="gap" style={{ left: f.end * pps, width: (next.start - f.end) * pps }} />}
                </Fragment>
              )
            })}
          </div>
          <div className="playhead" style={{ left: time * pps }} />
        </div>
      </div>
    </footer>
  )
}
