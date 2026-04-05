'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Plus, FolderKanban, Star, Lightbulb, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { LoadingSpinner } from '@/components/common/loading-spinner'
import { EmptyState } from '@/components/common/empty-state'
import { Pagination } from '@/components/common/pagination'
import { StageProgress } from '@/components/common/progress-bar'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import type { Project, ProjectStatus, ProjectType } from '@/types/database'

interface ProjectWithExtras extends Project {
  evaluation: { total_score: number | null } | null
  idea_card: { problem: string | null } | null
}

const statusColors: Record<ProjectStatus, string> = {
  draft: 'bg-gray-500',
  in_progress: 'bg-blue-500',
  completed: 'bg-green-500',
  archived: 'bg-gray-400',
}

function getStageLabels(t: ReturnType<typeof useTranslations>, projectType: ProjectType) {
  if (projectType === 'startup') {
    return [
      t('project.reviewStage'),
      t('project.diagnosisStage'),
      t('project.strategyStage'),
      t('project.reportStage'),
      t('project.done'),
    ]
  }
  return [
    t('project.idea'),
    t('project.evaluation'),
    t('project.document'),
    t('project.deploy'),
    t('project.done'),
  ]
}

const stageToIndex: Record<string, number> = {
  idea: 0,
  evaluation: 1,
  document: 2,
  deploy: 3,
  done: 4,
}

