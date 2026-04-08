'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { Loader2, RefreshCw, CheckCircle2, Clock, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { PatentSectionType } from '@/types/database'

const SECTION_META: Record<PatentSectionType, { label: string; order: number; hint: string }> = {
  title: { label: '발명의 명칭', order: 0, hint: '발명을 대표하는 간결한 명칭' },
  tech_field: { label: '기술 분야', order: 1, hint: '발명이 속하는 기술 분야' },
  background: { label: '배경 기술', order: 2, hint: '기존 기술의 현황 및 문제점' },
  problem: { label: '해결 과제', order: 3, hint: '발명이 해결하고자 하는 과제' },
  solution: { label: '과제 해결 수단', order: 4, hint: '발명의 기술적 수단' },
  effect: { label: '발명의 효과', order: 5, hint: '발명으로 인한 기술적 효과' },
  drawing_desc: { label: '도면 간단 설명', order: 6, hint: '각 도면의 간단한 설명' },
  detailed_desc: { label: '발명의 상세한 설명', order: 7, hint: '구성요소 및 동작의 상세 설명' },
  abstract: { label: '요약서', order: 8, hint: '200자 이내 요약 (KIPO 규정)' },
}

const SECTION_TYPES = Object.keys(SECTION_META) as PatentSectionType[]

type SectionStatus = 'idle' | 'generating' | 'done' | 'error'

interface SectionState {
  content: string
  status: SectionStatus
  version: number
}

interface SectionEditorProps {
  projectId: string
}

