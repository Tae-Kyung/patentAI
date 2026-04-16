'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { Loader2, RefreshCw, Upload, ZoomIn, Trash2, Plus, Sparkles, FileText, ImagePlus, Wand2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { PatentDrawing, PatentDrawingType } from '@/types/database'

interface ExternalAnalysis {
  description: string
  components: { ref_number: string; name: string; description: string }[]
  drawing_flow: string
  drawing_desc_line: string
}

interface ExternalUploadForm {
  drawing_number: number
  drawing_type: PatentDrawingType
  caption: string
  file: File | null
}

const DRAWING_TYPE_LABELS: Record<PatentDrawingType, string> = {
  system_architecture: '시스템 구조도',
  flowchart: '흐름도',
  ui_wireframe: 'UI 와이어프레임',
  data_flow: '데이터 흐름도',
  other: '기타',
}

interface AddDrawingForm {
  drawing_number: number
  drawing_type: PatentDrawingType
  caption: string
  custom_prompt: string
}

interface DrawingViewerProps {
  projectId: string
}

export function DrawingViewer({ projectId }: DrawingViewerProps) {
  const [drawings, setDrawings] = useState<PatentDrawing[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState<number | null>(null)
  const [preview, setPreview] = useState<PatentDrawing | null>(null)
  const [addForm, setAddForm] = useState<AddDrawingForm>({
    drawing_number: 1,
    drawing_type: 'system_architecture',
    caption: '',
    custom_prompt: '',
  })
  const [showAddForm, setShowAddForm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [replacingId, setReplacingId] = useState<string | undefined>(undefined)
  const [autoGenerating, setAutoGenerating] = useState(false)
  const [autoProgress, setAutoProgress] = useState<{ done: number; total: number; caption: string } | null>(null)
  const [targetCount, setTargetCount] = useState(3)
  const [brokenImages, setBrokenImages] = useState<Set<string>>(new Set())
  const [syncingDesc, setSyncingDesc] = useState(false)
  const [descSynced, setDescSynced] = useState(false)
  // 외부 도면 업로드
  const externalFileRef = useRef<HTMLInputElement>(null)
  const [showExternalForm, setShowExternalForm] = useState(false)
  const [externalForm, setExternalForm] = useState<ExternalUploadForm>({
    drawing_number: 1,
    drawing_type: 'other',
    caption: '',
    file: null,
  })
  const [uploadingExternal, setUploadingExternal] = useState(false)
  const [externalAnalysis, setExternalAnalysis] = useState<{ drawingId: string; analysis: ExternalAnalysis } | null>(null)
  const [simplifyingId, setSimplifyingId] = useState<string | null>(null)

  const loadDrawings = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const res = await fetch(`/api/patents/${projectId}/drawings`)
      if (res.ok) {
        const json = await res.json()
        setDrawings(json.data ?? [])
        const maxNum = Math.max(0, ...(json.data ?? []).map((d: PatentDrawing) => d.drawing_number))
        setAddForm((f) => ({ ...f, drawing_number: maxNum + 1 }))
      }
    } finally {
      if (!silent) setLoading(false)
    }
  }, [projectId])

  useEffect(() => { loadDrawings() }, [loadDrawings])

  async function handleExternalUpload() {
    if (!externalForm.file || !externalForm.caption.trim()) return
    setUploadingExternal(true)
    setError(null)
    setExternalAnalysis(null)
    try {
      const formData = new FormData()
      formData.append('image', externalForm.file)
      formData.append('drawing_number', String(externalForm.drawing_number))
      formData.append('drawing_type', externalForm.drawing_type)
      formData.append('caption', externalForm.caption.trim())

      const res = await fetch(`/api/patents/${projectId}/drawings/external`, {
        method: 'POST',
        body: formData,
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? '업로드 실패'); return }

      await loadDrawings(true)
      setShowExternalForm(false)

      if (json.data?.analysis && json.data?.drawing) {
        setExternalAnalysis({ drawingId: json.data.drawing.id, analysis: json.data.analysis })
      }
    } catch {
      setError('외부 도면 업로드 중 오류가 발생했습니다.')
    } finally {
      setUploadingExternal(false)
    }
  }

  async function handleSimplify(drawingId: string) {
    setSimplifyingId(drawingId)
    setError(null)
    try {
      const res = await fetch(`/api/patents/${projectId}/drawings/${drawingId}/simplify`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? '변환 실패'); return }
      await loadDrawings(true)
      setExternalAnalysis(null)
    } catch {
      setError('특허 도면 변환 중 오류가 발생했습니다.')
    } finally {
      setSimplifyingId(null)
    }
  }

  // 도면 생성 후 drawing_desc 섹션 자동 재생성
  const regenerateDrawingDesc = useCallback(async () => {
    setSyncingDesc(true)
    setDescSynced(false)
    try {
      const res = await fetch(`/api/patents/${projectId}/sections/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section_type: 'drawing_desc' }),
      })
      if (!res.ok || !res.body) return
      // SSE 스트림 소비 — done 이벤트까지 읽기
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        if (buffer.includes('event: done') || buffer.includes('event: error')) break
      }
      setDescSynced(true)
    } catch {
      // 재생성 실패는 무시 (사용자가 수동으로 재시도 가능)
    } finally {
      setSyncingDesc(false)
    }
  }, [projectId])

  async function handleAutoGenerate() {
    setAutoGenerating(true)
    setAutoProgress({ done: 0, total: 0, caption: '도면 계획 수립 중...' })
    setError(null)
    setDescSynced(false)
    try {
      const res = await fetch(`/api/patents/${projectId}/drawings/auto-generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_count: targetCount }),
      })
      if (!res.ok || !res.body) {
        const json = await res.json().catch(() => ({}))
        setError(json.error ?? 'AI 자동 생성 실패')
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let eventType: string | null = null

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            eventType = line.slice(7).trim()
          } else if (line.startsWith('data: ')) {
            try {
              const raw = JSON.parse(line.slice(6))
              if (eventType === 'plan_done') {
                const { count } = JSON.parse(raw)
                setAutoProgress({ done: 0, total: count, caption: '도면 생성 중...' })
              } else if (eventType === 'drawing_start') {
                const { index, total, caption } = JSON.parse(raw)
                setAutoProgress({ done: index, total, caption: `FIG.${index + 1} ${caption} 생성 중...` })
              } else if (eventType === 'drawing_done') {
                const { index, total } = JSON.parse(raw)
                setAutoProgress((p) => p ? { ...p, done: index + 1, total } : null)
                await loadDrawings(true) // 도면 하나 완료될 때마다 즉시 표시
              } else if (eventType === 'drawing_error') {
                const { caption, error: err } = JSON.parse(raw)
                console.warn('Drawing error:', caption, err)
                setError(`FIG 생성 실패 (${caption}): ${err}`)
              } else if (eventType === 'error') {
                setError(raw)
              } else if (eventType === 'done') {
                await loadDrawings()
                regenerateDrawingDesc() // 도면 완료 후 drawing_desc 자동 재생성 (fire-and-forget)
              }
              eventType = null
            } catch { /* ignore */ }
          }
        }
      }
    } catch {
      setError('AI 자동 생성 중 오류가 발생했습니다.')
    } finally {
      setAutoGenerating(false)
      setAutoProgress(null)
    }
  }

  async function handleGenerate(form: AddDrawingForm) {
    setGenerating(form.drawing_number)
    setError(null)
    try {
      const res = await fetch(`/api/patents/${projectId}/drawings/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          drawing_number: form.drawing_number,
          drawing_type: form.drawing_type,
          caption: form.caption,
          custom_prompt: form.custom_prompt || undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? '생성 실패'); return }
      setShowAddForm(false)
      await loadDrawings()
    } finally {
      setGenerating(null)
    }
  }

  async function handleRegenerate(drawing: PatentDrawing) {
    setGenerating(drawing.drawing_number)
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
      setGenerating(null)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('이 도면을 삭제하시겠습니까?')) return
    await fetch(`/api/patents/${projectId}/drawings/${id}`, { method: 'DELETE' })
    await loadDrawings()
  }

  async function handleReplaceImage(drawingId: string, file: File) {
    setReplacingId(drawingId)
    try {
      const formData = new FormData()
      formData.append('image', file)
      await fetch(`/api/patents/${projectId}/drawings/${drawingId}`, {
        method: 'PATCH',
        body: formData,
      })
      await loadDrawings()
    } finally {
      setReplacingId(undefined)
    }
  }

  return (
    <div className="space-y-4">
      {/* 헤더 — 제목 + 버튼 두 줄 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">특허 도면</h3>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              Gemini AI로 도면을 생성하거나 직접 업로드합니다.
            </p>
          </div>
          {/* 보조 버튼 */}
          <Button
            size="sm"
            variant="outline"
            onClick={regenerateDrawingDesc}
            disabled={syncingDesc || autoGenerating || drawings.length === 0}
            title="도면의 간단한 설명 섹션을 현재 도면 목록으로 재생성합니다"
          >
            {syncingDesc ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <FileText className="mr-1.5 h-3.5 w-3.5" />
            )}
            {descSynced ? '설명 동기화됨' : '도면 설명 재생성'}
          </Button>
        </div>

        {/* 주요 액션 버튼 행 */}
        <div className="flex flex-wrap items-center gap-2">
          {/* AI 자동 생성 + 도면 수 */}
          <div className="flex items-center gap-1.5 rounded-md border border-gray-200 bg-gray-50 px-2 py-1 dark:border-gray-700 dark:bg-gray-800/50">
            <span className="text-xs text-gray-500">도면 수</span>
            <Input
              type="number"
              min={1}
              max={10}
              value={targetCount}
              onChange={(e) => setTargetCount(Math.min(10, Math.max(1, parseInt(e.target.value) || 3)))}
              disabled={autoGenerating}
              className="h-7 w-12 text-center text-sm border-0 bg-transparent p-0 focus-visible:ring-0"
            />
            <span className="text-xs text-gray-500">개</span>
            <Button
              size="sm"
              variant="default"
              className="h-7 px-2.5 text-xs"
              onClick={handleAutoGenerate}
              disabled={autoGenerating || generating !== null}
            >
              {autoGenerating ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <Sparkles className="mr-1 h-3 w-3" />
              )}
              AI 자동 생성
            </Button>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setExternalForm((f) => ({
                ...f,
                drawing_number: drawings.length > 0 ? Math.max(...drawings.map(d => d.drawing_number)) + 1 : 1,
                file: null,
                caption: '',
              }))
              setShowExternalForm(true)
            }}
            disabled={autoGenerating}
          >
            <ImagePlus className="mr-1.5 h-3.5 w-3.5" />
            외부 도면 업로드
          </Button>

          <Button size="sm" variant="outline" onClick={() => setShowAddForm(true)} disabled={autoGenerating}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            도면 추가
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}

      {/* drawing_desc 재생성 상태 */}
      {syncingDesc && (
        <div className="flex items-center gap-2 rounded-md border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/20 dark:text-indigo-300">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          도면의 간단한 설명 섹션을 재생성하는 중...
        </div>
      )}
      {descSynced && !syncingDesc && (
        <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 dark:border-green-800 dark:bg-green-950/20 dark:text-green-300">
          <FileText className="h-3.5 w-3.5" />
          도면의 간단한 설명이 최신 도면 목록으로 업데이트되었습니다.
        </div>
      )}

      {/* auto-generate progress */}
      {autoGenerating && autoProgress && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 space-y-2 dark:border-blue-900 dark:bg-blue-950/20">
          <div className="flex items-center gap-2 text-sm text-blue-800 dark:text-blue-200">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>{autoProgress.caption}</span>
          </div>
          {autoProgress.total > 0 && (
            <>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-blue-100 dark:bg-blue-900">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all duration-500"
                  style={{ width: `${(autoProgress.done / autoProgress.total) * 100}%` }}
                />
              </div>
              <p className="text-xs text-blue-600 dark:text-blue-400">
                {autoProgress.done}/{autoProgress.total} 완료
              </p>
            </>
          )}
        </div>
      )}

      {/* 외부 도면 업로드 폼 */}
      {showExternalForm && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 space-y-3 dark:border-emerald-900 dark:bg-emerald-950/20">
          <h4 className="text-sm font-medium text-emerald-900 dark:text-emerald-200">외부 도면 업로드</h4>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-xs text-gray-500">도면 번호</label>
              <Input
                type="number"
                min={1}
                value={externalForm.drawing_number}
                onChange={(e) => setExternalForm((f) => ({ ...f, drawing_number: parseInt(e.target.value) || 1 }))}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-500">도면 유형</label>
              <Select
                value={externalForm.drawing_type}
                onValueChange={(v) => setExternalForm((f) => ({ ...f, drawing_type: v as PatentDrawingType }))}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(DRAWING_TYPE_LABELS) as PatentDrawingType[]).map((t) => (
                    <SelectItem key={t} value={t} className="text-xs">{DRAWING_TYPE_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-500">캡션 *</label>
            <Input
              value={externalForm.caption}
              onChange={(e) => setExternalForm((f) => ({ ...f, caption: e.target.value }))}
              placeholder="예: 시스템 전체 구성도"
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-500">이미지 파일 * (PNG, JPG, WebP, SVG, PDF · 최대 10MB)</label>
            <div className="flex items-center gap-2">
              <input
                ref={externalFileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml,application/pdf"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null
                  setExternalForm((prev) => ({ ...prev, file: f }))
                  e.target.value = ''
                }}
              />
              <Button size="sm" variant="outline" type="button" onClick={() => externalFileRef.current?.click()}>
                <Upload className="mr-1.5 h-3.5 w-3.5" />
                파일 선택
              </Button>
              {externalForm.file && (
                <span className="truncate text-xs text-gray-600 dark:text-gray-400">{externalForm.file.name}</span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleExternalUpload}
              disabled={!externalForm.caption.trim() || !externalForm.file || uploadingExternal}
            >
              {uploadingExternal ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Upload className="mr-1.5 h-3.5 w-3.5" />
              )}
              {uploadingExternal ? 'AI 분석 중...' : '업로드 및 분석'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowExternalForm(false)}>취소</Button>
          </div>
        </div>
      )}

      {/* AI 분석 결과 패널 */}
      {externalAnalysis && (
        <div className="rounded-lg border border-violet-200 bg-violet-50 p-4 space-y-3 dark:border-violet-900 dark:bg-violet-950/20">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-violet-900 dark:text-violet-200">AI 도면 분석 결과</h4>
            <button
              className="text-xs text-gray-400 hover:text-gray-600"
              onClick={() => setExternalAnalysis(null)}
            >
              닫기
            </button>
          </div>
          <div className="space-y-2 text-xs text-gray-700 dark:text-gray-300">
            <div>
              <span className="font-medium text-violet-700 dark:text-violet-300">도면 설명</span>
              <p className="mt-0.5">{externalAnalysis.analysis.description}</p>
            </div>
            {externalAnalysis.analysis.components.length > 0 && (
              <div>
                <span className="font-medium text-violet-700 dark:text-violet-300">추출된 구성요소</span>
                <ul className="mt-0.5 space-y-0.5">
                  {externalAnalysis.analysis.components.map((c, i) => (
                    <li key={i}>{c.ref_number}. {c.name} — {c.description}</li>
                  ))}
                </ul>
              </div>
            )}
            <div>
              <span className="font-medium text-violet-700 dark:text-violet-300">S7 섹션 문구 제안</span>
              <p className="mt-0.5 italic">{externalAnalysis.analysis.drawing_desc_line}</p>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              variant="outline"
              className="border-violet-300 text-violet-800 hover:bg-violet-100 dark:border-violet-700 dark:text-violet-300"
              onClick={() => handleSimplify(externalAnalysis.drawingId)}
              disabled={simplifyingId === externalAnalysis.drawingId}
            >
              {simplifyingId === externalAnalysis.drawingId ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Wand2 className="mr-1.5 h-3.5 w-3.5" />
              )}
              {simplifyingId === externalAnalysis.drawingId ? '변환 중...' : '특허 도면으로 변환'}
            </Button>
          </div>
        </div>
      )}

      {/* add form */}
      {showAddForm && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 space-y-3 dark:border-blue-900 dark:bg-blue-950/20">
          <h4 className="text-sm font-medium text-blue-900 dark:text-blue-200">새 도면 생성</h4>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-xs text-gray-500">도면 번호</label>
              <Input
                type="number"
                min={1}
                value={addForm.drawing_number}
                onChange={(e) => setAddForm((f) => ({ ...f, drawing_number: parseInt(e.target.value) || 1 }))}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-gray-500">도면 유형</label>
              <Select
                value={addForm.drawing_type}
                onValueChange={(v) => setAddForm((f) => ({ ...f, drawing_type: v as PatentDrawingType }))}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(DRAWING_TYPE_LABELS) as PatentDrawingType[]).map((t) => (
                    <SelectItem key={t} value={t} className="text-xs">{DRAWING_TYPE_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-500">캡션 *</label>
            <Input
              value={addForm.caption}
              onChange={(e) => setAddForm((f) => ({ ...f, caption: e.target.value }))}
              placeholder="예: 시스템 전체 구성도"
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-gray-500">커스텀 프롬프트 (선택)</label>
            <Input
              value={addForm.custom_prompt}
              onChange={(e) => setAddForm((f) => ({ ...f, custom_prompt: e.target.value }))}
              placeholder="비워두면 자동 생성"
              className="h-8 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => handleGenerate(addForm)}
              disabled={!addForm.caption || generating !== null}
            >
              {generating === addForm.drawing_number ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : null}
              AI 생성
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowAddForm(false)}>취소</Button>
          </div>
        </div>
      )}

      {/* drawings grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : drawings.length === 0 ? (
        <div className="rounded-lg border border-dashed py-16 text-center dark:border-gray-700">
          <p className="text-sm text-gray-400">도면이 없습니다. 도면 추가 버튼을 눌러주세요.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {drawings.map((drawing) => (
            <div
              key={drawing.id}
              className="group relative overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900"
            >
              {/* image */}
              <div className="relative aspect-[4/3] bg-gray-100 dark:bg-gray-800">
                {generating === drawing.drawing_number ? (
                  <div className="flex h-full items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                  </div>
                ) : drawing.image_url && !brokenImages.has(drawing.id) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={drawing.image_url}
                    alt={drawing.caption ?? ''}
                    className="h-full w-full object-contain"
                    onError={() => setBrokenImages((prev) => new Set(prev).add(drawing.id))}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-gray-300 dark:text-gray-600">
                    <span className="text-4xl font-bold">FIG.{drawing.drawing_number}</span>
                  </div>
                )}

                {/* hover overlay */}
                <div className="absolute inset-0 flex items-center justify-center gap-1 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                  {drawing.image_url && (
                    <button
                      className="rounded-full bg-white/90 p-1.5"
                      onClick={() => setPreview(drawing)}
                    >
                      <ZoomIn className="h-4 w-4 text-gray-800" />
                    </button>
                  )}
                  <button
                    className="rounded-full bg-white/90 p-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() => generating !== drawing.drawing_number && handleRegenerate(drawing)}
                    disabled={generating === drawing.drawing_number || autoGenerating}
                    title="도면 재생성"
                  >
                    {generating === drawing.drawing_number ? (
                      <Loader2 className="h-4 w-4 animate-spin text-gray-800" />
                    ) : (
                      <RefreshCw className="h-4 w-4 text-gray-800" />
                    )}
                  </button>
                  <button
                    className="rounded-full bg-white/90 p-1.5"
                    onClick={() => {
                      setReplacingId(drawing.id ?? undefined)
                      fileInputRef.current?.click()
                    }}
                  >
                    {replacingId === drawing.id ? (
                      <Loader2 className="h-4 w-4 animate-spin text-gray-800" />
                    ) : (
                      <Upload className="h-4 w-4 text-gray-800" />
                    )}
                  </button>
                  <button
                    className="rounded-full bg-red-500/90 p-1.5"
                    onClick={() => handleDelete(drawing.id)}
                  >
                    <Trash2 className="h-4 w-4 text-white" />
                  </button>
                </div>
              </div>

              {/* caption */}
              <div className="p-2">
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="font-mono text-xs font-bold text-gray-500">FIG.{drawing.drawing_number}</span>
                  <Badge variant="secondary" className="text-xs px-1 py-0">
                    {DRAWING_TYPE_LABELS[drawing.drawing_type]}
                  </Badge>
                  {(drawing.prompt_used === 'external' || drawing.prompt_used === 'external_simplified') && (
                    <Badge variant="outline" className="text-xs px-1 py-0 border-emerald-400 text-emerald-700 dark:text-emerald-400">
                      {drawing.prompt_used === 'external_simplified' ? '변환됨' : '외부'}
                    </Badge>
                  )}
                  {generating === drawing.drawing_number && (
                    <span className="flex items-center gap-0.5 text-xs text-blue-500">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      재생성 중
                    </span>
                  )}
                </div>
                <p className="mt-0.5 truncate text-xs text-gray-700 dark:text-gray-300">{drawing.caption}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* hidden file input for image replacement */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file && replacingId) handleReplaceImage(replacingId, file)
          e.target.value = ''
        }}
      />

      {/* preview dialog */}
      <Dialog open={!!preview} onOpenChange={() => setPreview(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              FIG.{preview?.drawing_number} — {preview?.caption}
            </DialogTitle>
          </DialogHeader>
          {preview?.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview.image_url}
              alt={preview.caption ?? ''}
              className="w-full rounded-lg object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