export default function ProjectsPage() {
  const t = useTranslations()

  const statusLabels: Record<ProjectStatus, string> = {
    draft: t('project.draft'),
    in_progress: t('project.inProgress'),
    completed: t('project.completed'),
    archived: t('project.archived'),
  }
  const router = useRouter()
  const [projects, setProjects] = useState<ProjectWithExtras[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [status, setStatus] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // 새 프로젝트 생성 모달
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectType, setNewProjectType] = useState<ProjectType | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  const fetchProjects = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
      })
      if (status !== 'all') {
        params.set('status', status)
      }

      const response = await fetch(`/api/projects?${params}`)
      const result = await response.json()

      if (result.success) {
        setProjects(result.data.items)
        setTotalPages(result.data.totalPages)
      }
    } catch (error) {
      toast.error(t('toast.projectListFetchFailed'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchProjects()
  }, [page, status])

  const handleCreateProject = async () => {
    if (!newProjectType) {
      return
    }
    if (!newProjectName.trim()) {
      toast.error(t('toast.projectNameRequired'))
      return
    }

    setIsCreating(true)
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newProjectName, project_type: newProjectType }),
      })

      const result = await response.json()

      if (result.success) {
        toast.success(t('toast.projectCreated'))
        setShowCreateModal(false)
        setNewProjectName('')
        setNewProjectType(null)
        router.push(`/projects/${result.data.id}`)
      } else {
        toast.error(result.error || t('toast.projectCreateFailed'))
      }
    } catch (error) {
      toast.error(t('toast.projectCreateFailed'))
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t('nav.projects')}</h1>
        <Dialog open={showCreateModal} onOpenChange={(open) => {
          setShowCreateModal(open)
          if (!open) {
            setNewProjectName('')
            setNewProjectType(null)
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              {t('nav.newProject')}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{t('nav.newProject')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* 프로젝트 유형 선택 */}
              <div className="space-y-2">
                <Label>{t('project.selectType')}</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all ${
                      newProjectType === 'pre_startup'
                        ? 'border-primary bg-primary/5'
                        : 'border-muted hover:border-primary/50'
                    }`}
                    onClick={() => setNewProjectType('pre_startup')}
                  >
                    <Lightbulb className={`h-6 w-6 ${
                      newProjectType === 'pre_startup' ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground'
                    }`} />
                    <span className={`text-sm font-medium ${
                      newProjectType === 'pre_startup' ? 'text-primary' : 'text-muted-foreground'
                    }`}>
                      {t('project.preStartup')}
                    </span>
                  </button>
                  <button
                    type="button"
                    className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all ${
                      newProjectType === 'startup'
                        ? 'border-primary bg-primary/5'
                        : 'border-muted hover:border-primary/50'
                    }`}
                    onClick={() => setNewProjectType('startup')}
                  >
                    <Building2 className={`h-6 w-6 ${
                      newProjectType === 'startup' ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'
                    }`} />
                    <span className={`text-sm font-medium ${
                      newProjectType === 'startup' ? 'text-primary' : 'text-muted-foreground'
                    }`}>
                      {t('project.startup')}
                    </span>
                  </button>
                </div>
              </div>

              {/* 프로젝트 이름 */}
              {newProjectType && (
                <div className="space-y-2">
                  <Label htmlFor="projectName">{t('project.name')}</Label>
                  <Input
                    id="projectName"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder={t('toast.projectNameRequired')}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreateProject()
                    }}
                    autoFocus
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                {t('common.cancel')}
              </Button>
              <Button
                onClick={handleCreateProject}
                disabled={isCreating || !newProjectType || !newProjectName.trim()}
              >
                {isCreating ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    {t('common.loading')}
                  </>
                ) : (
                  t('common.create')
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* 필터 */}
      <div className="flex gap-4">
        <Select value={status} onValueChange={(value) => {
          setStatus(value)
          setPage(1)
        }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t('project.status')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('common.all')}</SelectItem>
            <SelectItem value="draft">{t('project.draft')}</SelectItem>
            <SelectItem value="in_progress">{t('project.inProgress')}</SelectItem>
            <SelectItem value="completed">{t('project.completed')}</SelectItem>
            <SelectItem value="archived">{t('project.archived')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 프로젝트 목록 */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : projects.length === 0 ? (
        <EmptyState
          icon={<FolderKanban className="h-8 w-8 text-muted-foreground" />}
          title={t('dashboard.noProjects')}
          description={t('dashboard.createFirst')}
          actionLabel={t('nav.newProject')}
          actionHref="/projects/new"
        />
      ) : (
        <>
          <div className="grid gap-4">
            {projects.map((project) => {
              const labels = getStageLabels(t, project.project_type || 'pre_startup')
              return (
                <Link key={project.id} href={`/projects/${project.id}`}>
                  <Card className="transition-colors hover:bg-accent">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <CardTitle className="truncate text-lg">{project.name}</CardTitle>
                            <Badge
                              variant="outline"
                              className={
                                project.project_type === 'startup'
                                  ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                                  : 'border-blue-500 text-blue-600 dark:text-blue-400'
                              }
                            >
                              {project.project_type === 'startup'
                                ? t('project.startup')
                                : t('project.preStartup')}
                            </Badge>
                          </div>
                          {/* 아이디어 주제 (있을 경우) */}
                          {project.idea_card?.problem && (
                            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                              {project.idea_card.problem}
                            </p>
                          )}
                        </div>
                        <div className="ml-4 flex shrink-0 items-center gap-2">
                          {/* 평가 점수 (있을 경우) */}
                          {project.evaluation?.total_score != null && (
                            <Badge
                              variant="outline"
                              className={`gap-1 ${
                                project.evaluation.total_score >= 80
                                  ? 'border-green-500 text-green-600 dark:text-green-400'
                                  : project.evaluation.total_score >= 60
                                  ? 'border-yellow-500 text-yellow-600 dark:text-yellow-400'
                                  : 'border-red-500 text-red-600 dark:text-red-400'
                              }`}
                            >
                              <Star className="h-3 w-3" />
                              {project.evaluation.total_score}
                            </Badge>
                          )}
                          <Badge
                            variant="secondary"
                            className={`${statusColors[project.status]} text-white`}
                          >
                            {statusLabels[project.status]}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <StageProgress
                        currentStage={stageToIndex[project.current_stage] || 0}
                        totalStages={5}
                        stages={labels}
                      />
                      <div className="flex justify-between border-t pt-3 text-xs text-muted-foreground">
                        <span>{t('project.createdAt')}: {new Date(project.created_at).toLocaleDateString()}</span>
                        <span>{t('project.updatedAt')}: {new Date(project.updated_at).toLocaleDateString()}</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>

          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  )
}
