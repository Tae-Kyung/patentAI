'use client'

import { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import {
  FolderOpen,
  RefreshCw,
  Users,
  ChevronDown,
  ChevronRight,
  Filter,
  FileText,
  Star,
  CheckCircle,
  XCircle,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/common/loading-spinner'
import { Pagination } from '@/components/common/pagination'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MarkdownContent } from '@/components/common/markdown-content'
import { toast } from 'sonner'
import { usePaginatedFetch } from '@/hooks/usePaginatedFetch'

interface ProjectUser {
  id: string
  name: string | null
  email: string
}

interface MatchReport {
  id: string
  status: string
  overall_rating: number | null
  submitted_at: string | null
}

interface ProjectMentor {
  id: string
  mentor_id: string
  mentor_role: string
  mentor: { id: string; name: string | null; email: string } | null
  profile: { specialty: string[]; career_summary: string | null } | null
  report: MatchReport | null
}

interface Project {
  id: string
  name: string
  current_stage: string
  status: string
  created_at: string
  user: ProjectUser
  mentor_count: number
}

interface ReportDetail {
  id: string
  ai_generated_report: string | null
  overall_rating: number | null
  status: string
  submitted_at: string | null
  confirmed_at: string | null
  rejection_reason: string | null
  match: {
    mentor: { id: string; name: string | null; email: string } | null
    project: { id: string; name: string } | null
  }
}

export default function InstitutionProjectsPage() {
  const t = useTranslations()

  const [statusFilter, setStatusFilter] = useState('all')
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set())
  const [mentorsMap, setMentorsMap] = useState<Record<string, ProjectMentor[]>>({})
  const [loadingMentors, setLoadingMentors] = useState<Set<string>>(new Set())

  // Report dialog state
  const [reportDetail, setReportDetail] = useState<ReportDetail | null>(null)
  const [isLoadingReport, setIsLoadingReport] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [rejectMode, setRejectMode] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  const fetchParams = useMemo(() => {
    const p: Record<string, string> = {}
    if (statusFilter !== 'all') p.status = statusFilter
    return p
  }, [statusFilter])

  const {
    data: projects,
    pagination,
    isLoading,
    currentPage,
    setCurrentPage,
    refetch,
  } = usePaginatedFetch<Project>({
    url: '/api/institution/projects',
    params: fetchParams,
    dataKey: 'items',
  })

  const fetchMentors = async (projectId: string) => {
    if (mentorsMap[projectId]) return

    setLoadingMentors((prev) => new Set(prev).add(projectId))
    try {
      const response = await fetch(`/api/institution/projects/${projectId}/mentors`)
      const result = await response.json()

      if (result.success) {
        setMentorsMap((prev) => ({ ...prev, [projectId]: result.data }))
      } else {
        toast.error(t('institution.projects.mentorsFetchFailed'))
      }
    } catch {
      toast.error(t('institution.projects.mentorsFetchFailed'))
    } finally {
      setLoadingMentors((prev) => {
        const next = new Set(prev)
        next.delete(projectId)
        return next
      })
    }
  }

  const toggleExpanded = (projectId: string) => {
    setExpandedProjects((prev) => {
      const next = new Set(prev)
      if (next.has(projectId)) {
        next.delete(projectId)
      } else {
        next.add(projectId)
        fetchMentors(projectId)
      }
      return next
    })
  }

  const openReport = async (reportId: string) => {
    setIsLoadingReport(true)
    setReportDetail(null)
    setRejectMode(false)
    setRejectReason('')
    try {
      const response = await fetch(`/api/institution/reports/${reportId}`)
      const result = await response.json()
      if (result.success) {
        setReportDetail(result.data)
      } else {
        toast.error(t('institution.projects.reportFetchFailed'))
      }
    } catch {
      toast.error(t('institution.projects.reportFetchFailed'))
    } finally {
      setIsLoadingReport(false)
    }
  }

  const handleConfirm = async () => {
    if (!reportDetail) return
    setIsProcessing(true)
    try {
      const response = await fetch(`/api/institution/reports/${reportDetail.id}/confirm`, {
        method: 'POST',
      })
      const result = await response.json()
      if (result.success) {
        toast.success(t('institution.reports.confirmSuccess'))
        setReportDetail({ ...reportDetail, status: 'confirmed' })
        // 멘토 목록 캐시 초기화
        setMentorsMap({})
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
    if (!reportDetail || !rejectReason.trim()) return
    setIsProcessing(true)
    try {
      const response = await fetch(`/api/institution/reports/${reportDetail.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason }),
      })
      const result = await response.json()
      if (result.success) {
        toast.success(t('institution.reports.rejectSuccess'))
        setReportDetail({ ...reportDetail, status: 'rejected', rejection_reason: rejectReason })
        setRejectMode(false)
        setMentorsMap({})
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
    const statusConfig: Record<string, { variant: 'default' | 'secondary' | 'outline' | 'destructive'; label: string }> = {
      pending: { variant: 'secondary', label: t('institution.projects.statusPending') },
      approved: { variant: 'default', label: t('institution.projects.statusApproved') },
      rejected: { variant: 'destructive', label: t('institution.projects.statusRejected') },
      completed: { variant: 'outline', label: t('institution.projects.statusCompleted') },
    }
    const config = statusConfig[status] || { variant: 'outline' as const, label: status }
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const getStageBadge = (stage: string) => {
    const stageLabels: Record<string, string> = {
      idea: t('institution.projects.stageIdea'),
      evaluation: t('institution.projects.stageEvaluation'),
      document: t('institution.projects.stageDocument'),
      deploy: t('institution.projects.stageDeploy'),
      done: t('institution.projects.stageDone'),
    }
    const stageColors: Record<string, string> = {
      idea: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      evaluation: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      document: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      deploy: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      done: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    }
    return (
      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${stageColors[stage] || ''}`}>
        {stageLabels[stage] || stage}
      </span>
    )
  }

  const getReportStatusBadge = (status: string) => {
    const config: Record<string, { className: string; label: string }> = {
      draft: { className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200', label: t('institution.projects.reportDraft') },
      submitted: { className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200', label: t('institution.projects.reportSubmitted') },
      confirmed: { className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200', label: t('institution.projects.reportConfirmed') },
      rejected: { className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200', label: t('institution.projects.reportRejected') },
    }
    const c = config[status] || { className: '', label: status }
    return (
      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${c.className}`}>
        {c.label}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('institution.projects.title')}</h1>
          <p className="text-muted-foreground">
            {t('institution.projects.description')}
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
          <Filter className="h-5 w-5 text-muted-foreground" />
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {t('institution.projects.statusLabel')}
            </span>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all')}</SelectItem>
                <SelectItem value="pending">{t('institution.projects.statusPending')}</SelectItem>
                <SelectItem value="approved">{t('institution.projects.statusApproved')}</SelectItem>
                <SelectItem value="rejected">{t('institution.projects.statusRejected')}</SelectItem>
                <SelectItem value="completed">{t('institution.projects.statusCompleted')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Project List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : projects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FolderOpen className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-semibold">{t('institution.projects.noProjects')}</h3>
            <p className="text-sm text-muted-foreground">
              {t('institution.projects.noProjectsDesc')}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {/* Table Header (desktop) */}
          <div className="hidden rounded-lg bg-muted px-4 py-3 text-sm font-medium text-muted-foreground md:grid md:grid-cols-12 md:gap-4">
            <div className="col-span-1" />
            <div className="col-span-2">{t('institution.projects.projectName')}</div>
            <div className="col-span-1 text-center">{t('institution.projects.mentorCount')}</div>
            <div className="col-span-2">{t('institution.projects.userName')}</div>
            <div className="col-span-2">{t('institution.projects.stage')}</div>
            <div className="col-span-2">{t('institution.projects.status')}</div>
            <div className="col-span-2">{t('institution.projects.createdAt')}</div>
          </div>

          {projects.map((project) => {
            const isExpanded = expandedProjects.has(project.id)
            const mentors = mentorsMap[project.id]
            const isMentorsLoading = loadingMentors.has(project.id)

            return (
              <Card key={project.id}>
                <CardContent className="p-0">
                  {/* Project Row */}
                  <button
                    className="flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-accent/50 md:grid md:grid-cols-12"
                    onClick={() => toggleExpanded(project.id)}
                  >
                    <div className="col-span-1 flex items-center">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="col-span-2 min-w-0">
                      <p className="truncate text-sm font-medium">{project.name}</p>
                      <p className="truncate text-xs text-muted-foreground md:hidden">
                        {project.user.name || project.user.email}
                      </p>
                    </div>
                    <div className="col-span-1 hidden md:flex items-center justify-center">
                      <Badge variant="secondary" className="text-xs">
                        {project.mentor_count}
                      </Badge>
                    </div>
                    <div className="col-span-2 hidden min-w-0 md:block">
                      <p className="truncate text-sm">{project.user.name || '-'}</p>
                      <p className="truncate text-xs text-muted-foreground">{project.user.email}</p>
                    </div>
                    <div className="col-span-2">
                      {getStageBadge(project.current_stage)}
                    </div>
                    <div className="col-span-2">
                      {getStatusBadge(project.status)}
                    </div>
                    <div className="col-span-2 hidden md:block">
                      <span className="text-sm text-muted-foreground">
                        {new Date(project.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </button>

                  {/* Expanded Mentors Panel */}
                  {isExpanded && (
                    <div className="border-t bg-muted/30 px-4 py-3">
                      <div className="mb-2 flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <p className="text-xs font-medium text-muted-foreground">
                          {t('institution.projects.assignedMentors')}
                        </p>
                      </div>

                      {isMentorsLoading ? (
                        <div className="flex items-center justify-center py-4">
                          <LoadingSpinner size="sm" />
                        </div>
                      ) : mentors && mentors.length > 0 ? (
                        <div className="space-y-2">
                          {mentors.map((match) => (
                            <div
                              key={match.id}
                              className="flex items-center justify-between rounded-lg bg-background px-3 py-2"
                            >
                              <div className="flex items-center gap-3">
                                <Users className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <p className="text-sm font-medium">
                                    {match.mentor?.name || '-'}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {match.mentor?.email}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {match.report ? (
                                  <>
                                    {getReportStatusBadge(match.report.status)}
                                    {(match.report.status === 'submitted' || match.report.status === 'confirmed' || match.report.status === 'rejected') && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          openReport(match.report!.id)
                                        }}
                                      >
                                        <FileText className="mr-1 h-3 w-3" />
                                        {t('institution.projects.viewReport')}
                                      </Button>
                                    )}
                                  </>
                                ) : (
                                  <Badge variant="outline">{match.mentor_role}</Badge>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="py-2 text-sm text-muted-foreground">
                          {t('institution.projects.noMentors')}
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}

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
        open={!!reportDetail || isLoadingReport}
        onOpenChange={(open) => {
          if (!open) {
            setReportDetail(null)
            setRejectMode(false)
            setRejectReason('')
          }
        }}
      >
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {t('institution.projects.reportTitle')}
            </DialogTitle>
            {reportDetail && (
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span>{t('institution.projects.mentorLabel')}: {reportDetail.match.mentor?.name || '-'}</span>
                <span>|</span>
                <span>{t('institution.projects.projectLabel')}: {reportDetail.match.project?.name || '-'}</span>
                <span>|</span>
                {getReportStatusBadge(reportDetail.status)}
              </div>
            )}
          </DialogHeader>
          {isLoadingReport ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : reportDetail ? (
            <>
              {/* Rating */}
              {reportDetail.overall_rating && (
                <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
                  <span className="text-sm text-muted-foreground">{t('institution.projects.overallRating')}:</span>
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-4 w-4 ${
                          star <= reportDetail.overall_rating!
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300 dark:text-gray-600'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-sm font-medium">{reportDetail.overall_rating}/5</span>
                </div>
              )}

              {/* AI Report Content */}
              {reportDetail.ai_generated_report ? (
                <div className="rounded-md border bg-muted/30 p-4 dark:bg-muted/10">
                  <MarkdownContent content={reportDetail.ai_generated_report} />
                </div>
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  {t('institution.projects.noReportContent')}
                </p>
              )}

              {/* Rejection reason */}
              {reportDetail.status === 'rejected' && reportDetail.rejection_reason && (
                <div className="rounded-md border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950">
                  <p className="text-xs font-medium text-red-800 dark:text-red-300">{t('institution.projects.rejectionReason')}</p>
                  <p className="mt-1 text-sm text-red-700 dark:text-red-400">{reportDetail.rejection_reason}</p>
                </div>
              )}

              {/* Reject form */}
              {rejectMode && (
                <div className="space-y-3 rounded-md border p-3">
                  <Label htmlFor="reject-reason">{t('institution.reports.rejectReasonLabel')}</Label>
                  <Textarea
                    id="reject-reason"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder={t('institution.reports.rejectReasonPlaceholder')}
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleReject}
                      disabled={isProcessing || !rejectReason.trim()}
                    >
                      {isProcessing ? <LoadingSpinner size="sm" className="mr-2" /> : <XCircle className="mr-1 h-3 w-3" />}
                      {t('institution.reports.reject')}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setRejectMode(false)}>
                      {t('common.cancel')}
                    </Button>
                  </div>
                </div>
              )}

              {/* Actions for submitted reports */}
              {reportDetail.status === 'submitted' && !rejectMode && (
                <DialogFooter>
                  <Button
                    onClick={handleConfirm}
                    disabled={isProcessing}
                  >
                    {isProcessing ? <LoadingSpinner size="sm" className="mr-2" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                    {t('institution.reports.confirm')}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => setRejectMode(true)}
                    disabled={isProcessing}
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    {t('institution.reports.reject')}
                  </Button>
                </DialogFooter>
              )}
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
