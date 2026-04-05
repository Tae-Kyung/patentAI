'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { marked } from 'marked'
import {
  FileText,
  Check,
  AlertTriangle,
  Lock,
  Download,
  ClipboardCheck,
  Activity,
  Target,
  Flag,
  Printer,
  RotateCcw,
  ChevronDown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LoadingSpinner } from '@/components/common/loading-spinner'
import { CreditCostBadge } from '@/components/common/credit-cost-badge'
import { AiDisclaimer } from '@/components/common/ai-disclaimer'
import { useSSE } from '@/hooks/useSSE'
import { toast } from 'sonner'
import { MarkdownContent } from '@/components/common/markdown-content'
import { exportToDocx } from '@/lib/utils/document-export'
import type { BusinessReview } from '@/types/database'
import type { Json } from '@/types/database'

interface ReportStageProps {
  projectId: string
  review: BusinessReview | null
  canGenerate: boolean
  onUpdate: () => void
}

interface StrategyResult {
  strategic_goals?: { goal: string }[]
}

interface DiagnosisResult {
  health_score?: number
}

export function ReportStage({
  projectId,
  review,
  canGenerate,
  onUpdate,
}: ReportStageProps) {
  const t = useTranslations()

  const [isCompleting, setIsCompleting] = useState(false)
  const [isFetching, setIsFetching] = useState(false)
  const [localReview, setLocalReview] = useState<BusinessReview | null>(review)
  const [isCompleted, setIsCompleted] = useState(false)

  const sse = useSSE({
    onDone: () => {
      toast.success(t('report.generateComplete'))
      onUpdate()
    },
    onError: (error) => {
      toast.error(error)
    },
  })

  useEffect(() => {
    if (review) {
      setLocalReview(review)
    }
  }, [review])

  useEffect(() => {
    if (!review && canGenerate && !isFetching) {
      fetchReview()
    }
  }, [canGenerate]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchReview = async () => {
    setIsFetching(true)
    try {
      const response = await fetch(`/api/projects/${projectId}/review`)
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          setLocalReview(result.data)
        }
      }
    } catch {
      // silent
    } finally {
      setIsFetching(false)
    }
  }

  const handleGenerate = useCallback(() => {
    sse.start(`/api/projects/${projectId}/report/generate`)
  }, [projectId, sse])

  const handleComplete = useCallback(async () => {
    setIsCompleting(true)
    try {
      const response = await fetch(`/api/projects/${projectId}/complete`, {
        method: 'POST',
      })

      const result = await response.json()

      if (result.success) {
        toast.success(t('report.completeSuccess'))
        setIsCompleted(true)
        onUpdate()
      } else {
        toast.error(result.error || t('report.completeFailed'))
      }
    } catch {
      toast.error(t('report.completeFailed'))
    } finally {
      setIsCompleting(false)
    }
  }, [projectId, onUpdate, t])

  const getReportTitle = useCallback(() => {
    const companyName = localReview?.company_name || t('report.defaultCompanyName')
    return `${companyName} - ${t('report.reportTitle')}`
  }, [localReview?.company_name, t])

  const getFullMarkdown = useCallback(() => {
    const executiveSummary = localReview?.executive_summary || ''
    const reportContent = localReview?.report_content || ''
    if (executiveSummary) {
      return `## ${t('report.executiveSummary')}\n\n${executiveSummary}\n\n---\n\n${reportContent}`
    }
    return reportContent
  }, [localReview, t])

  const handlePrint = useCallback(() => {
    const title = getReportTitle()
    const markdown = getFullMarkdown()
    const bodyHtml = marked.parse(markdown, { async: false }) as string

    const htmlContent = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
      color: #1a1a1a;
      line-height: 1.8;
    }
    h1 { font-size: 28px; border-bottom: 3px solid #2563eb; padding-bottom: 12px; margin-bottom: 24px; }
    h2 { font-size: 22px; color: #2563eb; margin-top: 32px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; }
    h3 { font-size: 18px; margin-top: 24px; color: #374151; }
    p { margin: 12px 0; }
    ul, ol { margin: 12px 0; padding-left: 24px; }
    li { margin: 6px 0; }
    strong { color: #111827; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px; }
    th { background: #f3f4f6; font-weight: 600; text-align: left; padding: 10px 12px; border: 1px solid #d1d5db; }
    td { padding: 10px 12px; border: 1px solid #d1d5db; }
    tr:nth-child(even) { background: #f9fafb; }
    blockquote { border-left: 4px solid #2563eb; margin: 16px 0; padding: 12px 20px; background: #f0f4ff; border-radius: 0 8px 8px 0; }
    code { background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-size: 0.9em; }
    hr { border: none; border-top: 1px solid #e5e7eb; margin: 24px 0; }
    @media print {
      body { padding: 20px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <h1>${title}</h1>
  ${bodyHtml}
  <div class="no-print" style="margin-top: 40px; text-align: center;">
    <button onclick="window.print()" style="padding: 12px 24px; background: #2563eb; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 16px;">
      ${t('report.print')}
    </button>
  </div>
</body>
</html>`

    const newWindow = window.open('', '_blank')
    if (newWindow) {
      newWindow.document.write(htmlContent)
      newWindow.document.close()
    }
  }, [getReportTitle, getFullMarkdown, t])

  const handleDownloadDoc = useCallback(() => {
    const title = getReportTitle()
    const markdown = getFullMarkdown()
    exportToDocx(title, markdown)
  }, [getReportTitle, getFullMarkdown])

  const parseJsonField = <T,>(data: Json | null): T | null => {
    if (!data) return null
    try {
      if (typeof data === 'string') {
        return JSON.parse(data) as T
      }
      return data as unknown as T
    } catch {
      return null
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400'
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-green-100 dark:bg-green-900/50'
    if (score >= 60) return 'bg-yellow-100 dark:bg-yellow-900/50'
    return 'bg-red-100 dark:bg-red-900/50'
  }

  // Locked state
  if (!canGenerate) {
    return (
      <Card className="border-orange-500 bg-orange-50 dark:bg-orange-950">
        <CardContent className="flex items-center gap-4 py-6">
          <div className="rounded-full bg-orange-500 p-2">
            <Lock className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-orange-700 dark:text-orange-300">
              {t('report.locked')}
            </h3>
            <p className="text-sm text-orange-600 dark:text-orange-400">
              {t('report.lockedDesc')}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (isFetching) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </CardContent>
      </Card>
    )
  }

  const reviewScore = localReview?.review_score
  const diagnosisResult = parseJsonField<DiagnosisResult>(localReview?.diagnosis_result ?? null)
  const strategyResult = parseJsonField<StrategyResult>(localReview?.strategy_result ?? null)
  const hasReport = !!localReview?.report_content

  return (
    <div className="space-y-6">
      <AiDisclaimer />
      {/* Project Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">{t('report.projectSummary')}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {/* Review Score */}
            <div className="flex items-center gap-3 rounded-lg border p-4">
              <div className={`flex h-12 w-12 items-center justify-center rounded-full ${reviewScore ? getScoreBg(reviewScore) : 'bg-muted'}`}>
                {reviewScore ? (
                  <span className={`text-lg font-bold ${getScoreColor(reviewScore)}`}>{reviewScore}</span>
                ) : (
                  <span className="text-sm text-muted-foreground">-</span>
                )}
              </div>
              <div>
                <p className="text-sm font-medium">{t('report.reviewScore')}</p>
                <p className="text-xs text-muted-foreground">{t('report.gate1')}</p>
              </div>
            </div>

            {/* Diagnosis Health Score */}
            <div className="flex items-center gap-3 rounded-lg border p-4">
              <div className={`flex h-12 w-12 items-center justify-center rounded-full ${diagnosisResult?.health_score ? getScoreBg(diagnosisResult.health_score) : 'bg-muted'}`}>
                {diagnosisResult?.health_score ? (
                  <span className={`text-lg font-bold ${getScoreColor(diagnosisResult.health_score)}`}>
                    {diagnosisResult.health_score}
                  </span>
                ) : (
                  <Activity className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium">{t('report.diagnosisScore')}</p>
                <p className="text-xs text-muted-foreground">{t('report.gate2')}</p>
              </div>
            </div>

            {/* Strategy Goals Count */}
            <div className="flex items-center gap-3 rounded-lg border p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/50">
                {strategyResult?.strategic_goals ? (
                  <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    {strategyResult.strategic_goals.length}
                  </span>
                ) : (
                  <Flag className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium">{t('report.strategyGoals')}</p>
                <p className="text-xs text-muted-foreground">{t('report.gate3')}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Generate Report Button */}
      {!hasReport && !sse.isLoading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-4 py-12">
            <div className="rounded-full bg-muted p-4">
              <FileText className="h-8 w-8 text-primary" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold">{t('report.generateTitle')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('report.generateDesc')}
              </p>
            </div>
            <Button size="lg" onClick={handleGenerate}>
              <FileText className="mr-2 h-4 w-4" />
              {t('report.generateButton')}
              <CreditCostBadge cost={1} className="ml-2" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Re-generate Report Button (when report exists but not completed) */}
      {hasReport && !isCompleted && !sse.isLoading && (
        <Card className="border-dashed">
          <CardContent className="flex items-center justify-between py-4">
            <div>
              <p className="text-sm font-medium">{t('report.regenerateDesc')}</p>
            </div>
            <Button variant="outline" onClick={handleGenerate}>
              <RotateCcw className="mr-2 h-4 w-4" />
              {t('report.regenerateButton')}
              <CreditCostBadge cost={1} className="ml-1" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* SSE Streaming */}
      {sse.isLoading && (
        <Card>
          <CardContent className="py-6">
            <div className="flex items-center gap-3 mb-4">
              <LoadingSpinner size="md" />
              <span className="font-medium">{t('report.generating')}</span>
            </div>
            {sse.data && (
              <MarkdownContent content={sse.data} className="rounded-lg bg-muted/50 p-4 max-h-[400px] overflow-y-auto" />
            )}
          </CardContent>
        </Card>
      )}

      {/* SSE Error */}
      {sse.error && (
        <Card className="border-red-500">
          <CardContent className="flex items-center gap-4 py-4">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <p className="text-sm text-red-600 dark:text-red-400">{sse.error}</p>
          </CardContent>
        </Card>
      )}

      {/* Report Content */}
      {hasReport && !sse.isLoading && (
        <div className="space-y-4">
          {/* Executive Summary */}
          {localReview?.executive_summary && (
            <Card className="border-2 border-primary/30 bg-primary/5">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">{t('report.executiveSummary')}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <MarkdownContent content={localReview.executive_summary} className="text-sm text-muted-foreground leading-relaxed" />
              </CardContent>
            </Card>
          )}

          {/* Full Report */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-base">{t('report.fullReport')}</CardTitle>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Download className="mr-2 h-4 w-4" />
                      {t('report.download')}
                      <ChevronDown className="ml-1 h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handlePrint}>
                      <Printer className="mr-2 h-4 w-4" />
                      {t('report.printOption')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDownloadDoc}>
                      <FileText className="mr-2 h-4 w-4" />
                      {t('report.downloadDoc')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent>
              <MarkdownContent content={localReview?.report_content || ''} className="rounded-lg bg-muted/30 p-6 max-h-[600px] overflow-y-auto" />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Complete Project Button (Gate 4) */}
      {hasReport && !isCompleted && !sse.isLoading && (
        <Card>
          <CardContent className="flex items-center justify-end gap-4 py-4">
            <Button
              size="lg"
              onClick={handleComplete}
              disabled={isCompleting}
            >
              {isCompleting ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  {t('common.processing')}
                </>
              ) : (
                <>
                  <Check className="mr-2 h-5 w-5" />
                  {t('report.completeGate4')}
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Completed State */}
      {isCompleted && (
        <Card className="border-green-500 bg-green-50 dark:bg-green-950">
          <CardContent className="flex items-center gap-4 py-6">
            <div className="rounded-full bg-green-500 p-2">
              <Check className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-green-700 dark:text-green-300">
                {t('report.gate4Passed')}
              </h3>
              <p className="text-sm text-green-600 dark:text-green-400">
                {t('report.gate4PassedDesc')}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
