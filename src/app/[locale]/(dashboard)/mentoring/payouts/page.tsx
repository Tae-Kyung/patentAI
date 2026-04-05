'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { DollarSign, RefreshCw, FolderKanban } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { LoadingSpinner } from '@/components/common/loading-spinner'
import { Pagination } from '@/components/common/pagination'
import { toast } from 'sonner'
import { usePaginatedFetch } from '@/hooks/usePaginatedFetch'

interface MentoringProject {
  matchId: string
  projectId: string
  projectName: string
  unitPrice: number
  status: string
  role: string
}

interface PayoutSummary {
  totalAmount: number
  paidAmount: number
  pendingAmount: number
  totalCount: number
  paidCount: number
  pendingCount: number
  mentoringProjects: MentoringProject[]
}

interface PayoutItem {
  id: string
  report_id: string
  project_name: string | null
  amount: number
  total_sessions: number
  total_hours: number
  status: 'pending' | 'approved' | 'processing' | 'paid' | 'cancelled'
  created_at: string
  updated_at: string
}

type StatusFilter = 'all' | 'pending' | 'approved' | 'processing' | 'paid' | 'cancelled'

function formatKRW(amount: number): string {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    maximumFractionDigits: 0,
  }).format(amount)
}

export default function MentorPayoutsPage() {
  const t = useTranslations()

  const [summary, setSummary] = useState<PayoutSummary | null>(null)
  const [isLoadingSummary, setIsLoadingSummary] = useState(true)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  const fetchParams = useMemo(() => {
    const p: Record<string, string> = {}
    if (statusFilter !== 'all') p.status = statusFilter
    return p
  }, [statusFilter])

  const {
    data: payouts,
    pagination,
    isLoading: isLoadingList,
    currentPage,
    setCurrentPage,
    refetch: refetchPayouts,
  } = usePaginatedFetch<PayoutItem>({
    url: '/api/mentor/payouts',
    params: fetchParams,
  })

  const fetchSummary = useCallback(async () => {
    setIsLoadingSummary(true)
    try {
      const response = await fetch('/api/mentor/payouts/summary')
      const result = await response.json()

      if (result.success) {
        setSummary(result.data)
      } else {
        toast.error(t('mentor.payouts.fetchSummaryFailed'))
      }
    } catch {
      toast.error(t('mentor.payouts.fetchSummaryFailed'))
    } finally {
      setIsLoadingSummary(false)
    }
  }, [t])

  useEffect(() => {
    fetchSummary()
  }, [fetchSummary])

  const handleRefresh = () => {
    fetchSummary()
    refetchPayouts()
  }

  const getPayoutStatusBadge = (status: string) => {
    const statusConfig: Record<string, { className: string; label: string }> = {
      pending: {
        className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
        label: t('mentor.payouts.statusPending'),
      },
      approved: {
        className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
        label: t('mentor.payouts.statusApproved'),
      },
      processing: {
        className: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
        label: t('mentor.payouts.statusProcessing'),
      },
      paid: {
        className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
        label: t('mentor.payouts.statusPaid'),
      },
      cancelled: {
        className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
        label: t('mentor.payouts.statusCancelled'),
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

  const getMatchStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      assigned: t('mentor.payouts.statusAssigned'),
      in_progress: t('mentor.payouts.statusInProgress'),
      review: t('mentor.payouts.statusReview'),
      completed: t('mentor.payouts.statusCompleted'),
    }
    return labels[status] || status
  }

  const getMatchStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      assigned: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      in_progress: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      review: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    }
    return colors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('mentor.payouts.title')}</h1>
          <p className="text-muted-foreground">{t('mentor.payouts.description')}</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh}>
          <RefreshCw className="mr-2 h-4 w-4" />
          {t('mentor.payouts.refresh')}
        </Button>
      </div>

      {/* Summary Cards - 3 columns */}
      {isLoadingSummary ? (
        <div className="flex justify-center py-8">
          <LoadingSpinner size="md" />
        </div>
      ) : summary ? (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t('mentor.payouts.totalAmount')}
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatKRW(summary.totalAmount)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {summary.totalCount}{t('mentor.payouts.payoutCount')}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t('mentor.payouts.paidAmount')}
                </CardTitle>
                <DollarSign className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {formatKRW(summary.paidAmount)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('mentor.payouts.paidCountLabel', { count: summary.paidCount })}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t('mentor.payouts.pendingAmount')}
                </CardTitle>
                <DollarSign className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {formatKRW(summary.pendingAmount)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('mentor.payouts.pendingCountLabel', { count: summary.pendingCount })}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Mentoring Projects List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderKanban className="h-5 w-5" />
                {t('mentor.payouts.mentoringProjects')}
              </CardTitle>
              <CardDescription>{t('mentor.payouts.mentoringProjectsDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              {summary.mentoringProjects.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  {t('mentor.payouts.noProjects')}
                </p>
              ) : (
                <div className="space-y-3">
                  {summary.mentoringProjects.map((project) => (
                    <div
                      key={project.matchId}
                      className="flex items-center justify-between rounded-lg border p-4 dark:border-gray-700"
                    >
                      <div className="flex flex-col gap-1">
                        <p className="font-medium">{project.projectName}</p>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {project.role === 'primary'
                              ? t('mentor.payouts.rolePrimary')
                              : t('mentor.payouts.roleSecondary')}
                          </Badge>
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getMatchStatusColor(project.status)}`}>
                            {getMatchStatusLabel(project.status)}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold">{formatKRW(project.unitPrice)}</p>
                        <p className="text-xs text-muted-foreground">{t('mentor.payouts.perSession')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}

      {/* Payout History */}
      <div className="flex items-center gap-4">
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t('mentor.payouts.filterAll')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('mentor.payouts.filterAll')}</SelectItem>
            <SelectItem value="pending">{t('mentor.payouts.statusPending')}</SelectItem>
            <SelectItem value="approved">{t('mentor.payouts.statusApproved')}</SelectItem>
            <SelectItem value="processing">{t('mentor.payouts.statusProcessing')}</SelectItem>
            <SelectItem value="paid">{t('mentor.payouts.statusPaid')}</SelectItem>
            <SelectItem value="cancelled">{t('mentor.payouts.statusCancelled')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoadingList ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : payouts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <DollarSign className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-semibold">{t('mentor.payouts.noPayouts')}</h3>
            <p className="text-sm text-muted-foreground">{t('mentor.payouts.noPayoutsDesc')}</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 dark:bg-muted/20">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                      {t('mentor.payouts.columnProject')}
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                      {t('mentor.payouts.columnAmount')}
                    </th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                      {t('mentor.payouts.columnSessions')}
                    </th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                      {t('mentor.payouts.columnHours')}
                    </th>
                    <th className="px-4 py-3 text-center font-medium text-muted-foreground">
                      {t('mentor.payouts.columnStatus')}
                    </th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                      {t('mentor.payouts.columnDate')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {payouts.map((payout) => (
                    <tr
                      key={payout.id}
                      className="border-b transition-colors last:border-b-0 hover:bg-muted/50 dark:hover:bg-muted/20"
                    >
                      <td className="px-4 py-3 text-sm font-medium">
                        {payout.project_name || payout.report_id.slice(0, 8) + '...'}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">
                        {formatKRW(payout.amount)}
                      </td>
                      <td className="px-4 py-3 text-center">{payout.total_sessions || 0}</td>
                      <td className="px-4 py-3 text-center">{payout.total_hours || 0}h</td>
                      <td className="px-4 py-3 text-center">{getPayoutStatusBadge(payout.status)}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        {new Date(payout.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {pagination && pagination.totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={pagination.totalPages}
          onPageChange={setCurrentPage}
          className="mt-4"
        />
      )}
    </div>
  )
}
