'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import {
  FolderKanban,
  Users,
  CalendarCheck,
  DollarSign,
  RefreshCw,
  ArrowRight,
  FileText,
  CircleDot,
  Eye,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/common/loading-spinner'
import { toast } from 'sonner'

interface MentorOverview {
  id: string
  name: string | null
  role: string
  matchStatus: string
  reportStatus: string | null
  reportId: string | null
}

interface ProjectOverview {
  project: { id: string; name: string; current_stage: string }
  mentors: MentorOverview[]
}

interface InstitutionStats {
  projectCount: number
  mentorCount: number
  sessionCount: number
  completedSessions: number
  pendingPayouts: {
    count: number
    totalAmount: number
  }
  mentoringOverview: ProjectOverview[]
}

export default function InstitutionDashboardPage() {
  const t = useTranslations()
  const [stats, setStats] = useState<InstitutionStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchStats = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/institution/stats')
      const result = await response.json()
      if (result.success) {
        setStats(result.data)
      }
    } catch {
      toast.error(t('institution.dashboard.fetchFailed'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  const stageLabel = (stage: string) => {
    const labels: Record<string, string> = {
      idea: t('institution.dashboard.stageIdea'),
      evaluation: t('institution.dashboard.stageEvaluation'),
      document: t('institution.dashboard.stageDocument'),
      deploy: t('institution.dashboard.stageDeploy'),
      done: t('institution.dashboard.stageDone'),
    }
    return labels[stage] || stage
  }

  const stageColor = (stage: string) => {
    const colors: Record<string, string> = {
      idea: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      evaluation: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      document: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      deploy: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      done: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    }
    return colors[stage] || ''
  }

  const matchStatusBadge = (status: string) => {
    const config: Record<string, { className: string; label: string }> = {
      assigned: { className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300', label: t('institution.dashboard.matchAssigned') },
      in_progress: { className: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300', label: t('institution.dashboard.matchInProgress') },
      review: { className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300', label: t('institution.dashboard.matchReview') },
      completed: { className: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300', label: t('institution.dashboard.matchCompleted') },
      cancelled: { className: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300', label: t('institution.dashboard.matchCancelled') },
    }
    const c = config[status] || { className: '', label: status }
    return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${c.className}`}>{c.label}</span>
  }

  const reportStatusBadge = (status: string | null) => {
    if (!status) return <span className="text-xs text-muted-foreground">-</span>
    const config: Record<string, { className: string; label: string }> = {
      draft: { className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300', label: t('institution.dashboard.reportDraft') },
      submitted: { className: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300', label: t('institution.dashboard.reportSubmitted') },
      confirmed: { className: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300', label: t('institution.dashboard.reportConfirmed') },
      rejected: { className: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300', label: t('institution.dashboard.reportRejected') },
    }
    const c = config[status] || { className: '', label: status }
    return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${c.className}`}>{c.label}</span>
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!stats) return null

  const sessionProgress =
    stats.sessionCount > 0
      ? Math.round((stats.completedSessions / stats.sessionCount) * 100)
      : 0

  // 멘토링 현황 요약 수치
  const totalMatches = stats.mentoringOverview.reduce((sum, p) => sum + p.mentors.length, 0)
  const reportSubmitted = stats.mentoringOverview.reduce(
    (sum, p) => sum + p.mentors.filter((m) => m.reportStatus === 'submitted' || m.reportStatus === 'confirmed').length,
    0
  )
  const reportPending = stats.mentoringOverview.reduce(
    (sum, p) => sum + p.mentors.filter((m) => m.reportStatus === 'submitted').length,
    0
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            {t('institution.dashboard.title')}
          </h1>
          <p className="text-muted-foreground">
            {t('institution.dashboard.description')}
          </p>
        </div>
        <Button variant="outline" onClick={fetchStats}>
          <RefreshCw className="mr-2 h-4 w-4" />
          {t('common.refresh')}
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {t('institution.dashboard.projects')}
            </CardTitle>
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.projectCount}</div>
            <p className="text-xs text-muted-foreground">
              {t('institution.dashboard.totalProjects')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {t('institution.dashboard.mentors')}
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.mentorCount}</div>
            <p className="text-xs text-muted-foreground">
              {t('institution.dashboard.registeredMentors')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {t('institution.dashboard.sessions')}
            </CardTitle>
            <CalendarCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.sessionCount}</div>
            <p className="text-xs text-muted-foreground">
              {t('institution.dashboard.sessionProgress', {
                completed: stats.completedSessions,
                rate: sessionProgress,
              })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {t('institution.dashboard.pendingPayouts')}
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.pendingPayouts.count}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('institution.dashboard.pendingAmount', {
                amount: stats.pendingPayouts.totalAmount.toLocaleString(),
              })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Mentoring Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CircleDot className="h-5 w-5 text-blue-500" />
              {t('institution.dashboard.mentoringOverview')}
            </CardTitle>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span>{t('institution.dashboard.totalMatches')}: <strong className="text-foreground">{totalMatches}</strong></span>
              <span>{t('institution.dashboard.reportsSubmitted')}: <strong className="text-foreground">{reportSubmitted}</strong></span>
              {reportPending > 0 && (
                <Badge variant="secondary">{t('institution.dashboard.reportsPendingReview', { count: reportPending })}</Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {stats.mentoringOverview.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              {t('institution.dashboard.noMentoringData')}
            </p>
          ) : (
            <div className="space-y-3">
              {/* Table header */}
              <div className="hidden rounded-lg bg-muted px-4 py-2 text-xs font-medium text-muted-foreground md:grid md:grid-cols-12 md:gap-3">
                <div className="col-span-4">{t('institution.dashboard.colProject')}</div>
                <div className="col-span-1">{t('institution.dashboard.colStage')}</div>
                <div className="col-span-3">{t('institution.dashboard.colMentor')}</div>
                <div className="col-span-2">{t('institution.dashboard.colMatchStatus')}</div>
                <div className="col-span-2">{t('institution.dashboard.colReportStatus')}</div>
              </div>

              {stats.mentoringOverview.map((item) => (
                <div key={item.project.id} className="rounded-lg border">
                  {item.mentors.length === 0 ? (
                    <div className="flex items-center gap-3 px-4 py-3 md:grid md:grid-cols-12">
                      <div className="col-span-4 min-w-0">
                        <Link href={`/institution/projects`} className="block truncate text-sm font-medium hover:underline">
                          {item.project.name}
                        </Link>
                      </div>
                      <div className="col-span-1">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${stageColor(item.project.current_stage)}`}>
                          {stageLabel(item.project.current_stage)}
                        </span>
                      </div>
                      <div className="col-span-7 text-sm text-muted-foreground">
                        {t('institution.dashboard.noMentorAssigned')}
                      </div>
                    </div>
                  ) : (
                    item.mentors.map((mentor, idx) => (
                      <div
                        key={mentor.id}
                        className={`flex items-center gap-3 px-4 py-2.5 md:grid md:grid-cols-12 ${idx > 0 ? 'border-t' : ''}`}
                      >
                        {/* 프로젝트명: 첫번째 멘토만 표시 */}
                        <div className="col-span-4 min-w-0">
                          {idx === 0 ? (
                            <Link href={`/institution/projects`} className="block truncate text-sm font-medium hover:underline">
                              {item.project.name}
                            </Link>
                          ) : (
                            <span className="text-sm text-transparent select-none hidden md:block">.</span>
                          )}
                        </div>
                        <div className="col-span-1">
                          {idx === 0 && (
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${stageColor(item.project.current_stage)}`}>
                              {stageLabel(item.project.current_stage)}
                            </span>
                          )}
                        </div>
                        <div className="col-span-3 min-w-0">
                          <p className="truncate text-sm">{mentor.name || '-'}</p>
                          <p className="text-xs text-muted-foreground">{mentor.role}</p>
                        </div>
                        <div className="col-span-2">
                          {matchStatusBadge(mentor.matchStatus)}
                        </div>
                        <div className="col-span-2 flex items-center gap-1.5">
                          {reportStatusBadge(mentor.reportStatus)}
                          {mentor.reportStatus && mentor.reportId && (
                            <Link href={`/institution/reports`}>
                              <Button variant="ghost" size="sm" className="h-6 px-1.5">
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                            </Link>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ))}
            </div>
          )}

          {stats.mentoringOverview.length > 0 && (
            <div className="mt-4 flex justify-end">
              <Button variant="outline" size="sm" asChild>
                <Link href="/institution/projects">
                  {t('institution.dashboard.viewAllProjects')}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>{t('institution.dashboard.quickActions')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Button variant="outline" className="justify-between" asChild>
              <Link href="/institution/mentors">
                <span className="flex items-center">
                  <Users className="mr-2 h-4 w-4" />
                  {t('institution.dashboard.goToMentors')}
                </span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>

            <Button variant="outline" className="justify-between" asChild>
              <Link href="/institution/reports">
                <span className="flex items-center">
                  <FileText className="mr-2 h-4 w-4" />
                  {t('institution.dashboard.goToReports')}
                </span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>

            <Button variant="outline" className="justify-between" asChild>
              <Link href="/institution/payouts">
                <span className="flex items-center">
                  <DollarSign className="mr-2 h-4 w-4" />
                  {t('institution.dashboard.goToPayouts')}
                </span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>

            <Button variant="outline" className="justify-between" asChild>
              <Link href="/institution/matches">
                <span className="flex items-center">
                  <CalendarCheck className="mr-2 h-4 w-4" />
                  {t('institution.dashboard.goToMatches')}
                </span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
