'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, CheckCircle, CheckCircle2, XCircle, RotateCcw, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import type { PatentDrawingType } from '@/types/database'

const DRAWING_TYPE_LABELS: Record<PatentDrawingType, string> = {
  system_architecture: '시스템 구조도',
  flowchart: '흐름도',
  ui_wireframe: 'UI 와이어프레임',
  data_flow: '데이터 흐름도',
  other: '기타',
}

interface DrawingInfo {
  drawing_number: number
  caption: string
  drawing_type: PatentDrawingType
  image_url: string | null
  is_confirmed: boolean
}

interface Gate5Props {
  projectId: string
  onApproved: () => void
  onBack: () => void
}

export function Gate5({ projectId, onApproved, onBack }: Gate5Props) {
  const [drawings, setDrawings] = useState<DrawingInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [regenerating, setRegenerating] = useState<number | null>(null)
  const [notes, setNotes] = useState('')
  const [approving, setApproving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadDrawings = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/patents/${projectId}/gates/5`)
      if (res.ok) {
        const json = await res.json()
        setDrawings(json.data?.drawings ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => { loadDrawings() }, [loadDrawings])

  async function handleRegenerate(drawing: DrawingInfo) {
    setRegenerating(drawing.drawing_number)
    setError(null)
    try {
      const res = await fetch(`/api/patents/${projectId}/drawings/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          drawing_number: drawing.drawing_number,
          drawing_type: drawing.drawing_type,
          caption: drawing.caption,
        }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? '재생성 실패'); return }
      await loadDrawings()
    } finally {
      setRegenerating(null)
    }
  }

  async function handleApprove() {
    setApproving(true)
    setError(null)
    try {
      const res = await fetch(`/api/patents/${projectId}/gates/5`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? '승인 실패'); return }
      onApproved()
    } finally {
      setApproving(false)
    }
  }

  const allHaveImages = drawings.length > 0 && drawings.every((d) => d.image_url)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">GATE 5 — 도면 확정</h2>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            도면 목록을 최종 확인하고 최종 출력으로 넘어갑니다.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onBack}>← 이전으로</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : drawings.length === 0 ? (
        <div className="rounded-lg border border-dashed py-12 text-center dark:border-gray-700">
          <p className="text-sm text-gray-400">도면이 없습니다. STEP 5로 돌아가서 도면을 생성해주세요.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {drawings.map((drawing) => (
            <div
              key={drawing.drawing_number}
              className={`flex items-center gap-3 rounded-lg border p-3 ${
                drawing.image_url
                  ? 'border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/20'
                  : 'border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/20'
              }`}
            >
              {drawing.image_url ? (
                <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 flex-shrink-0 text-yellow-500" />
              )}

              {/* thumbnail */}
              {drawing.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={drawing.image_url}
                  alt={drawing.caption}
                  className="h-14 w-20 flex-shrink-0 rounded border object-contain bg-white dark:bg-gray-800"
                />
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-gray-700 dark:text-gray-300">
                    FIG.{drawing.drawing_number}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {DRAWING_TYPE_LABELS[drawing.drawing_type]}
                  </Badge>
                </div>
                <p className="truncate text-sm text-gray-700 dark:text-gray-300">{drawing.caption}</p>
              </div>

              <Button
                size="sm"
                variant="outline"
                className="flex-shrink-0 h-7 text-xs"
                onClick={() => handleRegenerate(drawing)}
                disabled={regenerating === drawing.drawing_number}
              >
                {regenerating === drawing.drawing_number ? (
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                ) : (
                  <RefreshCw className="mr-1 h-3 w-3" />
                )}
                재생성
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* status banner */}
      {!loading && drawings.length > 0 && (
        <div className={`flex items-center gap-2 rounded-lg border p-3 ${
          allHaveImages
            ? 'border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/20'
            : 'border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/20'
        }`}>
          {allHaveImages ? (
            <CheckCircle className="h-4 w-4 text-green-500" />
          ) : (
            <XCircle className="h-4 w-4 text-yellow-500" />
          )}
          <span className={`text-sm ${allHaveImages ? 'text-green-700 dark:text-green-300' : 'text-yellow-700 dark:text-yellow-300'}`}>
            {allHaveImages
              ? `도면 ${drawings.length}개 모두 완료 — 확정 가능합니다.`
              : `이미지가 없는 도면이 있습니다. 재생성 또는 이미지 교체를 해주세요.`}
          </span>
        </div>
      )}

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="space-y-3 border-t border-gray-200 pt-4 dark:border-gray-700">
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="검토 메모 (선택)"
          className="h-20 resize-none text-sm"
          maxLength={500}
        />
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onBack} disabled={approving}>
            <RotateCcw className="mr-1.5 h-4 w-4" />
            도면 수정
          </Button>
          <Button onClick={handleApprove} disabled={approving || drawings.length === 0}>
            {approving ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle className="mr-1.5 h-4 w-4" />
            )}
            도면 확정 및 출력 →
          </Button>
        </div>
      </div>
    </div>
  )
}
