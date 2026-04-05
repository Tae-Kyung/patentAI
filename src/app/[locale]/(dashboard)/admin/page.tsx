'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import {
  Users,
  FolderKanban,
  Clock,
  FileText,
  RefreshCw,
  Coins,
  UserPlus,
  FilePlus,
  ClipboardCheck,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/common/loading-spinner'
import { toast } from 'sonner'

interface DashboardData {
  users: {
    total: number
    byRole: { user: number; mentor: number; admin: number }
  }
  projects: {
    total: number
    byStage: {
      idea: number
      evaluation: number
      document: number
      deploy: number
      done: number
    }
    byType?: {
      pre_startup: number
      startup: number
    }
  }
  pendingApprovals: number
  documents: { total: number; confirmed: number }
  recentUsers: Array<{
    id: string
    name: string | null
    email: string
    role: string
    created_at: string
  }>
  credits?: {
    totalDistributed: number
    totalConsumed: number
    averagePerUser: number
  }
  recentActivity?: Array<{
    type: string
    description: string
    timestamp: string
  }>
  creditTrends?: {
    daily: Array<{ date: string; consumed: number; recharged: number }>
  }
}

export default function AdminDashboardPage() {
  const t = useTranslations()
  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDashboard = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/admin/dashboard')
      const result = await response.json()
      if (result.success) {
        setData(result.data)
      } else {
        setError(result.error || `API error: ${response.status}`)
        console.error('Dashboard API error:', result)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      setError(msg)
      toast.error(t('admin.dashboard.fetchFailed'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboard()
  }, [])

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-2">
        <LoadingSpinner size="lg" />
        <p className="text-xs text-muted-foreground">Loading dashboard...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <p className="text-destructive font-medium">Dashboard Error</p>
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button variant="outline" onClick={fetchDashboard}>
          <RefreshCw className="mr-2 h-4 w-4" />
          {t('common.refresh')}
        </Button>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <p className="text-muted-foreground">No data returned</p>
        <Button variant="outline" onClick={fetchDashboard}>
          <RefreshCw className="mr-2 h-4 w-4" />
          {t('common.refresh')}
        </Button>
      </div>
    )
  }

  const stageLabels: Record<string, string> = {
    idea: t('project.idea'),
    evaluation: t('project.evaluation'),
    document: t('project.document'),
    deploy: t('project.deploy'),
    done: t('project.done'),
  }

  const stageColors: Record<string, string> = {
    idea: 'bg-blue-500',
    evaluation: 'bg-yellow-500',
    document: 'bg-purple-500',
    deploy: 'bg-orange-500',
    done: 'bg-green-500',
  }

  const typeLabels: Record<string, string> = {
    pre_startup: t('project.preStartup'),
    startup: t('project.startup'),
  }

  const typeColors: Record<string, string> = {
    pre_startup: 'bg-sky-500',
    startup: 'bg-emerald-500',
  }

  const roleLabels: Record<string, string> = {
    user: t('admin.dashboard.roleUser'),
    mentor: t('admin.dashboard.roleMentor'),
    admin: t('admin.dashboard.roleAdmin'),
  }

  const activityIcon = (type: string) => {
    switch (type) {
      case 'user_joined':
        return <UserPlus className="h-4 w-4 text-blue-500" />
      case 'project_created':
        return <FilePlus className="h-4 w-4 text-green-500" />
      case 'approval_requested':
        return <ClipboardCheck className="h-4 w-4 text-yellow-500" />
      case 'document_generated':
        return <FileText className="h-4 w-4 text-purple-500" />
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />
    }
  }

  const activityLabel = (type: string, description: string) => {
    switch (type) {
      case 'user_joined':
        return t('admin.dashboard.activityUserJoined', { name: description })
      case 'project_created':
        return t('admin.dashboard.activityProjectCreated', { name: description })
      case 'approval_requested':
        return t('admin.dashboard.activityApprovalRequested', { gate: description })
      case 'document_generated':
        return t('admin.dashboard.activityDocGenerated', { type: description })
      default:
        return description
    }
  }

  // 크레딧 소진율
  const consumptionRate =
    data.credits && data.credits.totalDistributed > 0
      ? Math.round((data.credits.totalConsumed / data.credits.totalDistributed) * 100)
      : 0

  // 크레딧 추이 차트 최대값
  const maxTrendValue = data.creditTrends
    ? Math.max(
        ...data.creditTrends.daily.map((d) => Math.max(d.consumed, d.recharged)),
        1
      )
    : 1

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('admin.dashboard.title')}</h1>
          <p className="text-muted-foreground">
            {t('admin.dashboard.description')}
          </p>
        </div>
        <Button variant="outline" onClick={fetchDashboard}>
          <RefreshCw className="mr-2 h-4 w-4" />
          {t('common.refresh')}
        </Button>
      </div>

      {/* 요약 카드 6개 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {t('admin.dashboard.totalUsers')}
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.users.total}</div>
            <p className="text-xs text-muted-foreground">
              {roleLabels.user} {data.users.byRole.user} · {roleLabels.mentor}{' '}
              {data.users.byRole.mentor} · {roleLabels.admin}{' '}
              {data.users.byRole.admin}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {t('admin.dashboard.totalProjects')}
            </CardTitle>
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.projects.total}</div>
            <p className="text-xs text-muted-foreground">
              {t('admin.dashboard.activeProjects', {
                count: data.projects.total - data.projects.byStage.done,
              })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {t('admin.dashboard.pendingApprovals')}
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.pendingApprovals}</div>
            <p className="text-xs text-muted-foreground">
              {t('admin.dashboard.awaitingReview')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {t('admin.dashboard.totalDocuments')}
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.documents.total}</div>
            <p className="text-xs text-muted-foreground">
              {t('admin.dashboard.confirmedDocuments', {
                count: data.documents.confirmed,
              })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {t('admin.dashboard.totalCreditsConsumed')}
            </CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.credits?.totalConsumed ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('admin.dashboard.consumptionRate', { rate: consumptionRate })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {t('admin.dashboard.avgCreditsPerUser')}
            </CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.credits?.averagePerUser ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('admin.dashboard.totalUsers')}: {data.users.total}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 프로젝트 분석 (2열 그리드) */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* 프로젝트 단계별 분포 */}
        <Card>
          <CardHeader>
            <CardTitle>{t('admin.dashboard.projectsByStage')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(data.projects.byStage).map(([stage, count]) => {
                const percentage =
                  data.projects.total > 0
                    ? Math.round((count / data.projects.total) * 100)
                    : 0
                return (
                  <div key={stage} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span>{stageLabels[stage]}</span>
                      <span className="font-medium">
                        {count} ({percentage}%)
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted">
                      <div
                        className={`h-2 rounded-full ${stageColors[stage]}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* 프로젝트 유형별 분포 */}
        <Card>
          <CardHeader>
            <CardTitle>{t('admin.dashboard.projectsByType')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.projects.byType &&
                Object.entries(data.projects.byType).map(([type, count]) => {
                  const percentage =
                    data.projects.total > 0
                      ? Math.round((count / data.projects.total) * 100)
                      : 0
                  return (
                    <div key={type} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span>{typeLabels[type] || type}</span>
                        <span className="font-medium">
                          {count} ({percentage}%)
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-muted">
                        <div
                          className={`h-2 rounded-full ${typeColors[type] || 'bg-gray-500'}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              {(!data.projects.byType ||
                (data.projects.byType.pre_startup === 0 &&
                  data.projects.byType.startup === 0)) && (
                <p className="text-sm text-muted-foreground">
                  {t('admin.dashboard.noActivity')}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 크레딧 추이 (전체 너비) */}
      {data.creditTrends && (
        <Card>
          <CardHeader>
            <CardTitle>{t('admin.dashboard.creditTrends')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {/* 범례 */}
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <div className="h-3 w-3 rounded bg-red-400" />
                  {t('admin.dashboard.consumed')}
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-3 w-3 rounded bg-green-400" />
                  {t('admin.dashboard.recharged')}
                </div>
              </div>
              {/* 바 차트 */}
              <div className="flex items-end gap-2" style={{ height: 160 }}>
                {data.creditTrends.daily.map((day) => {
                  const consumedH =
                    maxTrendValue > 0
                      ? (day.consumed / maxTrendValue) * 140
                      : 0
                  const rechargedH =
                    maxTrendValue > 0
                      ? (day.recharged / maxTrendValue) * 140
                      : 0
                  const dateLabel = day.date.slice(5) // MM-DD
                  return (
                    <div
                      key={day.date}
                      className="flex flex-1 flex-col items-center gap-1"
                    >
                      <div className="flex items-end gap-0.5" style={{ height: 140 }}>
                        <div
                          className="w-3 rounded-t bg-red-400 transition-all"
                          style={{ height: consumedH }}
                          title={`${t('admin.dashboard.consumed')}: ${day.consumed}`}
                        />
                        <div
                          className="w-3 rounded-t bg-green-400 transition-all"
                          style={{ height: rechargedH }}
                          title={`${t('admin.dashboard.recharged')}: ${day.recharged}`}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {dateLabel}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 하단 (2열 그리드) */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* 최근 활동 피드 */}
        <Card>
          <CardHeader>
            <CardTitle>{t('admin.dashboard.recentActivity')}</CardTitle>
          </CardHeader>
          <CardContent>
            {!data.recentActivity || data.recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t('admin.dashboard.noActivity')}
              </p>
            ) : (
              <div className="space-y-3">
                {data.recentActivity.map((activity, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <div className="mt-0.5">{activityIcon(activity.type)}</div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">
                        {activityLabel(activity.type, activity.description)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(activity.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 최근 가입자 */}
        <Card>
          <CardHeader>
            <CardTitle>{t('admin.dashboard.recentUsers')}</CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t('admin.dashboard.noRecentUsers')}
              </p>
            ) : (
              <div className="space-y-3">
                {data.recentUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {user.name || user.email}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {roleLabels[user.role] || user.role}
                      </Badge>
                      <span className="whitespace-nowrap text-xs text-muted-foreground">
                        {new Date(user.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
