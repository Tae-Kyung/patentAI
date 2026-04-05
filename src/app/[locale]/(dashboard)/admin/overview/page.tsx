'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { RefreshCw, Building2, FolderKanban, UserCheck, Users, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/common/loading-spinner'
import { toast } from 'sonner'

interface OverviewData {
  summary: {
    totalInstitutions: number
    approvedInstitutions: number
    totalProjects: number
    totalMentors: number
    approvedMentors: number
    totalApplicants: number
    activePrograms: number
  }
  pending: {
    institutions: number
    members: number
    mentors: number
  }
  institutionStats: Array<{
    id: string
    name: string
    region: string
    projects: number
    mentors: number
    completedSessions: number
  }>
}

export default function OverviewPage() {
  const t = useTranslations()
  const [data, setData] = useState<OverviewData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchOverview = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/admin/overview')
      const result = await response.json()

      if (result.success) {
        setData(result.data)
      }
    } catch {
      toast.error(t('admin.overview.fetchFailed'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchOverview()
  }, [])

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!data) return null

  const totalPending = data.pending.institutions + data.pending.members + data.pending.mentors

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('admin.overview.title')}</h1>
          <p className="text-muted-foreground">{t('admin.overview.description')}</p>
        </div>
        <Button variant="outline" onClick={fetchOverview}>
          <RefreshCw className="mr-2 h-4 w-4" />
          {t('common.refresh')}
        </Button>
      </div>

      {/* 요약 카드 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t('admin.overview.totalInstitutions')}</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.totalInstitutions}</div>
            <p className="text-xs text-muted-foreground">
              {t('admin.overview.approvedOf', {
                approved: data.summary.approvedInstitutions,
                total: data.summary.totalInstitutions,
              })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t('admin.overview.totalProjects')}</CardTitle>
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.totalProjects}</div>
            <p className="text-xs text-muted-foreground">
              {t('admin.overview.activePrograms')}: {data.summary.activePrograms}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t('admin.overview.totalMentors')}</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.totalMentors}</div>
            <p className="text-xs text-muted-foreground">
              {t('admin.overview.approvedOf', {
                approved: data.summary.approvedMentors,
                total: data.summary.totalMentors,
              })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t('admin.overview.totalApplicants')}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.totalApplicants}</div>
          </CardContent>
        </Card>
      </div>

      {/* 승인 대기 현황 */}
      {totalPending > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-500" />
              {t('admin.overview.pendingApprovals')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold">{data.pending.institutions}</div>
                <p className="text-xs text-muted-foreground">{t('admin.overview.pendingInstitutions')}</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{data.pending.members}</div>
                <p className="text-xs text-muted-foreground">{t('admin.overview.pendingMembers')}</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{data.pending.mentors}</div>
                <p className="text-xs text-muted-foreground">{t('admin.overview.pendingMentorsLabel')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 기관별 현황 테이블 */}
      <Card>
        <CardHeader>
          <CardTitle>{t('admin.overview.institutionStats')}</CardTitle>
        </CardHeader>
        <CardContent>
          {data.institutionStats.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('admin.overview.noData')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-4">{t('admin.overview.regionLabel')}</th>
                    <th className="pb-2 pr-4">{t('admin.overview.institutionLabel')}</th>
                    <th className="pb-2 pr-4 text-right">{t('admin.overview.projectsLabel')}</th>
                    <th className="pb-2 pr-4 text-right">{t('admin.overview.mentorsLabel')}</th>
                    <th className="pb-2 text-right">{t('admin.overview.sessionsLabel')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.institutionStats.map((inst) => (
                    <tr key={inst.id} className="border-b last:border-0">
                      <td className="py-2 pr-4">
                        <Badge variant="outline">{inst.region}</Badge>
                      </td>
                      <td className="py-2 pr-4 font-medium">{inst.name}</td>
                      <td className="py-2 pr-4 text-right">{inst.projects}</td>
                      <td className="py-2 pr-4 text-right">{inst.mentors}</td>
                      <td className="py-2 text-right">{inst.completedSessions}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
