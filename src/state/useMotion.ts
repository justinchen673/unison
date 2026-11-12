import { useEffect, useState } from 'react'
import { ease, interpolate } from '../model/interpolate.ts'
import type { Choreography, Positions } from '../model/types.ts'
import { editor } from './store.ts'

/** Length of the glide shown when switching formations. */
const GLIDE_MS = 450

interface Glide {
  from: Positions
  to: number
  startedAt: number
}

function framePositions(doc: Choreography, current: number, glide: Glide | null, now: number): Positions {
  const target = doc.formations[current].positions
  return glide?.to === current ? interpolate(glide.from, target, ease((now - glide.startedAt) / GLIDE_MS)) : target
}

/** Decides what the stage shows: the current formation, or a short glide into it right after switching formations. */
export function useMotion(doc: Choreography, current: number) {
  const [glide, setGlide] = useState<Glide | null>(null)
  const [now, setNow] = useState(0)

  useEffect(() => {
    if (!glide) return
    let frame = requestAnimationFrame(function tick(t) {
      setNow(t)
      if (t - glide.startedAt >= GLIDE_MS) {
        setGlide(null)
        return
      }
      frame = requestAnimationFrame(tick)
    })
    return () => cancelAnimationFrame(frame)
  }, [glide])

  /** Switches to formation `index`, gliding dancers there from wherever they are on screen. */
  const goTo = (index: number) => {
    if (index < 0 || index >= (editor.get().doc?.formations.length ?? 0)) return
    const t = performance.now()
    setGlide({ from: framePositions(doc, current, glide, t), to: index, startedAt: t })
    setNow(t)
    editor.setCurrent(index)
  }

  return {
    positions: framePositions(doc, current, glide, now),
    moving: glide !== null,
    goTo,
    stop: () => setGlide(null),
  }
}
