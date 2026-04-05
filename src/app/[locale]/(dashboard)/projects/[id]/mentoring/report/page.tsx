'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { useParams, useRouter } from 'next/navigation'
import { Save, Send, Undo2, Sparkles, Star, ArrowLeft, MessageSquare, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/common/loading-spinner'
import { useSSE } from '@/hooks/useSSE'
import { MarkdownContent } from '@/components/common/markdown-content'
import { toast } from 'sonner'

interface MentoringReport {
  id: string
  project_id: string
  overall_rating: number
  ai_generated_report: string
  status: 'draft' | 'submitted' | 'confirmed' | 'rejected'
  rejection_reason: string | null
  created_at: string
  updated_at: string
}

interface FeedbackItem {
  id: string
  stage: string
  feedback_type: string
  comment: string
  created_at: string
}

const STAGE_ORDER = ['idea', 'evaluation', 'document', 'deploy', 'done']

export default function MentoringReportPage() {
  const t = useTranslations()
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string

  const [report, setReport] = useState<MentoringReport | null>(null)
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [feedbackExpanded, setFeedbackExpanded] = useState(true)

  const [overallRating, setOverallRating] = useState(3)
  const [aiReport, setAiReport] = useState('')
  const [hoveredStar, setHoveredStar] = useState(0)

  const aiReportRef = useRef<HTMLDivElement>(null)

  const sseErrorRef = useRef(false)

  const sse = useSSE({
    onDone: () => {
      if (!sseErrorRef.current) {
        toast.success(t('mentor.reports.aiGenerated'))
      }
      sseErrorRef.current = false
    },
    onError: (err) => {
      console.error('SSE error:', err)
      sseErrorRef.current = true
      toast.error(t('mentor.reports.aiGenerateFailed'))
    },
  })

  const stageLabels: Record<string, string> = {
    idea: t('mentor.reports.stageIdea'),
    evaluation: t('mentor.reports.stageEvaluation'),
    document: t('mentor.reports.stageDocument'),
    deploy: t('mentor.reports.stageDeploy'),
    done: t('mentor.reports.stageDone'),
  }

  const feedbackTypeLabels: Record<string, string> = {
    comment: t('mentor.workstation.fbComment'),
    approval: t('mentor.workstation.fbApproval'),
    rejection: t('mentor.workstation.fbRejection'),
    revision_request: t('mentor.workstation.fbRevision'),
  }

  const feedbackTypeBadgeClass: Record<string, string> = {
    comment: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    approval: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    rejection: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    revision_request: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  }

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [reportRes, feedbackRes] = await Promise.all([
        fetch(`/api/mentor/projects/${projectId}/report`, { method: 'POST' }),
        fetch(`/api/mentor/projects/${projectId}/feedbacks`),
      ])

      const reportResult = await reportRes.json()
      if (reportResult.success) {
        const data = reportResult.data as MentoringReport
        setReport(data)
        setOverallRating(data.overall_rating || 3)
        setAiReport(data.ai_generated_report || '')
      } else {
        toast.error(t('mentor.reports.fetchFailed'))
      }

      const feedbackResult = await feedbackRes.json()
      if (feedbackResult.success) {
        setFeedbacks(feedbackResult.data.filter((f: FeedbackItem & { is_mine: boolean }) => f.is_mine))
      }
    } catch {
      toast.error(t('mentor.reports.fetchFailed'))
    } finally {
      setIsLoading(false)
    }
  }, [projectId, t])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // SSE 스트리밍 중 자동 스크롤
  useEffect(() => {
    if (sse.data && aiReportRef.current) {
      aiReportRef.current.scrollTop = aiReportRef.current.scrollHeight
    }
  }, [sse.data])

  // SSE 데이터가 있으면 우선 사용 (스트리밍 중이거나 방금 생성된 경우)
  const displayReport = sse.data || aiReport
  const isGeneratingAI = sse.isLoading

  // 단계별 피드백 그룹핑
  const feedbacksByStage: Record<string, FeedbackItem[]> = {}
  for (const fb of feedbacks) {
    if (!feedbacksByStage[fb.stage]) feedbacksByStage[fb.stage] = []
    feedbacksByStage[fb.stage].push(fb)
  }

  const handleSaveRating = async () => {
    if (!report) return
    try {
      const response = await fetch(`/api/mentor/reports/${report.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ overall_rating: overallRating }),
      })
      const result = await response.json()
      if (result.success) {
        setReport(result.data)
        toast.success(t('mentor.reports.savedDraft'))
      } else {
        toast.error(t('mentor.reports.saveFailed'))
      }
    } catch {
      toast.error(t('mentor.reports.saveFailed'))
    }
  }

  const handleSubmit = async () => {
    if (!report) return

    if (!displayReport) {
      toast.error(t('mentor.reports.generateFirst'))
      return
    }

    setIsSubmitting(true)
    try {
      // 평점 저장 후 제출
      await fetch(`/api/mentor/reports/${report.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ overall_rating: overallRating }),
      })

      const response = await fetch(`/api/mentor/reports/${report.id}/submit`, {
        method: 'POST',
      })
      const result = await response.json()

      if (result.success) {
        setReport(result.data)
        toast.success(t('mentor.reports.submitted'))
      } else {
        toast.error(result.error || t('mentor.reports.submitFailed'))
      }
    } catch {
      toast.error(t('mentor.reports.submitFailed'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUnsubmit = async () => {
    if (!report) return
    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/mentor/reports/${report.id}/unsubmit`, {
        method: 'POST',
      })
      const result = await response.json()
      if (result.success) {
        setReport(result.data)
        toast.success(t('mentor.reports.unsubmitted'))
      } else {
        toast.error(result.error || t('mentor.reports.unsubmitFailed'))
      }
    } catch {
      toast.error(t('mentor.reports.unsubmitFailed'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGenerateAI = async () => {
    if (!report) return

    if (feedbacks.length === 0) {
      toast.error(t('mentor.reports.noFeedbacksToGenerate'))
      return
    }

    setAiReport('')
    sseErrorRef.current = false
    await sse.start(`/api/mentor/reports/${report.id}/generate-ai`)
  }

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { className: string; label: string }> = {
      draft: {
        className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
        label: t('mentor.reports.statusDraft'),
      },
      submitted: {
        className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
        label: t('mentor.reports.statusSubmitted'),
      },
      confirmed: {
        className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
        label: t('mentor.reports.statusConfirmed'),
      },
      rejected: {
        className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
        label: t('mentor.reports.statusRejected'),
      },
    }

    const config = statusConfig[status] || {
      className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
      label: status,
    }

    return (
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className}`}>
        {config.label}
      </span>
    )
  }

  const isEditable = report?.status === 'draft' || report?.status === 'rejected'

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push(`/projects/${projectId}`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{t('mentor.reports.title')}</h1>
            <p className="text-muted-foreground">{t('mentor.reports.description')}</p>
          </div>
        </div>
        {report && getStatusBadge(report.status)}
      </div>

      {/* 반려 사유 */}
      {report?.status === 'rejected' && report.rejection_reason && (
        <Card className="border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950">
          <CardContent className="flex items-start gap-3 pt-6">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
            <div>
              <p className="text-sm font-semibold text-red-800 dark:text-red-300">
                {t('mentor.reports.rejectionReasonTitle')}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-red-700 dark:text-red-400">
                {report.rejection_reason}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 단계별 멘토 피드백 (보고서 기초 자료) */}
      <Card>
        <CardHeader className="cursor-pointer" onClick={() => setFeedbackExpanded(!feedbackExpanded)}>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              {t('mentor.reports.stageFeedbacks')}
              <Badge variant="secondary">{feedbacks.length}{t('mentor.reports.feedbackCount')}</Badge>
            </CardTitle>
            {feedbackExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </CardHeader>
        {feedbackExpanded && (
          <CardContent>
            {feedbacks.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                {t('mentor.reports.noFeedbacks')}
              </p>
            ) : (
              <div className="space-y-4">
                {STAGE_ORDER.map((stage) => {
                  const stageFbs = feedbacksByStage[stage]
                  if (!stageFbs || stageFbs.length === 0) return null
                  return (
                    <div key={stage}>
                      <h4 className="mb-2 text-sm font-semibold text-muted-foreground">
                        {stageLabels[stage] || stage}
                      </h4>
                      <div className="space-y-2 pl-3 border-l-2 border-blue-200 dark:border-blue-800">
                        {stageFbs.map((fb) => (
                          <div key={fb.id} className="rounded-lg bg-muted/30 p-3">
                            <div className="mb-1 flex items-center gap-2">
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${feedbackTypeBadgeClass[fb.feedback_type] || ''}`}>
                                {feedbackTypeLabels[fb.feedback_type] || fb.feedback_type}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(fb.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="whitespace-pre-wrap text-sm">{fb.comment}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* 종합 평점 + AI 보고서 */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: 평점 + 액션 */}
        <div className="space-y-6">
          {/* Overall Rating */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('mentor.reports.overallRating')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => isEditable && setOverallRating(star)}
                      onMouseEnter={() => isEditable && setHoveredStar(star)}
                      onMouseLeave={() => setHoveredStar(0)}
                      disabled={!isEditable}
                      className="p-0.5 transition-colors disabled:cursor-not-allowed"
                    >
                      <Star
                        className={`h-8 w-8 ${
                          star <= (hoveredStar || overallRating)
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300 dark:text-gray-600'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <p className="text-lg font-semibold text-muted-foreground">
                  {overallRating} / 5
                </p>
                {isEditable && (
                  <Button variant="outline" size="sm" onClick={handleSaveRating}>
                    <Save className="mr-2 h-3 w-3" />
                    {t('mentor.reports.saveRating')}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardContent className="flex flex-col gap-3 pt-6">
              <Button
                onClick={handleGenerateAI}
                disabled={isGeneratingAI || !isEditable}
                className="w-full"
                variant={displayReport ? 'outline' : 'default'}
              >
                {isGeneratingAI ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    {t('mentor.reports.generating')}
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    {displayReport ? t('mentor.reports.regenerateAI') : t('mentor.reports.generateAI')}
                  </>
                )}
              </Button>

              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || !isEditable || !displayReport}
                className="w-full"
              >
                {isSubmitting ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    {t('mentor.reports.submitting')}
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    {t('mentor.reports.submit')}
                  </>
                )}
              </Button>

              {report?.status === 'submitted' && (
                <>
                  <Button
                    onClick={handleUnsubmit}
                    disabled={isSubmitting}
                    variant="outline"
                    className="w-full"
                  >
                    <Undo2 className="mr-2 h-4 w-4" />
                    {t('mentor.reports.unsubmit')}
                  </Button>
                  <p className="text-center text-sm text-muted-foreground">
                    {t('mentor.reports.submittedNote')}
                  </p>
                </>
              )}
              {report?.status === 'confirmed' && (
                <Badge variant="outline" className="mx-auto border-green-500 text-green-600 dark:text-green-400">
                  {t('mentor.reports.confirmedNote')}
                </Badge>
              )}
              {report?.status === 'rejected' && (
                <p className="text-center text-sm text-red-600 dark:text-red-400">
                  {t('mentor.reports.rejectedNote')}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: AI Report (2/3 width) */}
        <div className="lg:col-span-2">
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Sparkles className="h-5 w-5 text-purple-500" />
                {t('mentor.reports.aiReport')}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {t('mentor.reports.aiReportHint')}
              </p>
            </CardHeader>
            <CardContent>
              <div
                ref={aiReportRef}
                className="min-h-[400px] max-h-[600px] overflow-y-auto rounded-md border bg-muted/50 p-4 dark:bg-muted/20"
              >
                {displayReport ? (
                  <MarkdownContent content={displayReport} />
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <Sparkles className="mb-4 h-12 w-12 opacity-30" />
                    <p className="text-center">
                      {t('mentor.reports.aiReportPlaceholder')}
                    </p>
                    {feedbacks.length > 0 && isEditable && (
                      <Button
                        variant="outline"
                        className="mt-4"
                        onClick={handleGenerateAI}
                        disabled={isGeneratingAI}
                      >
                        <Sparkles className="mr-2 h-4 w-4" />
                        {t('mentor.reports.generateAI')}
                      </Button>
                    )}
                  </div>
                )}
              </div>
              {isGeneratingAI && (
                <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <LoadingSpinner size="sm" />
                  {t('mentor.reports.aiStreaming')}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
