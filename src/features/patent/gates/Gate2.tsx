'use client'

import { useState, useCallback } from 'react'
import { Loader2, CheckCircle, RotateCcw, Search, Lightbulb, AlertTriangle, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { ComponentTree } from '../step2/ComponentTree'
import type { PatentComponent, PatentPriorArt, PriorArtRisk } from '@/types/database'

type ComponentNode = PatentComponent & { children: ComponentNode[] }

interface Gate2Props {
  projectId: string
  componentNodes: ComponentNode[]
  onComponentsChanged: () => void
  onApproved: () => void
  onBack: () => void
}

const RISK_CONFIG: Record<PriorArtRisk, { label: string; color: string; bg: string }> = {
  high: { label: '높음', color: 'text-red-700 dark:text-red-300', bg: 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800' },
  medium: { label: '보통', color: 'text-orange-700 dark:text-orange-300', bg: 'bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800' },
  low: { label: '낮음', color: 'text-green-700 dark:text-green-300', bg: 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' },
}

export function Gate2({ projectId, componentNodes, onComponentsChanged, onApproved, onBack }: Gate2Props) {
  const [priorArts, setPriorArts] = useState<PatentPriorArt[]>([])
  const [overallRisk, setOverallRisk] = useState<PriorArtRisk | null>(null)
  const [searched, setSearched] = useState(false)
  const [searching, setSearching] = useState(false)
  const [avoidanceProgress, setAvoidanceProgress] = useState('')
  const [generatingAvoidance, setGeneratingAvoidance] = useState(false)
  const [notes, setNotes] = useState('')
  const [approving, setApproving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 선행기술 조회 (저장된 결과)
  const loadPriorArt = useCallback(async () => {
    const res = await fetch(`/api/patents/${projectId}/prior-art/search`)
    if (res.ok) {
      const json = await res.json()
      setPriorArts(json.data?.results ?? [])
      setOverallRisk(json.data?.overallRisk ?? 'low')
      setSearched(true)
    }
  }, [projectId])

  // 선행기술 검색 실행
  async function handleSearch() {
    setSearching(true)
    setError(null)
    try {
      const res = await fetch(`/api/patents/${projectId}/prior-art/search`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? '검색 실패')
        return
      }
      setPriorArts(json.data?.results ?? [])
      setOverallRisk(json.data?.overallRisk ?? 'low')
      setSearched(true)
      // 구성요소 충돌 정보 갱신
      onComponentsChanged()
    } finally {
      setSearching(false)
    }
  }

  // 회피 전략 생성 (SSE)
  async function handleAvoidance() {
    setGeneratingAvoidance(true)
    setAvoidanceProgress('')
    setError(null)
    try {
      const res = await fetch(`/api/patents/${projectId}/prior-art/avoidance`, { method: 'POST' })
      if (!res.ok || !res.body) {
        const json = await res.json().catch(() => ({}))
        setError(json.error ?? '회피 전략 생성 실패')
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const event = JSON.parse(line.slice(6))
            if (event.type === 'text') setAvoidanceProgress((p) => p + event.data)
            if (event.type === 'done') await loadPriorArt()
            if (event.type === 'error') setError(event.data)
          } catch { /* ignore */ }
        }
      }
    } finally {
      setGeneratingAvoidance(false)
    }
  }

  // GATE 2 승인
  async function handleApprove() {
    setApproving(true)
    setError(null)
    try {
      const res = await fetch(`/api/patents/${projectId}/gates/2`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? '승인 실패')
        return
      }
      onApproved()
    } finally {
      setApproving(false)
    }
  }

  const highRiskCount = priorArts.filter((p) => p.risk_level === 'high').length
  const medRiskCount = priorArts.filter((p) => p.risk_level === 'medium').length
  const conflictRefs = new Set(
    componentNodes
      .filter((n) => n.has_prior_art_conflict)
      .map((n) => n.ref_number),
  )

  return (
    <div className="space-y-6">
      {/* header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">GATE 2 — 구성요소 확정 + 선행기술조사</h2>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            구성요소 트리를 최종 확인하고 선행기술 충돌 여부를 검토합니다.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onBack}>
          ← 이전으로
        </Button>
      </div>

      {/* 2-panel layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* left: component tree */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">구성요소 트리</h3>
          <ComponentTree
            projectId={projectId}
            nodes={componentNodes}
            onAdd={() => {}}
            onUpdated={onComponentsChanged}
            onDeleted={onComponentsChanged}
            conflictRefs={conflictRefs}
          />
        </div>

        {/* right: prior art */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">선행기술 조사 결과</h3>
            <Button variant="outline" size="sm" onClick={handleSearch} disabled={searching}>
              {searching ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Search className="mr-1.5 h-3.5 w-3.5" />
              )}
              {searched ? '재검색' : '검색 시작'}
            </Button>
          </div>

          {/* overall risk summary */}
          {searched && overallRisk && (
            <div className={`flex items-center gap-2 rounded-lg border p-3 ${RISK_CONFIG[overallRisk].bg}`}>
              {overallRisk === 'low' ? (
                <ShieldCheck className={`h-5 w-5 ${RISK_CONFIG[overallRisk].color}`} />
              ) : (
                <AlertTriangle className={`h-5 w-5 ${RISK_CONFIG[overallRisk].color}`} />
              )}
              <span className={`text-sm font-medium ${RISK_CONFIG[overallRisk].color}`}>
                전체 위험도: {RISK_CONFIG[overallRisk].label}
                {highRiskCount > 0 && ` (고위험 ${highRiskCount}건)`}
                {medRiskCount > 0 && ` (중위험 ${medRiskCount}건)`}
              </span>
            </div>
          )}

          {/* prior art list */}
          {priorArts.length > 0 ? (
            <div className="max-h-[400px] space-y-2 overflow-y-auto">
              {priorArts.map((art) => (
                <Card key={art.id} className={`border ${RISK_CONFIG[art.risk_level].bg}`}>
                  <CardHeader className="pb-2 pt-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-sm leading-tight">{art.title || '(제목 없음)'}</CardTitle>
                      <Badge
                        variant="outline"
                        className={`flex-shrink-0 text-xs ${RISK_CONFIG[art.risk_level].color}`}
                      >
                        {RISK_CONFIG[art.risk_level].label}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">{art.source_db.toUpperCase()}</Badge>
                      <span className="font-mono text-xs text-gray-500">{art.patent_number}</span>
                      {art.similarity_score !== null && (
                        <span className="text-xs text-gray-500">
                          유사도 {Math.round(art.similarity_score * 100)}%
                        </span>
                      )}
                    </div>
                  </CardHeader>
                  {(art.abstract || art.avoidance_suggestion) && (
                    <CardContent className="pb-3 pt-0 space-y-2">
                      {art.abstract && (
                        <p className="line-clamp-2 text-xs text-gray-600 dark:text-gray-400">
                          {art.abstract}
                        </p>
                      )}
                      {art.avoidance_suggestion && (
                        <div className="flex gap-1.5 rounded bg-blue-50 p-2 dark:bg-blue-900/20">
                          <Lightbulb className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-blue-500" />
                          <p className="text-xs text-blue-700 dark:text-blue-300">
                            {art.avoidance_suggestion}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          ) : searched ? (
            <div className="flex items-center justify-center rounded-lg border border-dashed py-10 dark:border-gray-700">
              <div className="text-center">
                <ShieldCheck className="mx-auto h-8 w-8 text-green-400" />
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  충돌하는 선행기술이 발견되지 않았습니다.
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed py-10 text-center dark:border-gray-700">
              <p className="text-sm text-gray-400">검색 시작 버튼을 눌러 선행기술을 조사하세요.</p>
            </div>
          )}

          {/* avoidance strategy */}
          {searched && priorArts.some((p) => ['high', 'medium'].includes(p.risk_level)) && (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={handleAvoidance}
              disabled={generatingAvoidance}
            >
              {generatingAvoidance ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Lightbulb className="mr-1.5 h-3.5 w-3.5" />
              )}
              💡 회피 전략 생성
            </Button>
          )}

          {/* avoidance progress */}
          {avoidanceProgress && (
            <div className="max-h-32 overflow-y-auto rounded border p-2 dark:border-gray-700">
              <p className="whitespace-pre-wrap text-xs text-gray-600 dark:text-gray-300">
                {avoidanceProgress}
              </p>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}

      {/* approval section */}
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
            구성요소 수정
          </Button>
          <Button onClick={handleApprove} disabled={approving}>
            {approving ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle className="mr-1.5 h-4 w-4" />
            )}
            확정하고 청구범위 작성 →
          </Button>
        </div>
      </div>
    </div>
  )
}
