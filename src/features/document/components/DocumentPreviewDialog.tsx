'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { ChevronLeft, ChevronRight, Download } from 'lucide-react'
import { marked } from 'marked'
import { exportImagesToPdf } from '@/lib/utils/document-export'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { Document as DocType } from '@/types/database'
import { formatPitchContent } from '../utils'

const HTML_DOC_TYPES = new Set<string>(['landing', 'ppt'])
const IMAGE_DOC_TYPES = new Set<string>(['infographic', 'leaflet'])
const MULTI_IMAGE_DOC_TYPES = new Set<string>(['ppt_image'])

interface DocumentPreviewDialogProps {
  doc: DocType | null
  onClose: () => void
}

export function DocumentPreviewDialog({ doc, onClose }: DocumentPreviewDialogProps) {
  const t = useTranslations()
  const [slideIndex, setSlideIndex] = useState(0)

  const isMultiImage = doc ? MULTI_IMAGE_DOC_TYPES.has(doc.type) : false
  const isImage = doc ? IMAGE_DOC_TYPES.has(doc.type) : false
  const isHtml = doc ? HTML_DOC_TYPES.has(doc.type) : false

  return (
    <Dialog open={!!doc} onOpenChange={() => onClose()}>
      <DialogContent className={`max-h-[90vh] overflow-hidden ${isMultiImage ? 'max-w-5xl' : 'max-w-4xl'}`}>
        <DialogHeader>
          <DialogTitle>{doc?.title}</DialogTitle>
        </DialogHeader>
        <div className="max-h-[70vh] overflow-y-auto">
          {doc && isMultiImage ? (() => {
            let slides: string[] = []
            try { slides = JSON.parse(doc.content || '[]') } catch { /* ignore */ }
            if (slides.length === 0) return <p className="text-center text-muted-foreground">{t('documentStage.noSlides')}</p>
            return (
              <div className="flex flex-col items-center gap-4">
                <div className="relative w-full flex items-center justify-center bg-black/5 dark:bg-white/5 rounded-lg p-2 min-h-[400px]">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute left-2 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-black/20 text-white hover:bg-black/40"
                    onClick={() => setSlideIndex((prev) => (prev - 1 + slides.length) % slides.length)}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <img
                    src={slides[slideIndex]}
                    alt={`Slide ${slideIndex + 1}`}
                    className="max-h-[60vh] rounded object-contain"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-black/20 text-white hover:bg-black/40"
                    onClick={() => setSlideIndex((prev) => (prev + 1) % slides.length)}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">
                    {slideIndex + 1} / {slides.length}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const a = document.createElement('a')
                      a.href = slides[slideIndex]
                      a.download = `slide-${slideIndex + 1}.png`
                      a.target = '_blank'
                      document.body.appendChild(a)
                      a.click()
                      document.body.removeChild(a)
                    }}
                  >
                    <Download className="mr-1 h-4 w-4" />
                    {t('documentStage.downloadSlide')}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => exportImagesToPdf(doc.title, slides)}
                  >
                    <Download className="mr-1 h-4 w-4" />
                    PDF
                  </Button>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2 w-full justify-center">
                  {slides.map((url, i) => (
                    <button
                      key={i}
                      onClick={() => setSlideIndex(i)}
                      className={`shrink-0 overflow-hidden rounded border-2 transition-all ${
                        i === slideIndex
                          ? 'border-primary ring-2 ring-primary/30'
                          : 'border-transparent opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={url} alt={`Slide ${i + 1}`} className="h-14 w-24 object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )
          })() : doc && isImage ? (
            <div className="flex justify-center">
              <img
                src={doc.storage_path || doc.content || ''}
                alt={doc.title}
                className="max-h-[65vh] rounded object-contain"
              />
            </div>
          ) : doc && isHtml ? (
            <iframe
              srcDoc={doc.content || ''}
              sandbox="allow-scripts allow-same-origin"
              className="h-[60vh] w-full rounded border"
              title={`${doc.title} Preview`}
            />
          ) : (
            <div
              className="markdown-preview"
              dangerouslySetInnerHTML={{
                __html: marked.parse(
                  doc?.type === 'pitch'
                    ? formatPitchContent(doc?.content || '')
                    : (doc?.content || ''),
                  { async: false }
                ) as string,
              }}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
