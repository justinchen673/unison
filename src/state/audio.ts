import { uid } from '../model/choreography.ts'
import { roundTime } from '../model/timing.ts'
import type { Music } from '../model/types.ts'

/** Waveform resolution: the loudest sample in each 1/100 s. */
export const PEAKS_PER_SECOND = 100

/** Decodes audio without a user gesture or an open audio output (an offline context never plays anything). */
const decode = (bytes: ArrayBuffer) => new OfflineAudioContext(1, 1, 44100).decodeAudioData(bytes)

function peaksOf(buffer: AudioBuffer): Float32Array {
  const per = Math.max(1, Math.round(buffer.sampleRate / PEAKS_PER_SECOND))
  const peaks = new Float32Array(Math.ceil(buffer.length / per))
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const samples = buffer.getChannelData(c)
    for (let i = 0; i < samples.length; i++) {
      const v = Math.abs(samples[i])
      const k = (i / per) | 0
      if (v > peaks[k]) peaks[k] = v
    }
  }
  return peaks
}

function toBase64(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const url = String(reader.result)
      resolve(url.slice(url.indexOf(',') + 1))
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

function fromBase64(data: string): Uint8Array<ArrayBuffer> {
  const text = atob(data)
  const bytes = new Uint8Array(text.length)
  for (let i = 0; i < text.length; i++) bytes[i] = text.charCodeAt(i)
  return bytes
}

/** Decodes the music at `sampleRate` (resampling if needed), e.g. to encode it into a video. */
export const decodeMusic = (music: Music, sampleRate: number) => new OfflineAudioContext(1, 1, sampleRate).decodeAudioData(fromBase64(music.data).buffer)

/** Waveform peaks by music id, so each song is decoded only once. */
const peakCache = new Map<string, Promise<Float32Array>>()

/** Turns an audio file into music to embed in the project. Rejects if the browser can't play the file. */
export async function readMusicFile(file: File): Promise<Music> {
  const buffer = await decode(await file.arrayBuffer())
  const music = { id: uid(), name: file.name, type: file.type || 'audio/mpeg', duration: roundTime(buffer.duration), data: await toBase64(file) }
  peakCache.set(music.id, Promise.resolve(peaksOf(buffer)))
  return music
}

/** Waveform of the music: one peak (0–1) per 1/PEAKS_PER_SECOND seconds. */
export function musicPeaks(music: Music): Promise<Float32Array> {
  let peaks = peakCache.get(music.id)
  if (!peaks) {
    peaks = decode(fromBase64(music.data).buffer).then(peaksOf)
    peakCache.set(music.id, peaks)
    peaks.catch(() => peakCache.delete(music.id))
  }
  return peaks
}

const urlCache = new Map<string, string>()

/** A URL an audio element can play the music from. Kept for the whole session so undo/redo can switch songs instantly. */
export function musicUrl(music: Music): string {
  let url = urlCache.get(music.id)
  if (!url) {
    url = URL.createObjectURL(new Blob([fromBase64(music.data)], { type: music.type }))
    urlCache.set(music.id, url)
  }
  return url
}
