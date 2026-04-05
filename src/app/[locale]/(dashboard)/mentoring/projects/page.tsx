'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { FolderOpen, User, Briefcase, Building2, ArrowRight, FileText, MessageSquare } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/common/loading-spinner'
import { Pagination } from '@/components/common/pagination'
import Link from 'next/link'
import { toast } from 'sonner'

interface ProjectUser {
  id: string
  name: string | null
  email: string
}

interface MatchInfo {
  mentor_role: 'primary' | 'secondary'
  status: string
}

interface InstitutionInfo {
  id: string
  name: string
}

interface ReportInfo {
  status: 'draft' | 'submitted' | 'confirmed' | 'rejected'
  session_count: number
}

interface MentorProject {
  id: string
  name: string
  current_stage: string
  created_at: string
  user: ProjectUser
  match: MatchInfo
  institution: InstitutionInfo | null
  report: ReportInfo | null
}

interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function MentorProjectsPage() {
  const t = useTranslations()

  const [projects, setProjects] = useState<MentorProject[]>([])
  const [pagination, setPagination] = useState<PaginationInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)

  const fetchProjects = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
      })

      const response = await fetch(`/api/mentor/projects?${params}`)
      const result = await response.json()

      if (result.success) {
        setProjects(result.data.items)
        setPagination(result.data.pagination)
      } else {
        toast.error(t('mentor.projects.fetchFailed'))
      }
    } catch {
      toast.error(t('mentor.projects.fetchFailed'))
    } finally {
      setIsLoading(false)
    }
  }, [currentPage, t])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  const getMentorRoleBadge = (role: 'primary' | 'secondary') => {
    if (role === 'primary') {
      return (
        <Badge variant="default">
          {t('mentor.projects.rolePrimary')}
        </Badge>
      )
    }
    return (
      <Badge variant="secondary">
        {t('mentor.projects.roleSecondary')}
      </Badge>
    )
  }

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<
      string,
      { className: string; label: string }
    > = {
      assigned: {
        className:
          'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
        label: t('mentor.projects.statusAssigned'),
      },
      in_progress: {
        className:
          'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
        label: t('mentor.projects.statusInProgress'),
      },
      review: {
        className:
          'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
        label: t('mentor.projects.statusReview'),
      },
      completed: {
        className:
          'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
        label: t('mentor.projects.statusCompleted'),
      },
      cancelled: {
        className:
          'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
        label: t('mentor.projects.statusCancelled'),
      },
    }

    const config = statusConfig[status] || {
      className: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
      label: status,
    }

    return (
      <span
        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${config.className}`}
      >
        {config.label}
      </span>
    )
  }

  const getReportStatusBadge = (report: ReportInfo | null) => {
    if (!report) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
          <FileText className="h-3 w-3" />
          {t('mentor.projects.reportNotCreated')}
        </span>
      )
    }

    const config: Record<string, { className: string; label: string }> = {
      draft: {
        className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
        label: t('mentor.projects.reportDraft'),
      },
      submitted: {
        className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
        label: t('mentor.projects.reportSubmitted'),
      },
      confirmed: {
        className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
        label: t('mentor.projects.reportConfirmed'),
      },
      rejected: {
        className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
        label: t('mentor.projects.reportRejected'),
      },
    }

    const c = config[report.status] || config.draft

    return (
      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${c.className}`}>
        <FileText className="h-3 w-3" />
        {c.label}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">{t('mentor.projects.title')}</h1>
        <p className="text-muted-foreground">
          {t('mentor.projects.description')}
        </p>
      </div>

      {/* Project List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : projects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FolderOpen className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-semibold">
              {t('mentor.projects.noProjects')}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t('mentor.projects.noProjectsDesc')}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {projects.map((project) => (
            <Card key={project.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-lg truncate">
                      {project.name}
                    </CardTitle>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {getMentorRoleBadge(project.match.mentor_role)}
                    {getStatusBadge(project.match.status)}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    {getReportStatusBadge(project.report)}
                    {project.report && project.report.session_count > 0 && (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <MessageSquare className="h-3 w-3" />
                        {t('mentor.projects.sessionCount', { count: project.report.session_count })}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <User className="h-4 w-4" />
                        <span>
                          {project.user?.name || project.user?.email || '-'}
                        </span>
                      </div>
                      {project.institution && (
                        <div className="flex items-center gap-1.5">
                          <Building2 className="h-4 w-4" />
                          <span>{project.institution.name}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        <Briefcase className="h-4 w-4" />
                        <span>
                          {new Date(project.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link href={`/projects/${project.id}/mentoring`}>
                        <Button variant="default" size="sm">
                          {t('mentor.projects.startMentoring')}
                          <ArrowRight className="ml-1.5 h-4 w-4" />
                        </Button>
                      </Link>
                      <Link href={`/projects/${project.id}`}>
                        <Button variant="outline" size="sm">
                          {t('mentor.projects.viewProject')}
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={pagination.totalPages}
              onPageChange={setCurrentPage}
              className="mt-4"
            />
          )}
        </div>
      )}
    </div>
  )
}
