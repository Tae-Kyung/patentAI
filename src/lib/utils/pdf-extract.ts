import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist'

let workerInitialized = false

function ensureWorker() {
  if (workerInitialized) return
  GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString()
  workerInitialized = true
}

export interface PdfExtractResult {
  text: string
  pageCount: number
}

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

export async function extractTextFromPdf(file: File): Promise<PdfExtractResult> {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('PDF_TOO_LARGE')
  }

  if (file.type !== 'application/pdf') {
    throw new Error('NOT_PDF')
  }

  ensureWorker()

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await getDocument({ data: arrayBuffer }).promise

  const pages: string[] = []

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const pageText = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
    pages.push(pageText)
  }

  return {
    text: pages.join('\n\n'),
    pageCount: pdf.numPages,
  }
}

export interface PdfRenderResult {
  images: string[] // base64 JPEG (without data URL prefix)
  pageCount: number
}

export async function renderPdfToImages(file: File, maxPages = 10): Promise<PdfRenderResult> {
  ensureWorker()

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await getDocument({ data: arrayBuffer }).promise
  const numPages = Math.min(pdf.numPages, maxPages)
  const images: string[] = []

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i)
    const viewport = page.getViewport({ scale: 2.0 })
    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height
    const context = canvas.getContext('2d')!
    await page.render({ canvasContext: context, viewport }).promise
    images.push(canvas.toDataURL('image/jpeg', 0.7).replace(/^data:image\/jpeg;base64,/, ''))
    canvas.remove()
  }

  return { images, pageCount: pdf.numPages }
}
