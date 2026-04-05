'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Coins, ArrowUp, ArrowDown } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/common/loading-spinner'
import { Pagination } from '@/components/common/pagination'
import { toast } from 'sonner'

interface CreditLog {
  id: string
  amount: number
  balance_after: number
  reason: string
  project_id: string | null
  created_by: string | null
  created_at: string
  created_by_name: string | null
  project_name: string | null
}

interface HistoryResponse {
  logs: CreditLog[]
  total: number
  page: number
  limit: number
  totalPages: number
}

const REASON_I18N_MAP: Record<string, string> = {
  admin_recharge: 'reasonAdminRecharge',
  ai_idea_expand: 'reasonAiIdeaExpand',
  ai_idea_enhance: 'reasonAiIdeaEnhance',
  ai_similar_companies: 'reasonAiSimilarCompanies',
  ai_mentor_review: 'reasonAiMentorReview',
  ai_evaluation: 'reasonAiEvaluation',
  ai_evaluation_retry: 'reasonAiEvaluationRetry',
  ai_doc_business_plan: 'reasonAiDocBusinessPlan',
  ai_doc_pitch: 'reasonAiDocPitch',
  ai_doc_landing: 'reasonAiDocLanding',
  ai_doc_ppt: 'reasonAiDocPpt',
  ai_doc_ppt_image: 'reasonAiDocPptImage',
  ai_doc_leaflet: 'reasonAiDocLeaflet',
  ai_doc_infographic: 'reasonAiDocInfographic',
  ai_doc_startup_application: 'reasonAiDocStartupApplication',
  ai_doc_revise: 'reasonAiDocRevise',
  ai_review_analyze: 'reasonAiReviewAnalyze',
  ai_diagnosis: 'reasonAiDiagnosis',
  ai_strategy: 'reasonAiStrategy',
  ai_report: 'reasonAiReport',
}

export default function CreditsPage() {
  const t = useTranslations('credits.history')
  const [credits, setCredits] = useState<number | null>(null)
  const [historyData, setHistoryData] = useState<HistoryResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)

  const fetchHistory = useCallback(async (p: number) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/credits/history?page=${p}&limit=20`)
      const result = await response.json()

      if (result.success) {
        setHistoryData(result.data)
      } else {
        toast.error(t('fetchFailed'))
      }
    } catch {
      toast.error(t('fetchFailed'))
    } finally {
      setIsLoading(false)
    }
  }, [t])

  useEffect(() => {
    fetch('/api/credits')
      .then(res => res.json())
      .then(result => {
        if (result.success) {
          setCredits(result.data.credits)
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetchHistory(page)
  }, [page, fetchHistory])

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getReasonLabel = (reason: string) => {
    const key = REASON_I18N_MAP[reason]
    if (key) {
      return t(key)
    }
    return t('reasonUnknown')
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-3xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground">{t('description')}</p>
      </div>

      {/* 잔액 카드 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {t('currentBalance')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Coins className="h-6 w-6 text-amber-500" />
            <span className="text-3xl font-bold">
              {credits !== null ? credits : '—'}
            </span>
            <span className="text-lg text-muted-foreground">{t('credits')}</span>
          </div>
        </CardContent>
      </Card>

      {/* 사용 내역 리스트 */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : historyData && historyData.logs.length > 0 ? (
        <div className="space-y-4">
          {historyData.total > 0 && (
            <p className="text-sm text-muted-foreground">
              {t('totalCount', { count: historyData.total })}
            </p>
          )}

          <div className="space-y-2">
            {historyData.logs.map((log) => (
              <Card key={log.id}>
                <CardContent className="flex items-start gap-3 px-4 py-3">
                  {/* 아이콘 */}
                  <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                    log.amount > 0
                      ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                  }`}>
                    {log.amount > 0 ? (
                      <ArrowUp className="h-3.5 w-3.5" />
                    ) : (
                      <ArrowDown className="h-3.5 w-3.5" />
                    )}
                  </div>

                  {/* 내용 */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium truncate">
                        {getReasonLabel(log.reason)}
                      </p>
                      <span className={`shrink-0 text-sm font-bold ${
                        log.amount > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                      }`}>
                        {log.amount > 0 ? '+' : ''}{log.amount}
                      </span>
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                      <span>{formatDate(log.created_at)}</span>
                      <span>{t('balance')}: {log.balance_after}</span>
                      {log.project_name && (
                        <span className="truncate">{t('project')}: {log.project_name}</span>
                      )}
                      {log.created_by_name && log.amount > 0 && (
                        <span>{t('chargedBy')}: {log.created_by_name}</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* 페이지네이션 */}
          {historyData.totalPages > 1 && (
            <Pagination
              currentPage={page}
              totalPages={historyData.totalPages}
              onPageChange={handlePageChange}
              className="mt-4"
            />
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Coins className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium">{t('noHistory')}</p>
            <p className="text-xs text-muted-foreground mt-1">{t('noHistoryDesc')}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
