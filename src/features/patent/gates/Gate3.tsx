'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, CheckCircle, RotateCcw, AlertCircle, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import type { PatentClaim } from '@/types/database'

interface Gate3Props {
  projectId: string
  onApproved: () => void
  onBack: () => void
}

interface StrengthIssue {
  type: string
  message: string
}

export function Gate3({ projectId, onApproved, onBack }: Gate3Props) {
  const [claims, setClaims] = useState<PatentClaim[]>([])
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [notes, setNotes] = useState('')
  const [approving, setApproving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadClaims = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/patents/${projectId}/claims`)
      if (res.ok) {
        const json = await res.json()
        setClaims(json.data ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    loadClaims()
  }, [loadClaims])

  async function handleAnalyze() {
    setAnalyzing(true)
    setError(null)
    try {
      const res = await fetch(`/api/patents/${projectId}/claims/strength`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? '분석 실패'); return }
      await loadClaims()
    } finally {
      setAnalyzing(false)
    }
  }

  async function handleApprove() {
    setApproving(true)
    setError(null)
    try {
      const res = await fetch(`/api/patents/${projectId}/gates/3`, {
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

  const independents = claims.filter((c) => c.claim_type === 'independent')
  const dependents = claims.filter((c) => c.claim_type === 'dependent')
  const allIssues = claims.flatMap((c) =>
    Array.isArray(c.strength_issues) ? (c.strength_issues as unknown as StrengthIssue[]) : []
  )
  const avgScore = claims.length > 0
    ? claims.filter((c) => c.strength_score !== null).reduce((s, c) => s + (c.strength_score ?? 0), 0) /
      claims.filter((c) => c.strength_score !== null).length
    : null

  return (
    <div className="space-y-6">
      {/* header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">GATE 3 — 청구범위 확정</h2>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
            청구항을 최종 검토하고 명세서 본문 작성으로 넘어갑니다.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onBack}>← 이전으로</Button>
      </div>

      {/* summary bar */}
      {!loading && claims.length > 0 && (
        <div className="flex flex-wrap gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{claims.length}</p>
            <p className="text-xs text-gray-500">총 청구항</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{independents.length}</p>
            <p className="text-xs text-gray-500">독립항</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">{dependents.length}</p>
            <p className="text-xs text-gray-500">종속항</p>
          </div>
          {avgScore !== null && (
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{avgScore.toFixed(1)}/5</p>
              <p className="text-xs text-gray-500">평균 강도</p>
            </div>
          )}
          {allIssues.length > 0 && (
            <div className="text-center">
              <p className="text-2xl font-bold text-red-500">{allIssues.length}</p>
              <p className="text-xs text-gray-500">경고</p>
            </div>
          )}
          <div className="ml-auto self-center">
            <Button size="sm" variant="outline" onClick={handleAnalyze} disabled={analyzing}>
              {analyzing ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
              강도 분석
            </Button>
          </div>
        </div>
      )}

      {/* claims preview */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : claims.length === 0 ? (
        <div className="rounded-lg border border-dashed py-12 text-center dark:border-gray-700">
          <p className="text-sm text-gray-400">청구항이 없습니다. STEP 3으로 돌아가서 청구항을 작성해주세요.</p>
        </div>
      ) : (
        <div className="max-h-[480px] space-y-2 overflow-y-auto rounded-lg border p-3 dark:border-gray-700">
          {claims.map((claim) => {
            const issues = Array.isArray(claim.strength_issues)
              ? (claim.strength_issues as unknown as StrengthIssue[])
              : []
            const isIndependent = claim.claim_type === 'independent'

            return (
              <div
                key={claim.id}
                className={`rounded p-2 text-sm ${
                  isIndependent
                    ? 'bg-blue-50 dark:bg-blue-950/30'
                    : 'ml-4 bg-gray-50 dark:bg-gray-800/50'
                }`}
              >
                <div className="mb-1 flex items-center gap-1.5">
                  <span className="font-semibold text-gray-700 dark:text-gray-300">
                    청구항 {claim.claim_number}.
                  </span>
                  <Badge variant={isIndependent ? 'default' : 'secondary'} className="px-1.5 py-0 text-xs">
                    {isIndependent ? '독립항' : '종속항'}
                  </Badge>
                  {claim.strength_score !== null && (
                    <span className="ml-auto font-mono text-xs text-gray-400">
                      강도 {claim.strength_score}/5
                    </span>
                  )}
                  {issues.length > 0 && (
                    <AlertCircle className="h-3.5 w-3.5 text-red-400" />
                  )}
                </div>
                <p className="whitespace-pre-wrap text-gray-800 dark:text-gray-200">{claim.content}</p>
                {issues.length > 0 && (
                  <div className="mt-1 space-y-0.5">
                    {issues.map((iss, i) => (
                      <p key={i} className="flex items-center gap-1 text-xs text-red-500">
                        <AlertCircle className="h-3 w-3 flex-shrink-0" />
                        {iss.message}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* issue warning */}
      {allIssues.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-900/20">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-yellow-600 dark:text-yellow-400" />
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            {allIssues.length}개의 경고 항목이 있습니다. 확정 전 수정을 권장합니다.
          </p>
        </div>
      )}

      {allIssues.length === 0 && claims.length > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-900/20">
          <ShieldCheck className="h-4 w-4 text-green-600 dark:text-green-400" />
          <p className="text-sm text-green-800 dark:text-green-200">
            경고 없음 — 청구항 품질이 양호합니다.
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}

      {/* approval */}
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
            청구항 편집
          </Button>
          <Button onClick={handleApprove} disabled={approving || claims.length === 0}>
            {approving ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle className="mr-1.5 h-4 w-4" />
            )}
            청구범위 확정 및 본문 작성 →
          </Button>
        </div>
      </div>
    </div>
  )
}
