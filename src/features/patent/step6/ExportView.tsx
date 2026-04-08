'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, CheckCircle2, XCircle, Download, FileText, FileDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface CheckResult {
  id: string
  label: string
  passed: boolean
  detail?: string
}

interface ExportViewProps {
  projectId: string
  onCompleted?: () => void
}

export function ExportView({ projectId, onCompleted }: ExportViewProps) {
  const [checks, setChecks] = useState<CheckResult[]>([])
  const [passCount, setPassCount] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [completing, setCompleting] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const runValidation = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/patents/${projectId}/validate`)
      if (res.ok) {
        const json = await res.json()
        setChecks(json.data?.checks ?? [])
        setPassCount(json.data?.passCount ?? 0)
        setTotalCount(json.data?.totalCount ?? 0)
      }
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => { runValidation() }, [runValidation])

  function handleDownload(format: 'markdown' | 'docx' | 'pdf') {
    window.open(`/api/patents/${projectId}/export/${format}`, '_blank')
  }

  async function handleComplete() {
    setCompleting(true)
    setError(null)
    try {
      const res = await fetch(`/api/patents/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        setError(json.error ?? '완료 처리 실패')
        return
      }
      setCompleted(true)
      onCompleted?.()
    } finally {
      setCompleting(false)
    }
  }

  const allPassed = passCount === totalCount && totalCount > 0

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">STEP 6 — 최종 출력</h2>
        <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
          명세서 완성도를 확인하고 원하는 형식으로 다운로드합니다.
        </p>
      </div>

      {/* validation report */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">완성도 점검 리포트</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant={allPassed ? 'default' : 'secondary'}>
                {passCount}/{totalCount} 통과
              </Badge>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={runValidation} disabled={loading}>
                {loading ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
                재검사
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="space-y-2">
              {checks.map((check) => (
                <div
                  key={check.id}
                  className={`flex items-start gap-2 rounded-md p-2 ${
                    check.passed
                      ? 'bg-green-50 dark:bg-green-950/20'
                      : 'bg-red-50 dark:bg-red-950/20'
                  }`}
                >
                  {check.passed ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />
                  ) : (
                    <XCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
                  )}
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${check.passed ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}`}>
                      {check.label}
                    </p>
                    {check.detail && (
                      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{check.detail}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* download section */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">출력 형식 선택</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => handleDownload('markdown')}
              className="flex flex-col items-center gap-2 rounded-lg border border-gray-200 p-4 transition-colors hover:border-blue-400 hover:bg-blue-50 dark:border-gray-700 dark:hover:bg-blue-950/20"
            >
              <FileText className="h-8 w-8 text-gray-600 dark:text-gray-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Markdown</span>
              <span className="text-xs text-gray-400">.md 파일</span>
            </button>
            <button
              onClick={() => handleDownload('docx')}
              className="flex flex-col items-center gap-2 rounded-lg border border-gray-200 p-4 transition-colors hover:border-blue-400 hover:bg-blue-50 dark:border-gray-700 dark:hover:bg-blue-950/20"
            >
              <FileDown className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">DOCX</span>
              <span className="text-xs text-gray-400">Word 문서</span>
            </button>
            <button
              onClick={() => handleDownload('pdf')}
              className="flex flex-col items-center gap-2 rounded-lg border border-gray-200 p-4 transition-colors hover:border-red-400 hover:bg-red-50 dark:border-gray-700 dark:hover:bg-red-950/20"
            >
              <Download className="h-8 w-8 text-red-500 dark:text-red-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">PDF</span>
              <span className="text-xs text-gray-400">인쇄용 HTML</span>
            </button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}

      {/* complete button */}
      {!completed ? (
        <div className="flex justify-end">
          <Button
            size="lg"
            onClick={handleComplete}
            disabled={completing}
            className="min-w-[180px]"
          >
            {completing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-2 h-4 w-4" />
            )}
            특허 명세서 완성
          </Button>
        </div>
      ) : (
        <div className="flex items-center justify-center gap-2 rounded-lg border border-green-200 bg-green-50 p-6 dark:border-green-900 dark:bg-green-950/20">
          <CheckCircle2 className="h-6 w-6 text-green-500" />
          <p className="text-lg font-semibold text-green-700 dark:text-green-300">
            특허 명세서가 완성되었습니다!
          </p>
        </div>
      )}
    </div>
  )
}
