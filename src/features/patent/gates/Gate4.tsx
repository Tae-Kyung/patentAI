'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, CheckCircle, CheckCircle2, XCircle, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

const SECTION_LABELS: Record<string, string> = {
  title: '발명의 명칭',
  tech_field: '기술 분야',
  background: '배경 기술',
  problem: '해결 과제',
  solution: '과제 해결 수단',
  effect: '발명의 효과',
  drawing_desc: '도면 간단 설명',
  detailed_desc: '발명의 상세한 설명',
  abstract: '요약서',
}

interface SectionStatus {
  section_type: string
  done: boolean
  version: number
}

interface Gate4Props {
  projectId: string
  onApproved: () => void
  onBack: () => void
}

export function Gate4({ projectId, onApproved, onBack }: Gate4Props) {
  const [sectionStatus, setSectionStatus] = useState<SectionStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [notes, setNotes] = useState('')
  const [approving, setApproving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewContent, setPreviewContent] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  const loadStatus = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/patents/${projectId}/gates/4`)
      if (res.ok) {
        const json = await res.json()
        setSectionStatus(json.data?.sectionStatus ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => { loadStatus() }, [loadStatus])

  async function loadPreview() {
    const results = await Promise.all(
      Object.keys(SECTION_LABELS).map((t) =>
        fetch(`/api/patents/${projectId}/sections/${t}`).then((r) => r.json()).catch(() => null)
      )
    )
    const text = Object.keys(SECTION_LABELS)
      .map((t, i) => {
        const content = results[i]?.data?.content ?? ''
        return `## ${SECTION_LABELS[t]}\n\n${content}`
      })
      .join('\n\n---\n\n')
    setPreviewContent(text)
    setShowPreview(true)
  }

  async function handleApprove() {
    setApproving(true)
    setError(null)
    try {
      const res = await fetch(`/api/patents/${projectId}/gates/4`, {
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

  const doneCount = sectionStatus.filter((s) => s.done).length
  const allDone = doneCount === 9

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">GATE 4 — 명세서 본문 확정</h2>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            9개 섹션 완료 여부를 확인하고 도면 작성으로 넘어갑니다.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onBack}>← 이전으로</Button>
      </div>

      {/* section checklist */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {sectionStatus.map((s) => (
            <div
              key={s.section_type}
              className={`flex items-center gap-2 rounded-lg border p-3 ${
                s.done
                  ? 'border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/20'
                  : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50'
              }`}
            >
              {s.done ? (
                <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 flex-shrink-0 text-gray-300 dark:text-gray-600" />
              )}
              <span className="flex-1 text-sm text-gray-800 dark:text-gray-200">
                {SECTION_LABELS[s.section_type]}
              </span>
              {s.version > 0 && (
                <span className="text-xs text-gray-400">v{s.version}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* summary */}
      {!loading && (
        <div className={`flex items-center gap-3 rounded-lg border p-3 ${
          allDone
            ? 'border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/20'
            : 'border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/20'
        }`}>
          {allDone ? (
            <CheckCircle className="h-5 w-5 text-green-500" />
          ) : (
            <XCircle className="h-5 w-5 text-yellow-500" />
          )}
          <span className={`text-sm font-medium ${allDone ? 'text-green-700 dark:text-green-300' : 'text-yellow-700 dark:text-yellow-300'}`}>
            {allDone
              ? '모든 섹션 완료 — 확정 가능합니다.'
              : `${9 - doneCount}개 섹션 미완성 — STEP 4로 돌아가서 완성해주세요.`}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="ml-auto"
            onClick={loadPreview}
          >
            전체 미리보기
          </Button>
        </div>
      )}

      {/* preview modal */}
      {showPreview && previewContent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="flex max-h-[80vh] w-full max-w-3xl flex-col rounded-xl bg-white shadow-xl dark:bg-gray-900">
            <div className="flex items-center justify-between border-b p-4 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white">명세서 전체 미리보기</h3>
              <Button size="sm" variant="ghost" onClick={() => setShowPreview(false)}>닫기</Button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <pre className="whitespace-pre-wrap font-sans text-sm text-gray-800 dark:text-gray-200">
                {previewContent}
              </pre>
            </div>
          </div>
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
            섹션 수정
          </Button>
          <Button onClick={handleApprove} disabled={approving || !allDone}>
            {approving ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle className="mr-1.5 h-4 w-4" />
            )}
            본문 확정 및 도면 작성 →
          </Button>
        </div>
      </div>
    </div>
  )
}
