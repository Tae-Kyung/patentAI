import { getTranslations, setRequestLocale } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import Link from 'next/link'
import { Plus, FolderKanban, Star, Users, Briefcase, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/common/empty-state'
import { StageProgress } from '@/components/common/progress-bar'
import type { Project } from '@/types/database'

interface DashboardProject extends Project {
  evaluation: { total_score: number | null } | null
  idea_card: { problem: string | null } | null
}

interface DashboardPageProps {
  params: Promise<{ locale: string }>
}

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations('dashboard')
  const tProject = await getTranslations('project')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // 사용자 프로젝트 목록 조회 (평가 점수 + 아이디어 요약 포함)
  const { data: rawProjects } = await supabase
    .from('bi_projects')
    .select(`
      *,
      evaluation:bi_evaluations(total_score),
      idea_card:bi_idea_cards(problem)
    `)
    .eq('user_id', user!.id)
    .order('updated_at', { ascending: false })
    .limit(5)
    .returns<DashboardProject[]>()

  // Supabase one-to-many join returns arrays — flatten to single objects
  const projects = (rawProjects || []).map((item) => ({
    ...item,
    evaluation: Array.isArray(item.evaluation) ? item.evaluation[0] ?? null : item.evaluation,
    idea_card: Array.isArray(item.idea_card) ? item.idea_card[0] ?? null : item.idea_card,
  }))

  // 멘토 역할 확인 및 멘토링 데이터 조회
  const serviceClient = createServiceClient()
  const { data: biUser } = await serviceClient
    .from('bi_users')
    .select('role')
    .eq('id', user!.id)
    .single()

  const isMentor = biUser?.role === 'mentor'

  let mentorMatches: { project_id: string; mentor_role: string; status: string }[] = []
  let mentorProjects: { id: string; name: string; current_stage: string }[] = []

  if (isMentor) {
    const { data: matches } = await serviceClient
      .from('bi_mentor_matches')
      .select('project_id, mentor_role, status')
      .eq('mentor_id', user!.id)

    mentorMatches = matches || []
    const projectIds = [...new Set(mentorMatches.map((m) => m.project_id))]

    if (projectIds.length > 0) {
      const { data: mProjects } = await serviceClient
        .from('bi_projects')
        .select('id, name, current_stage')
        .in('id', projectIds)
        .order('created_at', { ascending: false })
        .limit(5)

      mentorProjects = mProjects || []
    }
  }

  const mentorStatusCounts = mentorMatches.reduce((acc, m) => {
    acc[m.status] = (acc[m.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const statusToI18nKey: Record<string, string> = {
    draft: 'draft',
    in_progress: 'inProgress',
    completed: 'completed',
    archived: 'archived',
  }

  const stageLabels = [
    tProject('idea'),
    tProject('evaluation'),
    tProject('document'),
    tProject('deploy'),
    tProject('done'),
  ]

  const stageToIndex: Record<string, number> = {
    idea: 0,
    evaluation: 1,
    document: 2,
    deploy: 3,
    done: 4,
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t('title')}</h1>
        <Button asChild>
          <Link href="/projects/new">
            <Plus className="mr-2 h-4 w-4" />
            {tProject('title')}
          </Link>
        </Button>
      </div>

      {/* 멘토링 현황 (멘토 역할일 때만) */}
      {isMentor && (
        <>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{t('mentoringTotal')}</CardDescription>
                <CardTitle className="text-3xl">{mentorMatches.length}</CardTitle>
              </CardHeader>
              <CardContent>
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <Link href="/mentoring/projects">
                    <Users className="mr-2 h-4 w-4" />
                    {t('viewAll')}
                  </Link>
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{t('mentoringInProgress')}</CardDescription>
                <CardTitle className="text-3xl text-yellow-600 dark:text-yellow-400">
                  {(mentorStatusCounts['assigned'] || 0) + (mentorStatusCounts['in_progress'] || 0)}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{t('mentoringReview')}</CardDescription>
                <CardTitle className="text-3xl text-purple-600 dark:text-purple-400">
                  {mentorStatusCounts['review'] || 0}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{t('mentoringCompleted')}</CardDescription>
                <CardTitle className="text-3xl text-green-600 dark:text-green-400">
                  {mentorStatusCounts['completed'] || 0}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          {/* 멘토링 프로젝트 목록 */}
          {mentorProjects.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{t('mentoringProjects')}</CardTitle>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/mentoring/projects">
                      {t('viewAll')} <ArrowRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {mentorProjects.map((mp) => {
                    const matchInfo = mentorMatches.find((m) => m.project_id === mp.id)
                    return (
                      <Link
                        key={mp.id}
                        href={`/projects/${mp.id}`}
                        className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-accent"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{mp.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {tProject(mp.current_stage === 'idea' ? 'idea' : mp.current_stage === 'evaluation' ? 'evaluation' : mp.current_stage === 'document' ? 'document' : mp.current_stage === 'deploy' ? 'deploy' : 'done')}
                          </p>
                        </div>
                        <div className="ml-4 flex shrink-0 items-center gap-2">
                          <Badge variant={matchInfo?.mentor_role === 'primary' ? 'default' : 'secondary'}>
                            {matchInfo?.mentor_role === 'primary' ? t('rolePrimary') : t('roleSecondary')}
                          </Badge>
                          <Badge variant="outline" className={
                            matchInfo?.status === 'completed' ? 'border-green-500 text-green-600 dark:text-green-400' :
                            matchInfo?.status === 'in_progress' ? 'border-yellow-500 text-yellow-600 dark:text-yellow-400' :
                            matchInfo?.status === 'review' ? 'border-purple-500 text-purple-600 dark:text-purple-400' :
                            'border-blue-500 text-blue-600 dark:text-blue-400'
                          }>
                            {matchInfo?.status === 'assigned' ? t('statusAssigned') :
                             matchInfo?.status === 'in_progress' ? t('statusInProgress') :
                             matchInfo?.status === 'review' ? t('statusReview') :
                             matchInfo?.status === 'completed' ? t('statusCompleted') :
                             matchInfo?.status || '-'}
                          </Badge>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* 개인 프로젝트 요약 */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>{t('myProjects')}</CardTitle>
            <CardDescription>
              {projects?.length || 0} {tProject('title').toLowerCase()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" asChild>
              <Link href="/projects">
                <FolderKanban className="mr-2 h-4 w-4" />
                {t('myProjects')}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('myProjects')}</CardTitle>
        </CardHeader>
        <CardContent>
          {!projects || projects.length === 0 ? (
            <EmptyState
              icon={<FolderKanban className="h-8 w-8 text-muted-foreground" />}
              title={t('noProjects')}
              description={t('createFirst')}
              actionLabel={tProject('title')}
              actionHref="/projects/new"
            />
          ) : (
            <div className="space-y-4">
              {projects.map((project) => {
                const score = project.evaluation?.total_score

                return (
                  <Link
                    key={project.id}
                    href={`/projects/${project.id}`}
                    className="block rounded-lg border p-4 transition-colors hover:bg-accent"
                  >
                    {/* 헤더: 이름 + 점수 + 상태 */}
                    <div className="mb-1 flex items-center justify-between">
                      <h3 className="min-w-0 flex-1 truncate font-semibold">{project.name}</h3>
                      <div className="ml-4 flex shrink-0 items-center gap-2">
                        {score != null && (
                          <Badge
                            variant="outline"
                            className={`gap-1 text-xs ${
                              score >= 80
                                ? 'border-green-500 text-green-600 dark:text-green-400'
                                : score >= 60
                                ? 'border-yellow-500 text-yellow-600 dark:text-yellow-400'
                                : 'border-red-500 text-red-600 dark:text-red-400'
                            }`}
                          >
                            <Star className="h-3 w-3" />
                            {score}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {tProject(statusToI18nKey[project.status] || 'draft')}
                        </span>
                      </div>
                    </div>

                    {/* 아이디어 주제 */}
                    {project.idea_card?.problem && (
                      <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">
                        {project.idea_card.problem}
                      </p>
                    )}

                    {/* 진행 바 */}
                    <StageProgress
                      currentStage={stageToIndex[project.current_stage] || 0}
                      totalStages={5}
                      stages={stageLabels}
                    />

                    {/* 날짜 */}
                    <div className="mt-4 flex justify-between border-t pt-3 text-xs text-muted-foreground">
                      <span>{tProject('createdAt')}: {new Date(project.created_at).toLocaleDateString()}</span>
                      <span>{tProject('updatedAt')}: {new Date(project.updated_at).toLocaleDateString()}</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
