import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { exportPdf } from '../export/pdf.ts'
import { ExportCancelled, canExportVideo, exportVideo } from '../export/video.ts'
import type { Choreography } from '../model/types.ts'
import { supportsFileHandles } from '../state/fileHandles.ts'
import { exportFileName, saveExport } from '../state/persistence.ts'

interface ExportDialogProps {
  doc: Choreography
  /** Draw dancer names (follows the "Show names" view option). */
  names: boolean
  onClose: () => void
}

interface Job {
  kind: 'pdf' | 'video'
  progress: number
  controller: AbortController
}

/** Modal for exporting the piece as a PDF (one page per formation) or an MP4 video with the music. */
export function ExportDialog({ doc, names, onClose }: ExportDialogProps) {
  const [job, setJob] = useState<Job | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const firstButton = useRef<HTMLButtonElement>(null)

  useEffect(() => firstButton.current?.focus(), [])

  const run = async (kind: Job['kind']) => {
    const controller = new AbortController()
    const progress = (value: number) => setJob((j) => j && { ...j, progress: value })
    setMessage(null)
    setJob({ kind, progress: 0, controller })
    const video = { silent: false }
    try {
      const saved = kind === 'pdf'
        ? await saveExport(exportFileName(doc, '.pdf'), { description: 'PDF document', mime: 'application/pdf', extension: '.pdf' }, () => exportPdf(doc, names, progress))
        : await saveExport(exportFileName(doc, '.mp4'), { description: 'MP4 video', mime: 'video/mp4', extension: '.mp4' }, async () => {
          const result = await exportVideo(doc, names, progress, controller.signal)
          video.silent = result.silent
          return result.blob
        })
      if (saved) {
        const done = supportsFileHandles ? 'saved' : 'downloaded'
        setMessage(kind === 'pdf' ? `PDF ${done}.` : video.silent ? `Video ${done}, but without sound: this browser can't encode audio. Try Edge or Chrome.` : `Video ${done}.`)
      }
    } catch (error) {
      setMessage(error instanceof ExportCancelled ? 'Export cancelled.' : `Couldn't export. ${error instanceof Error ? error.message : ''}`)
    } finally {
      setJob(null)
    }
  }

  const close = () => {
    if (!job) onClose()
  }

  // Listens on the window, because focus leaves the dialog when its buttons are disabled during an export.
  const onKeyDown = useEffectEvent((e: KeyboardEvent) => {
    if (e.key === 'Escape') close()
  })
  useEffect(() => {
    const listener = (e: KeyboardEvent) => onKeyDown(e)
    window.addEventListener('keydown', listener)
    return () => window.removeEventListener('keydown', listener)
  }, [])

  return (
    <div className="dialog-backdrop" onPointerDown={(e) => e.target === e.currentTarget && close()}>
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="export-title">
        <h2 id="export-title">Export</h2>
        <div className="export-option">
          <div>
            <b>PDF</b>
            <p>One page per formation, with its name and notes. Good for printing or sending to dancers.</p>
          </div>
          <button ref={firstButton} className="btn primary" disabled={!!job} onClick={() => void run('pdf')}>Export PDF…</button>
        </div>
        <div className="export-option">
          <div>
            <b>Video (MP4)</b>
            <p>
              The piece playing from start to finish {doc.music ? 'with its music' : '(silent: this project has no music)'}, timed as in music
              mode. 1080p.
            </p>
          </div>
          <button className="btn primary" disabled={!!job || !canExportVideo} onClick={() => void run('video')}>Export video…</button>
        </div>
        {!canExportVideo && <p className="warn">This browser can't make videos. Use Microsoft Edge or Google Chrome.</p>}
        {job && (
          <div className="export-progress">
            <progress max={1} value={job.progress} />
            <span>{job.kind === 'pdf' ? 'Making the PDF' : 'Making the video'}… {Math.round(job.progress * 100)}%</span>
            {job.kind === 'video' && <button className="btn" onClick={() => job.controller.abort()}>Cancel</button>}
          </div>
        )}
        {message && <p className="export-message" role="status">{message}</p>}
        <div className="dialog-actions">
          <button className="btn" disabled={!!job} onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}
