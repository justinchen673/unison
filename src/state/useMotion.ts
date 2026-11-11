import { useEffect, useState } from 'react'
import { ease, formationStarts, interpolate, sampleAt, totalDuration } from '../model/timeline.ts'
import type { Choreography, Positions } from '../model/types.ts'
import { editor } from './store.ts'

/** Length of the glide shown when switching formations while editing. */
const GLIDE_MS = 450

type Motion =
  | { kind: 'glide'; from: Positions; to: number; startedAt: number }
  | { kind: 'play'; from: number; startedAt: number }

const playTime = (doc: Choreography, motion: { from: number; startedAt: number }, now: number) =>
  Math.min(totalDuration(doc), motion.from + Math.max(0, now - motion.startedAt) / 1000)

function framePositions(doc: Choreography, current: number, motion: Motion | null, now: number): Positions {
  if (motion?.kind === 'play') return sampleAt(doc, playTime(doc, motion, now)).positions
  const target = doc.formations[current].positions
  if (motion?.kind === 'glide' && motion.to === current) return interpolate(motion.from, target, ease((now - motion.startedAt) / GLIDE_MS))
  return target
}

/** Decides what the stage shows: the current formation, a short glide after switching formations, or playback. */
export function useMotion(doc: Choreography, current: number) {
  const [motion, setMotion] = useState<Motion | null>(null)
  const [now, setNow] = useState(0)

  useEffect(() => {
    if (!motion) return
    let frame = requestAnimationFrame(function tick(t) {
      setNow(t)
      if (motion.kind === 'glide') {
        if (t - motion.startedAt >= GLIDE_MS) {
          setMotion(null)
          return
        }
      } else {
        const latest = editor.get().doc
        const time = playTime(latest, motion, t)
        editor.setCurrent(sampleAt(latest, time).index)
        if (time >= totalDuration(latest)) {
          setMotion(null)
          return
        }
      }
      frame = requestAnimationFrame(tick)
    })
    return () => cancelAnimationFrame(frame)
  }, [motion])

  const goTo = (index: number) => {
    if (index < 0 || index >= editor.get().doc.formations.length) return
    const t = performance.now()
    setMotion({ kind: 'glide', from: framePositions(doc, current, motion, t), to: index, startedAt: t })
    setNow(t)
    editor.setCurrent(index)
  }

  /** Plays from the current formation, or from the top when sitting on the last one. */
  const play = () => {
    const t = performance.now()
    setMotion({ kind: 'play', from: current === doc.formations.length - 1 ? 0 : formationStarts(doc)[current], startedAt: t })
    setNow(t)
  }

  /** Stops playback and settles on whichever formation is nearest the playhead. */
  const pause = () => {
    if (motion?.kind !== 'play') return
    const sample = sampleAt(doc, playTime(doc, motion, performance.now()))
    goTo(sample.index + (sample.transition !== null && sample.transition >= 0.5 ? 1 : 0))
  }

  const playing = motion?.kind === 'play'
  return {
    positions: framePositions(doc, current, motion, now),
    time: playing ? playTime(doc, motion, now) : formationStarts(doc)[current],
    total: totalDuration(doc),
    playing,
    moving: motion !== null,
    goTo,
    play,
    pause,
    stop: () => setMotion(null),
  }
}