export function SectionEditor({ projectId }: SectionEditorProps) {
  const [sections, setSections] = useState<Record<PatentSectionType, SectionState>>(
    () => Object.fromEntries(
      SECTION_TYPES.map((t) => [t, { content: '', status: 'idle' as SectionStatus, version: 0 }])
    ) as Record<PatentSectionType, SectionState>
  )
  const [selected, setSelected] = useState<PatentSectionType>('title')
  const [generatingAll, setGeneratingAll] = useState(false)
  const [allProgress, setAllProgress] = useState<{ done: number; total: number } | null>(null)
  const [saveTimer, setSaveTimer] = useState<ReturnType<typeof setTimeout> | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // 섹션 로드
  const loadSections = useCallback(async () => {
    const res = await fetch(`/api/patents/${projectId}/sections/all`).catch(() => null)
    if (res?.ok) {
      const json = await res.json().catch(() => null)
      const list: { section_type: PatentSectionType; content: string; version: number }[] = json?.data ?? []
      if (list.length > 0) {
        setSections((prev) => {
          const next = { ...prev }
          for (const s of list) {
            if (s.content) {
              next[s.section_type] = { content: s.content, status: 'done', version: s.version ?? 1 }
            }
          }
          return next
        })
        return
      }
    }
    // fallback — 병렬로 9개 개별 fetch
    const results = await Promise.all(
      SECTION_TYPES.map((t) =>
        fetch(`/api/patents/${projectId}/sections/${t}`).then((r) => r.json()).catch(() => null)
      )
    )
    setSections((prev) => {
      const next = { ...prev }
      SECTION_TYPES.forEach((t, i) => {
        const data = results[i]?.data
        if (data?.content) {
          next[t] = { content: data.content, status: 'done', version: data.version ?? 1 }
        }
      })
      return next
    })
  }, [projectId])

  useEffect(() => {
    loadSections()
  }, [loadSections])

  // textarea 높이 자동 조정
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }, [sections[selected]?.content])

  async function generateSection(type: PatentSectionType) {
    setSections((prev) => ({
      ...prev,
      [type]: { ...prev[type], status: 'generating' },
    }))

    try {
      const res = await fetch(`/api/patents/${projectId}/sections/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section_type: type }),
      })

      if (!res.ok || !res.body) {
        setSections((prev) => ({ ...prev, [type]: { ...prev[type], status: 'error' } }))
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
              if (eventType === 'text') {
                setSections((prev) => ({
                  ...prev,
                  [type]: { ...prev[type], content: prev[type].content + raw },
                }))
              } else if (eventType === 'result') {
                const parsed = JSON.parse(raw)
                setSections((prev) => ({
                  ...prev,
                  [type]: { content: parsed.content, status: 'done', version: 1 },
                }))
              } else if (eventType === 'error') {
                setSections((prev) => ({ ...prev, [type]: { ...prev[type], status: 'error' } }))
              }
              eventType = null
            } catch { /* ignore */ }
          }
        }
      }
    } catch {
      setSections((prev) => ({ ...prev, [type]: { ...prev[type], status: 'error' } }))
    }
  }

  async function generateAll() {
    setGeneratingAll(true)
    setAllProgress({ done: 0, total: 9 })
    // 모든 섹션을 generating 상태로 전환
    setSections((prev) => {
      const next = { ...prev }
      for (const t of SECTION_TYPES) {
        next[t] = { ...prev[t], status: 'generating' }
      }
      return next
    })

    try {
      const res = await fetch(`/api/patents/${projectId}/sections/generate-all`, {
        method: 'POST',
      })

      if (!res.ok || !res.body) {
        setSections((prev) => {
          const next = { ...prev }
          for (const t of SECTION_TYPES) {
            next[t] = { ...prev[t], status: 'error' }
          }
          return next
        })
        setGeneratingAll(false)
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
              if (eventType === 'section_done') {
                const { section_type, content, error, done, total } = JSON.parse(raw)
                setSections((prev) => ({
                  ...prev,
                  [section_type]: {
                    content: content ?? '',
                    status: error ? 'error' : 'done',
                    version: 1,
                  },
                }))
                if (done !== undefined && total !== undefined) {
                  setAllProgress({ done, total })
                }
              }
              eventType = null
            } catch { /* ignore */ }
          }
        }
      }
    } catch {
      setSections((prev) => {
        const next = { ...prev }
        for (const t of SECTION_TYPES) {
          if (next[t].status === 'generating') next[t] = { ...next[t], status: 'error' }
        }
        return next
      })
    }

    setGeneratingAll(false)
    setAllProgress(null)
  }

  function handleContentChange(type: PatentSectionType, value: string) {
    setSections((prev) => ({ ...prev, [type]: { ...prev[type], content: value } }))
    if (saveTimer) clearTimeout(saveTimer)
    const timer = setTimeout(() => saveSection(type, value), 1200)
    setSaveTimer(timer)
  }

  async function saveSection(type: PatentSectionType, content: string) {
    await fetch(`/api/patents/${projectId}/sections/${type}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    })
  }

  const doneCount = SECTION_TYPES.filter((t) => sections[t].status === 'done' || sections[t].content).length

  return (
    <div className="flex h-full gap-0">
      {/* left nav */}
      <div className="w-52 flex-shrink-0 space-y-0.5 border-r border-gray-200 pr-3 dark:border-gray-700">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-medium text-gray-500">{doneCount}/9 완료</span>
          <Button
            size="sm"
            variant="default"
            className="h-7 text-xs"
            onClick={generateAll}
            disabled={generatingAll}
          >
            {generatingAll ? (
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            ) : (
              <Sparkles className="mr-1 h-3 w-3" />
            )}
            {generatingAll && allProgress ? `${allProgress.done}/${allProgress.total}` : '전체 생성'}
          </Button>
        </div>
        {generatingAll && allProgress && (
          <div className="mb-2">
            <div className="h-1 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
              <div
                className="h-full rounded-full bg-blue-500 transition-all duration-500"
                style={{ width: `${(allProgress.done / allProgress.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        {SECTION_TYPES.map((type) => {
          const meta = SECTION_META[type]
          const state = sections[type]
          const isActive = selected === type

          return (
            <button
              key={type}
              onClick={() => setSelected(type)}
              className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <span className="flex-1 truncate text-sm">{meta.label}</span>
              {state.status === 'generating' && (
                <Loader2 className="h-3.5 w-3.5 flex-shrink-0 animate-spin text-blue-500" />
              )}
              {(state.status === 'done' || state.content) && state.status !== 'generating' && (
                <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0 text-green-500" />
              )}
              {state.status === 'idle' && !state.content && (
                <Clock className="h-3.5 w-3.5 flex-shrink-0 text-gray-300 dark:text-gray-600" />
              )}
              {state.status === 'error' && (
                <span className="h-3.5 w-3.5 flex-shrink-0 text-red-500 text-xs">!</span>
              )}
            </button>
          )
        })}
      </div>

      {/* right editor */}
      <div className="flex min-h-0 flex-1 flex-col pl-4">
        <div className="mb-3 flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {SECTION_META[selected].label}
            </h3>
            <p className="mt-0.5 text-xs text-gray-500">{SECTION_META[selected].hint}</p>
          </div>
          <div className="flex items-center gap-2">
            {sections[selected].version > 0 && (
              <Badge variant="secondary" className="text-xs">v{sections[selected].version}</Badge>
            )}
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => {
                setSections((prev) => ({ ...prev, [selected]: { ...prev[selected], content: '' } }))
                generateSection(selected)
              }}
              disabled={sections[selected].status === 'generating' || generatingAll}
            >
              {sections[selected].status === 'generating' ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="mr-1 h-3 w-3" />
              )}
              재생성
            </Button>
          </div>
        </div>

        {sections[selected].status === 'generating' && !sections[selected].content && (
          <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed dark:border-gray-700">
            <div className="text-center">
              <Loader2 className="mx-auto h-6 w-6 animate-spin text-blue-400" />
              <p className="mt-2 text-sm text-gray-400">
                AI가 {SECTION_META[selected].label}을(를) 작성 중입니다...
              </p>
              {selected === 'detailed_desc' && (
                <p className="mt-1 text-xs text-gray-300 dark:text-gray-600">
                  상세한 설명은 생성에 1~2분 소요될 수 있습니다
                </p>
              )}
            </div>
          </div>
        )}

        {(sections[selected].content || sections[selected].status !== 'generating') && (
          <textarea
            ref={textareaRef}
            value={sections[selected].content}
            onChange={(e) => handleContentChange(selected, e.target.value)}
            placeholder={`${SECTION_META[selected].label} 내용을 입력하거나 AI 재생성 버튼을 눌러주세요.`}
            className="min-h-[300px] w-full flex-1 resize-none rounded-lg border border-gray-200 bg-white p-3 text-sm leading-relaxed text-gray-900 outline-none transition-colors focus:border-blue-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:focus:border-blue-500"
          />
        )}

        {sections[selected].status === 'generating' && sections[selected].content && (
          <p className="mt-1 text-xs text-blue-400 dark:text-blue-500">
            생성 중... {sections[selected].content.length.toLocaleString()}자
          </p>
        )}
        {selected === 'abstract' && sections[selected].content && sections[selected].status !== 'generating' && (
          <p className={`mt-1 text-xs ${sections[selected].content.length > 200 ? 'text-red-500' : 'text-gray-400'}`}>
            {sections[selected].content.length}자 {sections[selected].content.length > 200 ? '(200자 초과 — KIPO 규정 위반)' : '/ 200자 이내 권장'}
          </p>
        )}
      </div>
    </div>
  )
}
