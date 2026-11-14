import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { pieceLength } from '../model/timing.ts'
import type { Choreography } from '../model/types.ts'
import { musicUrl } from './audio.ts'

/**
 * Music mode playhead (seconds). While the music plays it is the clock; without music, or past its end, the system
 * clock keeps time so formations can still be played back.
 */
export function usePlayback(doc: Choreography) {
  const [time, setTime] = useState(0)
  const [playing, setPlaying] = useState(false)
  const timeRef = useRef(0)
  /** Playhead position `from` at performance.now() `at`, for the system clock. */
  const clock = useRef({ from: 0, at: 0 })
  const player = useRef<{ id: string; audio: HTMLAudioElement } | null>(null)
  const music = doc.music
  const length = pieceLength(doc)

  /** The audio element for the current music, created on first use. */
  const audio = () => {
    if (!music) return null
    if (player.current?.id !== music.id) {
      player.current?.audio.pause()
      player.current = { id: music.id, audio: Object.assign(new Audio(musicUrl(music)), { preload: 'auto' }) }
    }
    return player.current.audio
  }

  /** Plays the music from `t`, or keeps it quiet if `t` is past its end. */
  const startAudio = (el: HTMLAudioElement, t: number) => {
    if (t >= (music?.duration ?? 0)) return el.pause()
    el.currentTime = t
    void el.play().catch(() => {})
  }

  const start = useEffectEvent(() => {
    const el = audio()
    clock.current = { from: timeRef.current, at: performance.now() }
    if (el) startAudio(el, timeRef.current)
    return el
  })

  /** Moves the playhead for an animation frame. Returns false once the piece has ended. */
  const advance = useEffectEvent((now: number, el: HTMLAudioElement | null) => {
    let t = clock.current.from + (now - clock.current.at) / 1000
    if (el && !el.paused) {
      t = el.currentTime
      clock.current = { from: t, at: now }
    }
    const done = t >= length
    timeRef.current = done ? length : t
    setTime(timeRef.current)
    if (done) setPlaying(false)
    return !done
  })

  // Loads the music ahead of time so playback starts right away.
  const preload = useEffectEvent(() => void audio())
  useEffect(() => preload(), [music])

  // Restarts when the music is added, replaced or removed while playing.
  useEffect(() => {
    if (!playing) return
    const el = start()
    const loop = { frame: 0 }
    const tick = (now: number) => {
      if (advance(now, el)) loop.frame = requestAnimationFrame(tick)
    }
    loop.frame = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(loop.frame)
      el?.pause()
    }
  }, [playing, music])

  useEffect(() => () => player.current?.audio.pause(), [])

  const seek = (t: number) => {
    const at = Math.max(0, t)
    timeRef.current = at
    clock.current = { from: at, at: performance.now() }
    setTime(at)
    const el = playing ? audio() : null
    if (el) startAudio(el, at)
  }

  const play = () => {
    if (timeRef.current >= length) seek(0)
    setPlaying(true)
  }
  const pause = () => setPlaying(false)

  return { time, playing, length, seek, play, pause, toggle: () => (playing ? pause() : play()) }
}

export type Playback = ReturnType<typeof usePlayback>
