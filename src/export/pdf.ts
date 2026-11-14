import { formationTitle } from '../model/choreography.ts'
import type { Choreography } from '../model/types.ts'
import { fontFamily, formatTime } from '../components/ui.ts'
import { LIGHT, drawStage, wrapLines } from './render.ts'

// PDF export: one landscape US Letter page per formation. Each page is drawn on a canvas and embedded as one
// losslessly compressed image, so any text (names in any script) looks exactly as on screen.

/** Page size in PDF points (1/72 in): US Letter, landscape. */
const PAGE = { width: 792, height: 612 }
/** Rendering resolution. 200 dpi prints crisply and keeps files to a few hundred KB per page. */
const DPI = 200

const encoder = new TextEncoder()

async function deflate(data: Uint8Array<ArrayBuffer>): Promise<Uint8Array<ArrayBuffer>> {
  const stream = new Blob([data]).stream().pipeThrough(new CompressionStream('deflate'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

/** A PDF text string that can hold any characters (UTF-16BE with a byte order mark). */
const pdfText = (text: string) => `<FEFF${Array.from(text, (c) => Array.from({ length: c.length }, (_, i) => c.charCodeAt(i).toString(16).padStart(4, '0')).join('')).join('')}>`

interface PageImage {
  width: number
  height: number
  /** Zlib-compressed 8-bit RGB pixels, top row first. */
  data: Uint8Array<ArrayBuffer>
}

/** A minimal PDF 1.4 file with one image filling each page. */
export function buildPdf(pages: PageImage[], title: string): Blob {
  const parts: Uint8Array<ArrayBuffer>[] = []
  const offsets: number[] = []
  let length = 0
  const write = (part: string | Uint8Array<ArrayBuffer>) => {
    const bytes = typeof part === 'string' ? encoder.encode(part) : part
    parts.push(bytes)
    length += bytes.length
  }
  const object = (id: number, dictionary: string, stream?: Uint8Array<ArrayBuffer>) => {
    offsets[id] = length
    write(`${id} 0 obj\n${dictionary}\n`)
    if (stream) {
      write('stream\n')
      write(stream)
      write('\nendstream\n')
    }
    write('endobj\n')
  }

  // The second line's high bytes mark the file as binary for tools that check.
  write('%PDF-1.4\n')
  write(new Uint8Array([0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a]))
  // Objects: 1 catalog, 2 page tree, 3 document info, then page, contents and image for each page.
  const pageId = (i: number) => 4 + 3 * i
  object(1, '<< /Type /Catalog /Pages 2 0 R >>')
  object(2, `<< /Type /Pages /Kids [${pages.map((_, i) => `${pageId(i)} 0 R`).join(' ')}] /Count ${pages.length} >>`)
  object(3, `<< /Title ${pdfText(title)} /Producer (Unison) >>`)
  pages.forEach((image, i) => {
    const content = encoder.encode(`q ${PAGE.width} 0 0 ${PAGE.height} 0 0 cm /Im0 Do Q`)
    object(pageId(i), `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE.width} ${PAGE.height}] /Resources << /XObject << /Im0 ${pageId(i) + 2} 0 R >> >> /Contents ${pageId(i) + 1} 0 R >>`)
    object(pageId(i) + 1, `<< /Length ${content.length} >>`, content)
    object(pageId(i) + 2, `<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /Length ${image.data.length} >>`, image.data)
  })
  const xref = length
  const count = offsets.length
  write(`xref\n0 ${count}\n0000000000 65535 f \n${offsets.slice(1).map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`)
  write(`trailer\n<< /Size ${count} /Root 1 0 R /Info 3 0 R >>\nstartxref\n${xref}\n%%EOF\n`)
  return new Blob(parts, { type: 'application/pdf' })
}

/** Draws page `index` (formation `index`) in PDF points: header, the formation on stage, and its notes. */
function drawPage(ctx: CanvasRenderingContext2D, doc: Choreography, index: number, names: boolean) {
  const formation = doc.formations[index]
  const font = fontFamily()
  const margin = 36
  const right = PAGE.width - margin
  ctx.fillStyle = LIGHT.background
  ctx.fillRect(0, 0, PAGE.width, PAGE.height)
  ctx.textBaseline = 'alphabetic'

  ctx.textAlign = 'left'
  ctx.fillStyle = LIGHT.muted
  ctx.font = `400 10px ${font}`
  ctx.fillText(`${doc.name.trim() || 'Untitled'} · Formation ${index + 1} of ${doc.formations.length}`, margin, margin + 8)
  ctx.fillStyle = LIGHT.text
  ctx.font = `700 20px ${font}`
  ctx.fillText(formationTitle(formation, index), margin, margin + 32)
  if (doc.music) {
    ctx.textAlign = 'right'
    ctx.fillStyle = LIGHT.muted
    ctx.font = `400 11px ${font}`
    ctx.fillText(`${formatTime(formation.start, 1)} – ${formatTime(formation.end, 1)}`, right, margin + 32)
  }

  ctx.textAlign = 'left'
  ctx.font = `400 11px ${font}`
  ctx.fillStyle = LIGHT.text
  const lineHeight = 15
  const text = formation.notes.trim()
  const notes = text ? wrapLines(ctx, text, right - margin, 6) : []
  const notesHeight = notes.length ? notes.length * lineHeight + 8 : 0
  notes.forEach((l, i) => ctx.fillText(l, margin, PAGE.height - margin - notesHeight + 8 + 11 + i * lineHeight))

  const top = margin + 44
  drawStage(ctx, doc, formation.positions, LIGHT, { x: margin, y: top, width: right - margin, height: PAGE.height - margin - notesHeight - top }, names)
}

/** A PDF with one page per formation. Calls `onProgress` with the fraction done. */
export async function exportPdf(doc: Choreography, names: boolean, onProgress: (done: number) => void): Promise<Blob> {
  const scale = DPI / 72
  const canvas = Object.assign(document.createElement('canvas'), { width: Math.round(PAGE.width * scale), height: Math.round(PAGE.height * scale) })
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('This browser could not draw the pages.')
  const pages: PageImage[] = []
  for (let i = 0; i < doc.formations.length; i++) {
    ctx.setTransform(scale, 0, 0, scale, 0, 0)
    drawPage(ctx, doc, i, names)
    const rgba = ctx.getImageData(0, 0, canvas.width, canvas.height).data
    const rgb = new Uint8Array(canvas.width * canvas.height * 3)
    for (let p = 0, q = 0; p < rgba.length; p += 4, q += 3) {
      rgb[q] = rgba[p]
      rgb[q + 1] = rgba[p + 1]
      rgb[q + 2] = rgba[p + 2]
    }
    pages.push({ width: canvas.width, height: canvas.height, data: await deflate(rgb) })
    onProgress((i + 1) / doc.formations.length)
  }
  return buildPdf(pages, doc.name.trim() || 'Untitled')
}
