'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, RefreshCw, Cpu, Lightbulb, AlertTriangle, Zap } from 'lucide-react'

interface AnalysisData {
  tech_domain?: string
  ipc_suggestions?: string[]
  core_inventions?: string[]
  problems_solved?: string[]
  effects?: string[]
  key_components?: { name: string; function: string; ref_number_suggestion: string }[]
}

interface AnalysisResultProps {
  projectId: string
  initialData?: AnalysisData | null
  onAnalysisDone: (data: AnalysisData) => void
}

export function AnalysisResult({ projectId, initialData, onAnalysisDone }: AnalysisResultProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [progress, setProgress] = useState('')
  const [result, setResult] = useState<AnalysisData | null>(initialData ?? null)
  const [error, setError] = useState<string | null>(null)

  const startAnalysis = useCallback(async () => {
    setIsAnalyzing(true)
    setProgress('')
    setError(null)

    try {
      const response = await fetch(`/api/patents/${projectId}/analyze`, { method: 'POST' })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error ?? '분석 요청 실패')
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('스트림을 읽을 수 없습니다.')

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
            const raw = JSON.parse(line.slice(6))
            if (eventType === 'text') {
              setProgress((prev) => prev + raw)
            } else if (eventType === 'result') {
              const parsed: AnalysisData = JSON.parse(raw)
              setResult(parsed)
              onAnalysisDone(parsed)
            } else if (eventType === 'error') {
              setError(raw)
            }
            eventType = null
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '분석 중 오류가 발생했습니다.')
    } finally {
      setIsAnalyzing(false)
      setProgress('')
    }
  }, [projectId, onAnalysisDone])

  if (isAnalyzing) {
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">AI 기술 분석 중...</p>
        {progress && (
          <div className="w-full max-w-lg rounded-lg bg-gray-50 dark:bg-gray-800 p-3 text-xs text-gray-500 dark:text-gray-400 font-mono whitespace-pre-wrap max-h-40 overflow-y-auto">
            {progress}
          </div>
        )}
      </div>
    )
  }

  if (!result) {
    return (
      <div className="flex flex-col items-center gap-4 py-10">
        {error && <p className="text-sm text-red-500">{error}</p>}
        <Button onClick={startAnalysis} size="lg" className="gap-2">
          <Cpu className="h-4 w-4" />
          AI 기술 분석 시작
        </Button>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          입력 내용을 바탕으로 특허 명세서 핵심 정보를 추출합니다.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-red-500">{error}</p>}

      {/* 기술 분야 */}
      {result.tech_domain && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Cpu className="h-4 w-4 text-blue-500" /> 기술 분야
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700 dark:text-gray-300">{result.tech_domain}</p>
            {result.ipc_suggestions && result.ipc_suggestions.length > 0 && (
              <div className="flex gap-2 flex-wrap mt-2">
                {result.ipc_suggestions.map((code) => (
                  <Badge key={code} variant="outline" className="font-mono text-xs">{code}</Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 핵심 발명 포인트 */}
      {result.core_inventions && result.core_inventions.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-yellow-500" /> 핵심 발명 포인트
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {result.core_inventions.map((inv, i) => (
                <li key={i} className="text-sm text-gray-700 dark:text-gray-300 flex gap-2">
                  <span className="shrink-0 text-yellow-500 font-bold">{i + 1}.</span>
                  {inv}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* 해결 과제 + 기대 효과 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {result.problems_solved && result.problems_solved.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" /> 해결하려는 문제
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1">
                {result.problems_solved.map((p, i) => (
                  <li key={i} className="text-xs text-gray-600 dark:text-gray-400">• {p}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {result.effects && result.effects.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Zap className="h-4 w-4 text-green-500" /> 기대 효과
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1">
                {result.effects.map((e, i) => (
                  <li key={i} className="text-xs text-gray-600 dark:text-gray-400">• {e}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 주요 구성요소 */}
      {result.key_components && result.key_components.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">주요 구성요소 (예비)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {result.key_components.map((comp, i) => (
                <div key={i} className="flex items-start gap-3 text-sm">
                  <Badge variant="secondary" className="font-mono shrink-0">
                    ({comp.ref_number_suggestion})
                  </Badge>
                  <div>
                    <span className="font-medium text-gray-900 dark:text-white">{comp.name}</span>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{comp.function}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Button
        variant="outline"
        size="sm"
        onClick={startAnalysis}
        className="gap-2"
        disabled={isAnalyzing}
      >
        <RefreshCw className="h-3 w-3" /> 재분석
      </Button>
    </div>
  )
}
