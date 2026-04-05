'use client'

import { useState, useEffect, useRef, use } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ArrowLeft, Trash2, FileText, Pencil, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { LoadingSpinner } from '@/components/common/loading-spinner'
import { StageProgress } from '@/components/common/progress-bar'
import { ConfirmModal } from '@/components/common/confirm-modal'
import { IdeaStage } from '@/features/idea/components/IdeaStage'
import { EvaluationStage } from '@/features/evaluation'
import { DocumentStage } from '@/features/document'
import { DeployStage } from '@/features/deploy'
import { ReviewStage } from '@/features/review'
import { DiagnosisStage } from '@/features/diagnosis'
import { StrategyStage } from '@/features/strategy'
import { ReportStage } from '@/features/report'
import { MentorFeedbackPanel } from '@/features/mentor/components/MentorFeedbackPanel'
import Link from 'next/link'
import { toast } from 'sonner'
import type { Project, IdeaCard, Evaluation, Document as DocType, ProjectType, BusinessReview } from '@/types/database'

interface PageProps {
  params: Promise<{ id: string }>
}

interface ProjectWithRelations extends Project {
  ideaCard: IdeaCard | null
  evaluation: Evaluation | null
  documents: DocType[]
  businessReview: BusinessReview | null
  mentorRole: string | null
  isOwner: boolean
}

const stageToTab: Record<string, string> = {
  idea: 'idea',
  evaluation: 'evaluation',
  document: 'document',
  deploy: 'deploy',
  done: 'done',
}

