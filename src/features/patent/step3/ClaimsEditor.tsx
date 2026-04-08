'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Loader2, Sparkles, Plus, Trash2, AlertCircle, BarChart2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { PatentClaim } from '@/types/database'

// 금지 표현 하이라이트 패턴
const HIGHLIGHT_PATTERNS = [
  /최선|최고|최적|최상/g,
  /약\s+\d|대략|거의/g,
  /다수의|여러|복수\s*개의/g,
  /필요에\s*따라|경우에\s*따라/g,
]

function StrengthDots({ score }: { score: number | null }) {
  if (score === null) return null
  return (
    <span className="font-mono text-xs" title={`강도 점수: ${score}/5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < score ? 'text-blue-500' : 'text-gray-300 dark:text-gray-600'}>
          ●
        </span>
      ))}
    </span>
  )
}

function hasHighlights(content: string): boolean {
  return HIGHLIGHT_PATTERNS.some((p) => { p.lastIndex = 0; return p.test(content) })
}

interface AutoResizeTextareaProps {
  value: string
  onChange: (v: string) => void
  onBlur: () => void
  hasIssue: boolean
}

function AutoResizeTextarea({ value, onChange, onBlur, hasIssue }: AutoResizeTextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = 'auto'
      ref.current.style.height = ref.current.scrollHeight + 'px'
    }
  }, [value])

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      className={`w-full resize-none overflow-hidden rounded border bg-transparent p-1 text-sm leading-relaxed outline-none transition-colors focus:border-blue-400 dark:focus:border-blue-500 ${
        hasIssue
          ? 'border-red-300 dark:border-red-700'
          : 'border-transparent hover:border-gray-300 dark:hover:border-gray-600'
      }`}
      rows={2}
    />
  )
}

interface ClaimsEditorProps {
  projectId: string
  initialClaims?: PatentClaim[]
  onClaimsChanged?: (claims: PatentClaim[]) => void
}

export function ClaimsEditor({ projectId, initialClaims = [], onClaimsChanged }: ClaimsEditorProps) {
  const [claims, setClaims] = useState<PatentClaim[]>(initialClaims)
  const [generating, setGenerating] = useState(false)
  const [genProgress, setGenProgress] = useState('')
  const [genPhase, setGenPhase] = useState<'idle' | 'streaming' | 'saving' | 'done'>('idle')
  const [genType, setGenType] = useState<'apparatus' | 'method' | 'system'>('apparatus')
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editContents, setEditContents] = useState<Record<string, string>>({})

  const loadClaims = useCallback(async () => {
    const res = await fetch(`/api/patents/${projectId}/claims`)
    if (res.ok) {
      const json = await res.json()
      const data = json.data ?? []
      setClaims(data)
      onClaimsChanged?.(data)
    }
  }, [projectId, onClaimsChanged])

  useEffect(() => {
    if (initialClaims.length === 0) loadClaims()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleGenerate() {
    if (claims.length > 0 && !confirm('기존 청구항을 모두 삭제하고 재생성하시겠습니까?')) return
    setGenerating(true)
    setGenProgress('')
    setGenPhase('streaming')
    setError(null)

    try {
      const res = await fetch(`/api/patents/${projectId}/claims/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claim_type: genType }),
      })
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
              if (eventType === 'result') setGenPhase('saving')
              if (eventType === 'error') setError(raw)
              if (eventType === 'done') {
                setGenPhase('done')
                await loadClaims()
              }
            } catch { /* ignore */ }
            eventType = null
          }
        }
      }
    } finally {
      setGenerating(false)
      setGenProgress('')
      setGenPhase('idle')
    }
  }

  async function handleStrengthAnalysis() {
    setAnalyzing(true)
    setError(null)
    try {
      const res = await fetch(`/api/patents/${projectId}/claims/strength`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? '강도 분석 실패')
        return
      }
      await loadClaims()
    } finally {
      setAnalyzing(false)
    }
  }

  async function handleContentSave(claimId: string) {
    const content = editContents[claimId]
    if (content === undefined) return
    await fetch(`/api/patents/${projectId}/claims/${claimId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    })
    await loadClaims()
    setEditContents((prev) => { const next = { ...prev }; delete next[claimId]; return next })
  }

  async function handleDelete(claimId: string, claimNumber: number) {
    if (!confirm(`청구항 ${claimNumber}번을 삭제하시겠습니까?`)) return
    await fetch(`/api/patents/${projectId}/claims/${claimId}`, { method: 'DELETE' })
    await loadClaims()
  }

  const independentClaims = claims.filter((c) => c.claim_type === 'independent')
  const dependentClaims = claims.filter((c) => c.claim_type === 'dependent')

  // 종속항 → 부모 찾기
  const claimById = new Map(claims.map((c) => [c.id, c]))

  return (
    <div className="space-y-4">
      {/* toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={genType} onValueChange={(v) => setGenType(v as typeof genType)}>
          <SelectTrigger className="h-8 w-36 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="apparatus" className="text-xs">장치 청구항</SelectItem>
            <SelectItem value="method" className="text-xs">방법 청구항</SelectItem>
            <SelectItem value="system" className="text-xs">시스템 청구항</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" variant="default" onClick={handleGenerate} disabled={generating}>
          {generating ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-1.5 h-3.5 w-3.5" />}
          AI 청구항 생성
        </Button>
        <Button size="sm" variant="outline" onClick={handleStrengthAnalysis} disabled={analyzing || claims.length === 0}>
          {analyzing ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <BarChart2 className="mr-1.5 h-3.5 w-3.5" />}
          강도 분석
        </Button>
        {claims.length > 0 && (
          <span className="ml-auto text-xs text-gray-500">
            독립항 {independentClaims.length} · 종속항 {dependentClaims.length} · 총 {claims.length}개
          </span>
        )}
      </div>

      {/* generate progress */}
      {generating && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20 p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-800">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-300" />
            </div>
            <div>
              <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">
                {genPhase === 'saving' ? '청구항 저장 중...' : 'AI 청구항 생성 중...'}
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400">
                {genPhase === 'saving'
                  ? '생성된 청구항을 데이터베이스에 저장하고 있습니다.'
                  : genProgress
                  ? `청구항을 작성하고 있습니다. (${genProgress.length.toLocaleString()}자 생성됨)`
                  : '요청을 처리하고 있습니다...'}
              </p>
            </div>
          </div>
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

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}

      {/* claims list */}
      {claims.length === 0 ? (
        <div className="rounded-lg border border-dashed py-12 text-center dark:border-gray-700">
          <p className="text-sm text-gray-400">청구항이 없습니다. AI 생성 버튼을 눌러주세요.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {claims.map((claim) => {
            const isIndependent = claim.claim_type === 'independent'
            const parentClaim = claim.parent_claim_id ? claimById.get(claim.parent_claim_id) : null
            const content = editContents[claim.id] ?? claim.content
            const hasIssue = hasHighlights(content)
            const issues = Array.isArray(claim.strength_issues) ? claim.strength_issues as Array<{message: string}> : []

            return (
              <div
                key={claim.id}
                className={`group rounded-lg border p-3 transition-colors ${
                  isIndependent
                    ? 'border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20'
                    : 'ml-6 border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900'
                }`}
              >
                <div className="mb-1.5 flex items-center gap-2">
                  <span className={`text-xs font-bold ${isIndependent ? 'text-blue-700 dark:text-blue-300' : 'text-gray-600 dark:text-gray-400'}`}>
                    청구항 {claim.claim_number}
                  </span>
                  <Badge variant={isIndependent ? 'default' : 'secondary'} className="text-xs px-1.5 py-0">
                    {isIndependent ? '독립항' : '종속항'}
                  </Badge>
                  {parentClaim && (
                    <span className="text-xs text-gray-400">→ 청구항 {parentClaim.claim_number} 종속</span>
                  )}
                  <StrengthDots score={claim.strength_score} />
                  {hasIssue && (
                    <span title="주의 표현 포함">
                      <AlertCircle className="h-3.5 w-3.5 text-red-400" />
                    </span>
                  )}
                  <div className="ml-auto flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 text-red-500 hover:text-red-600"
                      onClick={() => handleDelete(claim.id, claim.claim_number)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <AutoResizeTextarea
                  value={content}
                  onChange={(v) => setEditContents((prev) => ({ ...prev, [claim.id]: v }))}
                  onBlur={() => handleContentSave(claim.id)}
                  hasIssue={hasIssue}
                />

                {issues.length > 0 && (
                  <div className="mt-1.5 space-y-0.5">
                    {issues.map((issue, i) => (
                      <p key={i} className="flex items-start gap-1 text-xs text-red-600 dark:text-red-400">
                        <AlertCircle className="mt-0.5 h-3 w-3 flex-shrink-0" />
                        {issue.message}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* add independent claim button */}
      {claims.length > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-xs"
          onClick={async () => {
            const nextNum = claims.length > 0 ? Math.max(...claims.map((c) => c.claim_number)) + 1 : 1
            await fetch(`/api/patents/${projectId}/claims`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ claim_number: nextNum, claim_type: 'independent', content: '청구항 내용을 입력하세요.' }),
            })
            await loadClaims()
          }}
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          독립항 추가
        </Button>
      )}
    </div>
  )
}
