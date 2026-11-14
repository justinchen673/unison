import { AudioBufferSource, BufferTarget, CanvasSource, Mp4OutputFormat, Output, QUALITY_HIGH, getFirstEncodableAudioCodec, getFirstEncodableVideoCodec } from 'mediabunny'
import { fontFamily, formatTime } from '../components/ui.ts'
import { formationTitle } from '../model/choreography.ts'
import { pieceLength, sampleAt } from '../model/timing.ts'
import type { Choreography } from '../model/types.ts'
import { decodeMusic } from '../state/audio.ts'
import { DARK, drawStage } from './render.ts'

// MP4 export: the piece played back in time (music mode timing) with its music, rendered frame by frame on a canvas
// and encoded with the browser's own encoders (WebCodecs) much faster than real time.

const WIDTH = 1920
const HEIGHT = 1080
const FPS = 30
const SAMPLE_RATE = 48000

export class ExportCancelled extends Error {}

/** Whether this browser has the video encoder API at all (Edge, Chrome, recent Safari and Firefox). */
export const canExportVideo = typeof VideoEncoder === 'function'

/** One frame: title bar (piece, current formation, time) above the stage at time `t`. */
function drawFrame(ctx: CanvasRenderingContext2D, doc: Choreography, t: number, names: boolean) {
  const sample = sampleAt(doc.formations, t)
  const font = fontFamily()
  const next = doc.formations[sample.index + 1]
  ctx.fillStyle = DARK.background
  ctx.fillRect(0, 0, WIDTH, HEIGHT)
  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'left'
  ctx.fillStyle = DARK.muted
  ctx.font = `400 26px ${font}`
  ctx.fillText(doc.name.trim() || 'Untitled', 56, 62)
  ctx.fillStyle = DARK.text
  ctx.font = `700 34px ${font}`
  const current = `${sample.index + 1}. ${formationTitle(doc.formations[sample.index], sample.index)}`
  ctx.fillText(sample.moving && next ? `${current}  →  ${sample.index + 2}. ${formationTitle(next, sample.index + 1)}` : current, 56, 108)
  ctx.textAlign = 'right'
  ctx.fillStyle = DARK.muted
  ctx.font = `400 30px ${font}`
  ctx.fillText(formatTime(t, 1), WIDTH - 56, 108)
  drawStage(ctx, doc, sample.positions, DARK, { x: 40, y: 130, width: WIDTH - 80, height: HEIGHT - 160 }, names)
}

export interface VideoResult {
  blob: Blob
  /** True if the piece has music but this browser couldn't encode audio, so the video is silent. */
  silent: boolean
}

/** Renders the piece to an MP4 (1080p, 30 fps) with its music. Calls `onProgress` with the fraction done. */
export async function exportVideo(doc: Choreography, names: boolean, onProgress: (done: number) => void, signal: AbortSignal): Promise<VideoResult> {
  // H.264 plays everywhere; the others are fallbacks for browsers that can't encode it.
  const videoCodec = await getFirstEncodableVideoCodec(['avc', 'hevc', 'vp9', 'av1'], { width: WIDTH, height: HEIGHT, frameRate: FPS })
  if (!videoCodec) throw new Error("This browser can't make videos. Try Microsoft Edge or Google Chrome.")
  const audio = doc.music ? await decodeMusic(doc.music, SAMPLE_RATE) : null
  const audioCodec = audio ? await getFirstEncodableAudioCodec(['aac', 'opus'], { numberOfChannels: audio.numberOfChannels, sampleRate: SAMPLE_RATE }) : null

  const canvas = Object.assign(document.createElement('canvas'), { width: WIDTH, height: HEIGHT })
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('This browser could not draw the video.')
  const output = new Output({ format: new Mp4OutputFormat({ fastStart: 'in-memory' }), target: new BufferTarget() })
  const video = new CanvasSource(canvas, { codec: videoCodec, quality: QUALITY_HIGH })
  output.addVideoTrack(video, { frameRate: FPS })
  const sound = audio && audioCodec ? new AudioBufferSource({ codec: audioCodec, quality: QUALITY_HIGH }) : null
  if (sound) output.addAudioTrack(sound)

  try {
    await output.start()
    if (sound && audio) {
      await sound.add(audio)
      sound.close()
    }
    // Hold the last formation for a moment at the end.
    const frames = Math.ceil((Math.max(pieceLength(doc), 1) + 1) * FPS)
    for (let i = 0; i < frames; i++) {
      if (signal.aborted) throw new ExportCancelled()
      drawFrame(ctx, doc, i / FPS, names)
      await video.add(i / FPS, 1 / FPS)
      if (i % 10 === 0) onProgress(i / frames)
    }
    video.close()
    await output.finalize()
  } catch (error) {
    await output.cancel().catch(() => {})
    throw error
  }
  onProgress(1)
  return { blob: new Blob([(output.target as BufferTarget).buffer!], { type: 'video/mp4' }), silent: !!audio && !sound }
}