const stageToIndex: Record<string, number> = {
  idea: 0,
  evaluation: 1,
  document: 2,
  deploy: 3,
  done: 4,
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

function getTabLabels(t: ReturnType<typeof useTranslations>, projectType: ProjectType) {
  if (projectType === 'startup') {
    return {
      idea: t('project.reviewStage'),
      evaluation: t('project.diagnosisStage'),
      document: t('project.strategyStage'),
      deploy: t('project.reportStage'),
      done: t('project.done'),
    }
  }
  return {
    idea: t('project.idea'),
    evaluation: t('project.evaluation'),
    document: t('project.document'),
    deploy: t('project.deploy'),
    done: t('project.done'),
  }
}

export default function ProjectDetailPage({ params }: PageProps) {
  const { id } = use(params)
  const t = useTranslations()
  const router = useRouter()

  const [project, setProject] = useState<ProjectWithRelations | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('idea')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isEditingName, setIsEditingName] = useState(false)
  const [editName, setEditName] = useState('')
  const [isSavingName, setIsSavingName] = useState(false)

  const projectType: ProjectType = project?.project_type || 'pre_startup'
  const isStartup = projectType === 'startup'
  const stageLabels = getStageLabels(t, projectType)
  const tabLabels = getTabLabels(t, projectType)
  const isMentor = !!project?.mentorRole
  const isOwner = project?.isOwner ?? true

  const isInitialLoadRef = useRef(true)

  const fetchProject = async () => {
    try {
      const response = await fetch(`/api/projects/${id}`)
      const result = await response.json()

      if (result.success) {
        setProject(result.data)
        // Only auto-switch tab on initial load, not on subsequent updates
        if (isInitialLoadRef.current) {
          setActiveTab(stageToTab[result.data.current_stage] || 'idea')
          isInitialLoadRef.current = false
        }
      } else {
        toast.error(t('toast.projectFetchFailed'))
        router.push('/projects')
      }
    } catch (error) {
      toast.error(t('toast.projectFetchFailed'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchProject()
  }, [id])

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/projects/${id}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (result.success) {
        toast.success(t('toast.projectDeleted'))
        router.push('/projects')
      } else {
        toast.error(t('toast.projectDeleteFailed'))
      }
    } catch (error) {
      toast.error(t('toast.projectDeleteFailed'))
    }
  }

  const handleProjectUpdate = () => {
    fetchProject()
  }

  const handleStartRename = () => {
    if (!project) return
    setEditName(project.name)
    setIsEditingName(true)
  }

  const handleCancelRename = () => {
    setIsEditingName(false)
    setEditName('')
  }

  const handleSaveRename = async () => {
    if (!project || !editName.trim() || editName.trim() === project.name) {
      setIsEditingName(false)
      return
    }
    setIsSavingName(true)
    try {
      const response = await fetch(`/api/projects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim() }),
      })
      const result = await response.json()
      if (result.success) {
        setProject({ ...project, name: editName.trim() })
        toast.success(t('toast.projectUpdated'))
      } else {
        toast.error(result.error || t('toast.projectUpdateFailed'))
      }
    } catch {
      toast.error(t('toast.projectUpdateFailed'))
    } finally {
      setIsSavingName(false)
      setIsEditingName(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!project) {
    return null
  }

  return (
    <div className="space-y-8">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push(isMentor ? '/mentoring/projects' : '/projects')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveRename()
                      if (e.key === 'Escape') handleCancelRename()
                    }}
                    className="h-9 text-lg font-bold"
                    maxLength={200}
                    autoFocus
                    disabled={isSavingName}
                  />
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleSaveRename} disabled={isSavingName || !editName.trim()}>
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleCancelRename} disabled={isSavingName}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <h1 className="text-3xl font-bold">{project.name}</h1>
                  {isOwner && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={handleStartRename}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                </>
              )}
              <Badge
                variant="outline"
                className={
                  isStartup
                    ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                    : 'border-blue-500 text-blue-600 dark:text-blue-400'
                }
              >
                {isStartup ? t('project.startup') : t('project.preStartup')}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              {t('project.createdAt')}: {new Date(project.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
        {isOwner && (
          <Button
            variant="destructive"
            onClick={() => setShowDeleteConfirm(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {t('common.delete')}
          </Button>
        )}
        {isMentor && (
          <div className="flex items-center gap-3">
            <Link href={`/projects/${id}/mentoring`}>
              <Button>
                {t('mentor.projects.startMentoring')}
              </Button>
            </Link>
            <Link href={`/projects/${id}/mentoring/report`}>
              <Button variant="outline">
                <FileText className="mr-2 h-4 w-4" />
                {t('mentor.reports.writeReport')}
              </Button>
            </Link>
            <Badge variant="outline" className="border-blue-300 px-3 py-1 text-blue-700 dark:border-blue-700 dark:text-blue-300">
              {project.mentorRole === 'primary' ? t('mentor.workstation.rolePrimary') : t('mentor.workstation.roleSecondary')}
            </Badge>
          </div>
        )}
      </div>

      {/* 진행 상태 */}
      <Card>
        <CardHeader>
          <CardTitle>{t('project.progress')}</CardTitle>
        </CardHeader>
        <CardContent>
          <StageProgress
            currentStage={stageToIndex[project.current_stage] || 0}
            totalStages={5}
            stages={stageLabels}
          />
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Badge variant="outline">
              {t('project.stage')}: {stageLabels[stageToIndex[project.current_stage] || 0]}
            </Badge>
            {project.gate_1_passed_at && (
              <Badge variant="secondary" className="bg-green-500 text-white">
                Gate 1 {t('gate.passed')}
              </Badge>
            )}
            {project.gate_2_passed_at && (
              <Badge variant="secondary" className="bg-green-500 text-white">
                Gate 2 {t('gate.passed')}
              </Badge>
            )}
            {project.gate_3_passed_at && (
              <Badge variant="secondary" className="bg-green-500 text-white">
                Gate 3 {t('gate.passed')}
              </Badge>
            )}
            {project.gate_4_passed_at && (
              <Badge variant="secondary" className="bg-green-500 text-white">
                Gate 4 {t('gate.passed')}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 단계별 탭 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="idea">{tabLabels.idea}</TabsTrigger>
          <TabsTrigger
            value="evaluation"
            disabled={!isMentor && stageToIndex[project.current_stage] < 1}
          >
            {tabLabels.evaluation}
          </TabsTrigger>
          <TabsTrigger
            value="document"
            disabled={!isMentor && stageToIndex[project.current_stage] < 2}
          >
            {tabLabels.document}
          </TabsTrigger>
          <TabsTrigger
            value="deploy"
            disabled={!isMentor && stageToIndex[project.current_stage] < 3}
          >
            {tabLabels.deploy}
          </TabsTrigger>
          <TabsTrigger
            value="done"
            disabled={!isMentor && stageToIndex[project.current_stage] < 4}
          >
            {tabLabels.done}
          </TabsTrigger>
        </TabsList>

        {isStartup ? (
          <>
            {/* 창업자 트랙 */}
            <TabsContent value="idea" className="mt-6 space-y-6">
              <ReviewStage
                projectId={id}
                review={project.businessReview}
                isConfirmed={project.businessReview?.is_review_confirmed || false}
                canCancelConfirm={!!project.gate_1_passed_at && !project.gate_2_passed_at}
                onUpdate={handleProjectUpdate}
              />
              {isMentor && <MentorFeedbackPanel projectId={id} stage="idea" mentorRole={project.mentorRole!} />}
              {isOwner && !isMentor && <MentorFeedbackPanel projectId={id} stage="idea" readOnly />}
            </TabsContent>

            <TabsContent value="evaluation" className="mt-6 space-y-6">
              <DiagnosisStage
                projectId={id}
                review={project.businessReview}
                isConfirmed={project.businessReview?.is_diagnosis_confirmed || false}
                canDiagnose={!!project.gate_1_passed_at}
                canCancelConfirm={!!project.gate_2_passed_at && !project.gate_3_passed_at}
                onUpdate={handleProjectUpdate}
              />
              {isMentor && <MentorFeedbackPanel projectId={id} stage="evaluation" mentorRole={project.mentorRole!} />}
              {isOwner && !isMentor && <MentorFeedbackPanel projectId={id} stage="evaluation" readOnly />}
            </TabsContent>

            <TabsContent value="document" className="mt-6 space-y-6">
              <StrategyStage
                projectId={id}
                review={project.businessReview}
                isConfirmed={project.businessReview?.is_strategy_confirmed || false}
                canGenerate={!!project.gate_2_passed_at}
                canCancelConfirm={!!project.gate_3_passed_at && !project.gate_4_passed_at}
                onUpdate={handleProjectUpdate}
              />
              {isMentor && <MentorFeedbackPanel projectId={id} stage="document" mentorRole={project.mentorRole!} />}
              {isOwner && !isMentor && <MentorFeedbackPanel projectId={id} stage="document" readOnly />}
            </TabsContent>

            <TabsContent value="deploy" className="mt-6 space-y-6">
              <ReportStage
                projectId={id}
                review={project.businessReview}
                canGenerate={!!project.gate_3_passed_at}
                onUpdate={handleProjectUpdate}
              />
              {isMentor && <MentorFeedbackPanel projectId={id} stage="deploy" mentorRole={project.mentorRole!} />}
              {isOwner && !isMentor && <MentorFeedbackPanel projectId={id} stage="deploy" readOnly />}
            </TabsContent>

            <TabsContent value="done" className="mt-6 space-y-6">
              <ReportStage
                projectId={id}
                review={project.businessReview}
                canGenerate={!!project.gate_3_passed_at}
                onUpdate={handleProjectUpdate}
              />
              {isMentor && <MentorFeedbackPanel projectId={id} stage="done" mentorRole={project.mentorRole!} />}
              {isOwner && !isMentor && <MentorFeedbackPanel projectId={id} stage="done" readOnly />}
            </TabsContent>
          </>
        ) : (
          <>
            {/* 예비창업자 트랙 */}
            <TabsContent value="idea" className="mt-6 space-y-6">
              <IdeaStage
                projectId={id}
                ideaCard={project.ideaCard}
                isConfirmed={project.ideaCard?.is_confirmed || false}
                canCancelConfirm={!!project.gate_1_passed_at && !project.gate_2_passed_at}
                onUpdate={handleProjectUpdate}
              />
              {isMentor && <MentorFeedbackPanel projectId={id} stage="idea" mentorRole={project.mentorRole!} />}
              {isOwner && !isMentor && <MentorFeedbackPanel projectId={id} stage="idea" readOnly />}
            </TabsContent>

            <TabsContent value="evaluation" className="mt-6 space-y-6">
              <EvaluationStage
                projectId={id}
                evaluation={project.evaluation}
                isConfirmed={project.evaluation?.is_confirmed || false}
                canEvaluate={!!project.gate_1_passed_at}
                onUpdate={handleProjectUpdate}
              />
              {isMentor && <MentorFeedbackPanel projectId={id} stage="evaluation" mentorRole={project.mentorRole!} />}
              {isOwner && !isMentor && <MentorFeedbackPanel projectId={id} stage="evaluation" readOnly />}
            </TabsContent>

            <TabsContent value="document" className="mt-6 space-y-6">
              <DocumentStage
                projectId={id}
                documents={project.documents}
                isGate3Passed={!!project.gate_3_passed_at}
                canGenerate={!!project.gate_2_passed_at}
                onUpdate={handleProjectUpdate}
              />
              {isMentor && <MentorFeedbackPanel projectId={id} stage="document" mentorRole={project.mentorRole!} />}
              {isOwner && !isMentor && <MentorFeedbackPanel projectId={id} stage="document" readOnly />}
            </TabsContent>

            <TabsContent value="deploy" className="mt-6 space-y-6">
              <DeployStage
                project={project}
                ideaCard={project.ideaCard}
                evaluation={project.evaluation}
                documents={project.documents}
                canDeploy={!!project.gate_3_passed_at}
                onUpdate={handleProjectUpdate}
                onGoToDocuments={() => setActiveTab('document')}
              />
              {isMentor && <MentorFeedbackPanel projectId={id} stage="deploy" mentorRole={project.mentorRole!} />}
              {isOwner && !isMentor && <MentorFeedbackPanel projectId={id} stage="deploy" readOnly />}
            </TabsContent>

            <TabsContent value="done" className="mt-6 space-y-6">
              <DeployStage
                project={project}
                ideaCard={project.ideaCard}
                evaluation={project.evaluation}
                documents={project.documents}
                canDeploy={!!project.gate_3_passed_at}
                onUpdate={handleProjectUpdate}
                onGoToDocuments={() => setActiveTab('document')}
              />
              {isMentor && <MentorFeedbackPanel projectId={id} stage="done" mentorRole={project.mentorRole!} />}
              {isOwner && !isMentor && <MentorFeedbackPanel projectId={id} stage="done" readOnly />}
            </TabsContent>
          </>
        )}
      </Tabs>

      {/* 삭제 확인 모달 */}
      <ConfirmModal
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title={t('confirm.delete')}
        description={t('confirm.deleteDescription')}
        confirmText={t('common.delete')}
        onConfirm={handleDelete}
        variant="destructive"
      />
    </div>
  )
}
