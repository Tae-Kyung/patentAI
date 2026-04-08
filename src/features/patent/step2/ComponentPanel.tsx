'use client'

import { useState, useCallback, useEffect } from 'react'
import { Loader2, RefreshCw, Plus, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { ComponentTree } from './ComponentTree'
import { DrawingPlan, type DrawingPlanItem } from './DrawingPlan'
import type { PatentComponent, PatentDrawingType } from '@/types/database'

type ComponentNode = PatentComponent & { children: ComponentNode[] }

const DRAWING_TYPE_LABELS: Record<PatentDrawingType, string> = {
  system_architecture: '시스템 구조도',
  flowchart: '흐름도',
  ui_wireframe: 'UI 와이어프레임',
  data_flow: '데이터 흐름도',
  other: '기타',
}

interface AddComponentForm {
  ref_number: string
  name: string
  description: string
  parent_id: string | null
}

interface ComponentPanelProps {
  projectId: string
}

export function ComponentPanel({ projectId }: ComponentPanelProps) {
  const [nodes, setNodes] = useState<ComponentNode[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [genProgress, setGenProgress] = useState('')
  const [genPhase, setGenPhase] = useState<'idle' | 'streaming' | 'saving' | 'done'>('idle')
  const [error, setError] = useState<string | null>(null)

  // drawing plan state (stored locally until Gate 2)
  const [drawings, setDrawings] = useState<DrawingPlanItem[]>([])

  // add component dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogParentId, setDialogParentId] = useState<string | null>(null)
  const [addForm, setAddForm] = useState<AddComponentForm>({
    ref_number: '',
    name: '',
    description: '',
    parent_id: null,
  })
  const [addError, setAddError] = useState<string | null>(null)
  const [addLoading, setAddLoading] = useState(false)

  const loadComponents = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/patents/${projectId}/components`)
      if (res.ok) {
        const json = await res.json()
        setNodes(json.data ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    loadComponents()
  }, [loadComponents])

  async function handleGenerate() {
    if (!confirm('AI로 구성요소를 자동 생성하시겠습니까?\n기존 구성요소는 모두 삭제됩니다.')) return
    setGenerating(true)
    setGenProgress('')
    setGenPhase('streaming')
    setError(null)

    try {
      const res = await fetch(`/api/patents/${projectId}/components/generate`, { method: 'POST' })
      if (!res.ok || !res.body) {
        const json = await res.json().catch(() => ({}))
        setError(json.error ?? '생성 요청 실패')
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
              if (eventType === 'text') setGenProgress((p) => p + raw)
              if (eventType === 'result') {
                setGenPhase('saving')
                try {
                  const parsed = JSON.parse(raw)
                  if (Array.isArray(parsed.drawings)) {
                    setDrawings(
                      parsed.drawings.map(
                        (d: { figure_number: number; title: string; description?: string; drawing_type?: PatentDrawingType }, i: number) => ({
                          figure_number: d.figure_number ?? i + 1,
                          title: d.title ?? '',
                          description: d.description ?? '',
                          drawing_type: (d.drawing_type as PatentDrawingType) ?? 'other',
                        }),
                      ),
                    )
                  }
                } catch {
                  // no drawings in result
                }
              }
              if (eventType === 'error') setError(raw)
              if (eventType === 'done') {
                setGenPhase('done')
                await loadComponents()
              }
            } catch {
              // ignore parse error
            }
            eventType = null
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류')
    } finally {
      setGenerating(false)
      setGenProgress('')
      setGenPhase('idle')
    }
  }

  function openAddDialog(parentId: string | null) {
    setDialogParentId(parentId)
    setAddForm({ ref_number: '', name: '', description: '', parent_id: parentId })
    setAddError(null)
    setDialogOpen(true)
  }

  async function handleAdd() {
    if (!addForm.ref_number.trim() || !addForm.name.trim()) {
      setAddError('참조번호와 이름은 필수입니다.')
      return
    }
    setAddLoading(true)
    setAddError(null)
    try {
      const res = await fetch(`/api/patents/${projectId}/components`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ref_number: addForm.ref_number.trim(),
          name: addForm.name.trim(),
          description: addForm.description.trim() || undefined,
          parent_id: addForm.parent_id,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setAddError(json.error ?? '추가 실패')
        return
      }
      setDialogOpen(false)
      await loadComponents()
    } finally {
      setAddLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">구성요소 트리</h3>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            발명의 구성요소와 참조번호를 정의합니다.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => openAddDialog(null)}
            disabled={generating}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            직접 추가
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleGenerate}
            disabled={generating}
          >
            {generating ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
            )}
            AI 자동 생성
          </Button>
        </div>
      </div>

      {/* generate progress */}
      {generating && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20 p-4 space-y-3">
          {/* 단계 표시 */}
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-800">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-300" />
            </div>
            <div>
              <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">
                {genPhase === 'saving' ? '구성요소 저장 중...' : 'AI 구성요소 생성 중...'}
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400">
                {genPhase === 'saving'
                  ? '생성된 구성요소를 데이터베이스에 저장하고 있습니다.'
                  : genProgress
                  ? `분석 결과를 바탕으로 구성요소 트리를 작성하고 있습니다. (${genProgress.length.toLocaleString()}자 생성됨)`
                  : '요청을 처리하고 있습니다...'}
              </p>
            </div>
          </div>

          {/* 스텝 인디케이터 */}
          <div className="flex items-center gap-2 pl-11">
            {[
              { phase: 'streaming', label: 'AI 생성' },
              { phase: 'saving', label: 'DB 저장' },
            ].map((step, i) => {
              const isActive = genPhase === step.phase
              const isDone = genPhase === 'saving' && step.phase === 'streaming'
              return (
                <div key={step.phase} className="flex items-center gap-2">
                  {i > 0 && <div className={`h-px w-6 ${isDone || isActive ? 'bg-blue-400' : 'bg-blue-200 dark:bg-blue-700'}`} />}
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : isDone
                      ? 'bg-blue-200 text-blue-700 dark:bg-blue-700 dark:text-blue-200'
                      : 'bg-blue-100 text-blue-400 dark:bg-blue-900 dark:text-blue-500'
                  }`}>
                    {step.label}
                  </span>
                </div>
              )
            })}
          </div>

          {/* 스트리밍 텍스트 미리보기 */}
          {genProgress && genPhase === 'streaming' && (
            <div className="pl-11">
              <div className="max-h-20 overflow-hidden rounded border border-blue-200 dark:border-blue-700 bg-white/70 dark:bg-gray-900/50 px-2.5 py-1.5">
                <p className="font-mono text-xs text-gray-500 dark:text-gray-400 line-clamp-3">
                  {genProgress.slice(-400)}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* error */}
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}

      {/* tree */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : (
        <ComponentTree
          projectId={projectId}
          nodes={nodes}
          onAdd={openAddDialog}
          onUpdated={loadComponents}
          onDeleted={loadComponents}
        />
      )}

      {/* drawing plan section */}
      <div className="space-y-3 border-t border-gray-200 pt-4 dark:border-gray-700">
        <div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">도면 계획</h3>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            특허 도면 구성을 미리 계획합니다. (STEP 5에서 실제 생성)
          </p>
        </div>
        <DrawingPlan items={drawings} onChange={setDrawings} />
      </div>

      {/* add component dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>구성요소 추가</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs">참조번호 *</Label>
              <Input
                value={addForm.ref_number}
                onChange={(e) => setAddForm((f) => ({ ...f, ref_number: e.target.value }))}
                placeholder="예: 100, 110, A1"
                className="h-8 text-sm"
                maxLength={10}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">이름 *</Label>
              <Input
                value={addForm.name}
                onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="구성요소 이름"
                className="h-8 text-sm"
                maxLength={200}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">설명 (선택)</Label>
              <Input
                value={addForm.description}
                onChange={(e) => setAddForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="간단한 설명"
                className="h-8 text-sm"
              />
            </div>
            {addError && (
              <p className="text-xs text-red-600 dark:text-red-400">{addError}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>
              취소
            </Button>
            <Button size="sm" onClick={handleAdd} disabled={addLoading}>
              {addLoading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              추가
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
