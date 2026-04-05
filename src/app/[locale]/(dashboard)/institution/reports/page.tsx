'use client'

import { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { usePaginatedFetch } from '@/hooks/usePaginatedFetch'
import {
  FileText,
  RefreshCw,
  CheckCircle,
  XCircle,
  Star,
  Eye,
  CalendarCheck,
  Clock,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { LoadingSpinner } from '@/components/common/loading-spinner'
import { Pagination } from '@/components/common/pagination'
import { MarkdownContent } from '@/components/common/markdown-content'
import { toast } from 'sonner'

function stripMarkdown(text: string): string {
  return text
    .replace(/^#{1,6}\s+/gm, '')   // headings
    .replace(/\*\*(.+?)\*\*/g, '$1') // bold
    .replace(/\*(.+?)\*/g, '$1')     // italic
    .replace(/`(.+?)`/g, '$1')       // inline code
    .replace(/^[-*]\s+/gm, '')       // list items
    .replace(/^\d+\.\s+/gm, '')      // ordered list
    .replace(/^>\s+/gm, '')          // blockquote
    .replace(/^---+$/gm, '')         // hr
    .replace(/\n{2,}/g, ' ')         // multiple newlines → space
    .trim()
}

interface SessionInfo {
  id: string
  round_number: number
  session_type: string
  session_date: string | null
  duration_minutes: number | null
  status: string
  comments: unknown
}

interface MentoringReport {
  id: string
  match_id: string
  mentor_opinion: string | null
  strengths: string | null
  improvements: string | null
  overall_rating: number | null
  ai_generated_report: string | null
  ai_summary: string | null
  status: 'draft' | 'submitted' | 'confirmed' | 'rejected'
  submitted_at: string | null
  confirmed_at: string | null
  rejection_reason: string | null
  created_at: string
  updated_at: string
  match: {
    id: string
    mentor_id: string
    project_id: string
    mentor: { id: string; name: string | null } | null
    project: { id: string; name: string } | null
  } | null
  sessions: SessionInfo[]
}

export default function InstitutionReportsPage() {
  const t = useTranslations()

  const [statusFilter, setStatusFilter] = useState('all')

  const fetchParams = useMemo(() => {
    const p: Record<string, string> = {}
    if (statusFilter !== 'all') p.status = statusFilter
    return p
  }, [statusFilter])

  const {
    data: reports,
    pagination,
    isLoading,
    currentPage,
    setCurrentPage,
    refetch,
  } = usePaginatedFetch<MentoringReport>({
    url: '/api/institution/reports',
    params: fetchParams,
    dataKey: 'items',
  })

  // Report detail dialog
  const [selectedReport, setSelectedReport] = useState<MentoringReport | null>(null)
  const [isDetailLoading, setIsDetailLoading] = useState(false)

  const handleViewReport = async (report: MentoringReport) => {
    setSelectedReport(report)
    setIsDetailLoading(true)
    try {
      const res = await fetch(`/api/institution/reports/${report.id}`)
      const result = await res.json()
      if (result.success) {
        setSelectedReport(result.data)
      }
    } catch {
      // 목록 데이터로 fallback
    } finally {
      setIsDetailLoading(false)
    }
  }

  // Reject modal state
  const [rejectTarget, setRejectTarget] = useState<MentoringReport | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  const handleConfirm = async (report: MentoringReport) => {
    setIsProcessing(true)
    try {
      const response = await fetch(`/api/institution/reports/${report.id}/confirm`, {
        method: 'POST',
      })
      const result = await response.json()

      if (result.success) {
        toast.success(t('institution.reports.confirmSuccess'))
        refetch()
        if (selectedReport?.id === report.id) {
          setSelectedReport({ ...selectedReport, status: 'confirmed' })
        }
      } else {
        toast.error(result.error || t('institution.reports.confirmFailed'))
      }
    } catch {
      toast.error(t('institution.reports.confirmFailed'))
    } finally {
      setIsProcessing(false)
    }
  }

  const handleReject = async () => {
    if (!rejectTarget || !rejectReason.trim()) return

    setIsProcessing(true)
    try {
      const response = await fetch(`/api/institution/reports/${rejectTarget.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason }),
      })
      const result = await response.json()

      if (result.success) {
        toast.success(t('institution.reports.rejectSuccess'))
        setRejectTarget(null)
        setRejectReason('')
        refetch()
        if (selectedReport?.id === rejectTarget.id) {
          setSelectedReport({ ...selectedReport, status: 'rejected', rejection_reason: rejectReason })
        }
      } else {
        toast.error(result.error || t('institution.reports.rejectFailed'))
      }
    } catch {
      toast.error(t('institution.reports.rejectFailed'))
    } finally {
      setIsProcessing(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { className: string; label: string }> = {
      draft: {
        className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
        label: t('institution.reports.statusDraft'),
      },
      submitted: {
        className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
        label: t('institution.reports.statusSubmitted'),
      },
      confirmed: {
        className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
        label: t('institution.reports.statusConfirmed'),
      },
      rejected: {
        className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
        label: t('institution.reports.statusRejected'),
      },
    }

    const config = statusConfig[status] || { className: '', label: status }
    return (
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className}`}>
        {config.label}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            {t('institution.reports.title')}
          </h1>
          <p className="text-muted-foreground">
            {t('institution.reports.description')}
          </p>
        </div>
        <Button variant="outline" onClick={refetch}>
          <RefreshCw className="mr-2 h-4 w-4" />
          {t('common.refresh')}
        </Button>
      </div>

      {/* Filter */}
      <Card>
        <CardContent className="flex items-center gap-4 py-4">
          <FileText className="h-5 w-5 text-muted-foreground" />
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {t('institution.reports.statusLabel')}
            </span>
            <Select
              value={statusFilter}
              onValueChange={setStatusFilter}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all')}</SelectItem>
                <SelectItem value="submitted">
                  {t('institution.reports.statusSubmitted')}
                </SelectItem>
                <SelectItem value="confirmed">
                  {t('institution.reports.statusConfirmed')}
                </SelectItem>
                <SelectItem value="rejected">
                  {t('institution.reports.statusRejected')}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Reports List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : reports.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg">
              {t('institution.reports.noReports')}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t('institution.reports.noReportsDesc')}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <Card key={report.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      {report.match?.mentor?.name || '-'}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {t('institution.reports.project')}: {report.match?.project?.name || '-'}
                    </p>
                  </div>
                  {getStatusBadge(report.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-3">
                    {report.overall_rating && (
                      <div>
                        <span className="text-muted-foreground">
                          {t('institution.reports.rating')}
                        </span>
                        <div className="mt-1 flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`h-4 w-4 ${
                                star <= report.overall_rating!
                                  ? 'fill-yellow-400 text-yellow-400'
                                  : 'text-gray-300 dark:text-gray-600'
                              }`}
                            />
                          ))}
                          <span className="ml-1 text-sm font-medium">{report.overall_rating}/5</span>
                        </div>
                      </div>
                    )}
                    {report.submitted_at && (
                      <div>
                        <span className="text-muted-foreground">
                          {t('institution.reports.submittedAt')}
                        </span>
                        <p className="font-medium">
                          {new Date(report.submitted_at).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                    <div>
                      <span className="text-muted-foreground">
                        {t('institution.reports.updatedAt')}
                      </span>
                      <p className="font-medium">
                        {new Date(report.updated_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* Session summary */}
                  {report.sessions && report.sessions.length > 0 && (
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <CalendarCheck className="h-4 w-4" />
                        {t('institution.reports.sessionCount', { count: report.sessions.length })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {t('institution.reports.totalMinutes', { minutes: report.sessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0) })}
                      </span>
                      <span>
                        {t('institution.reports.submittedSessions', { count: report.sessions.filter(s => s.status === 'submitted' || s.status === 'acknowledged').length })}
                        {' / '}
                        {report.sessions.length}
                      </span>
                    </div>
                  )}

                  {/* AI Summary preview */}
                  {report.ai_summary && (
                    <div className="rounded-lg bg-muted p-3">
                      <p className="text-sm line-clamp-3 text-muted-foreground">{stripMarkdown(report.ai_summary)}</p>
                    </div>
                  )}

                  {/* Rejection reason */}
                  {report.status === 'rejected' && report.rejection_reason && (
                    <div className="rounded-md border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950">
                      <p className="text-xs font-medium text-red-800 dark:text-red-300">{t('institution.reports.rejectionReason')}</p>
                      <p className="mt-1 text-sm text-red-700 dark:text-red-400">{report.rejection_reason}</p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    {/* View report button */}
                    {report.ai_generated_report && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewReport(report)}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        {t('institution.reports.viewReport')}
                      </Button>
                    )}

                    {report.status === 'submitted' && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleConfirm(report)}
                          disabled={isProcessing}
                        >
                          <CheckCircle className="mr-2 h-4 w-4" />
                          {t('institution.reports.confirm')}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            setRejectTarget(report)
                            setRejectReason('')
                          }}
                          disabled={isProcessing}
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          {t('institution.reports.reject')}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {pagination && pagination.totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={pagination.totalPages}
              onPageChange={setCurrentPage}
            />
          )}
        </div>
      )}

      {/* Report Detail Dialog */}
      <Dialog
        open={!!selectedReport}
        onOpenChange={(open) => {
          if (!open) setSelectedReport(null)
        }}
      >
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {t('institution.reports.reportDetail')}
            </DialogTitle>
            {selectedReport && (
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span>{selectedReport.match?.mentor?.name || '-'}</span>
                <span>|</span>
                <span>{selectedReport.match?.project?.name || '-'}</span>
                <span>|</span>
                {getStatusBadge(selectedReport.status)}
              </div>
            )}
          </DialogHeader>

          {selectedReport && (
            <>
              {/* Rating */}
              {selectedReport.overall_rating && (
                <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
                  <span className="text-sm text-muted-foreground">{t('institution.reports.rating')}:</span>
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-4 w-4 ${
                          star <= selectedReport.overall_rating!
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300 dark:text-gray-600'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm font-medium">{selectedReport.overall_rating}/5</span>
                </div>
              )}

              {/* Sessions */}
              {isDetailLoading ? (
                <div className="flex justify-center py-4">
                  <LoadingSpinner size="sm" />
                </div>
              ) : selectedReport.sessions && selectedReport.sessions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">{t('institution.reports.sessionsTitle')}</p>
                  <div className="space-y-1">
                    {selectedReport.sessions.map((session) => {
                      const commentsText = session.comments
                        ? typeof session.comments === 'string'
                          ? session.comments
                          : typeof session.comments === 'object' && session.comments !== null && 'text' in (session.comments as object)
                            ? String((session.comments as { text: unknown }).text)
                            : JSON.stringify(session.comments)
                        : null
                      return (
                        <div
                          key={session.id}
                          className="rounded-lg border px-3 py-2 text-sm"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="font-medium">
                                {session.round_number}{t('institution.reports.sessionRound')}
                              </span>
                              <Badge variant="outline" className="text-xs">{session.session_type}</Badge>
                              {session.session_date && (
                                <span className="text-muted-foreground">
                                  {new Date(session.session_date).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {session.duration_minutes && (
                                <span className="text-muted-foreground">
                                  {session.duration_minutes}{t('institution.reports.minutes')}
                                </span>
                              )}
                              <Badge
                                className={
                                  session.status === 'acknowledged'
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                    : session.status === 'submitted'
                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                    : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                                }
                              >
                                {session.status === 'acknowledged'
                                  ? t('institution.reports.sessionAcknowledged')
                                  : session.status === 'submitted'
                                  ? t('institution.reports.sessionSubmitted')
                                  : t('institution.reports.sessionDraft')}
                              </Badge>
                            </div>
                          </div>
                          {commentsText && (
                            <p className="mt-1.5 text-xs text-muted-foreground border-t pt-1.5">
                              <span className="font-medium text-foreground">{t('institution.reports.sessionComments')}: </span>
                              {commentsText}
                            </p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* 멘토 의견서 (mentor_opinion, strengths, improvements) */}
              {(selectedReport.mentor_opinion || selectedReport.strengths || selectedReport.improvements) && (
                <div className="space-y-3 rounded-lg border p-4">
                  <p className="text-sm font-medium">{t('institution.reports.mentorOpinionTitle')}</p>
                  {selectedReport.mentor_opinion && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">{t('institution.reports.mentorOpinion')}</p>
                      <p className="text-sm whitespace-pre-wrap">{selectedReport.mentor_opinion}</p>
                    </div>
                  )}
                  {selectedReport.strengths && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">{t('institution.reports.strengths')}</p>
                      <p className="text-sm whitespace-pre-wrap">{selectedReport.strengths}</p>
                    </div>
                  )}
                  {selectedReport.improvements && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">{t('institution.reports.improvements')}</p>
                      <p className="text-sm whitespace-pre-wrap">{selectedReport.improvements}</p>
                    </div>
                  )}
                </div>
              )}

              {/* AI Report Content */}
              {selectedReport.ai_generated_report ? (
                <div className="rounded-md border bg-muted/30 p-4 dark:bg-muted/10">
                  <MarkdownContent content={selectedReport.ai_generated_report} />
                </div>
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  {t('institution.reports.noReportContent')}
                </p>
              )}

              {/* Rejection reason */}
              {selectedReport.status === 'rejected' && selectedReport.rejection_reason && (
                <div className="rounded-md border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950">
                  <p className="text-xs font-medium text-red-800 dark:text-red-300">{t('institution.reports.rejectionReason')}</p>
                  <p className="mt-1 text-sm text-red-700 dark:text-red-400">{selectedReport.rejection_reason}</p>
                </div>
              )}

              {/* Actions for submitted reports */}
              {selectedReport.status === 'submitted' && (
                <DialogFooter>
                  <Button
                    onClick={() => handleConfirm(selectedReport)}
                    disabled={isProcessing}
                  >
                    {isProcessing ? <LoadingSpinner size="sm" className="mr-2" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                    {t('institution.reports.confirm')}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      setRejectTarget(selectedReport)
                      setRejectReason('')
                    }}
                    disabled={isProcessing}
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    {t('institution.reports.reject')}
                  </Button>
                </DialogFooter>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Modal */}
      <Dialog
        open={!!rejectTarget}
        onOpenChange={() => {
          setRejectTarget(null)
          setRejectReason('')
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t('institution.reports.rejectTitle')}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reject-reason">
                {t('institution.reports.rejectReasonLabel')}
              </Label>
              <Textarea
                id="reject-reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder={t('institution.reports.rejectReasonPlaceholder')}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectTarget(null)
                setRejectReason('')
              }}
              disabled={isProcessing}
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={isProcessing || !rejectReason.trim()}
            >
              {isProcessing ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  {t('common.processing')}
                </>
              ) : (
                <>
                  <XCircle className="mr-2 h-4 w-4" />
                  {t('institution.reports.reject')}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
