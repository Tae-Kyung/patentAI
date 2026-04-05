'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  Rocket,
  Check,
  Share2,
  ExternalLink,
  Copy,
  Download,
  AlertTriangle,
  FileText,
  Presentation,
  Globe,
  Monitor,
  Newspaper,
  BarChart3,
  Upload,
  Eye,
  EyeOff,
  Award,
  Undo2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/common/loading-spinner'
import { toast } from 'sonner'
import { exportToPdf } from '@/lib/utils/document-export'
import type { Project, IdeaCard, Evaluation, Document as DocType } from '@/types/database'

interface DeployStageProps {
  project: Project
  ideaCard: IdeaCard | null
  evaluation: Evaluation | null
  documents: DocType[]
  canDeploy: boolean  // Gate 3가 통과되었는지
  onUpdate: () => void
  onGoToDocuments?: () => void
}

export function DeployStage({
  project,
  ideaCard,
  evaluation,
  documents,
  canDeploy,
  onUpdate,
  onGoToDocuments,
}: DeployStageProps) {
  const t = useTranslations()
  const [isCompleting, setIsCompleting] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [isDeploying, setIsDeploying] = useState(false)
  const [landingUrl, setLandingUrl] = useState<string | null>(null)
  const [visibility, setVisibility] = useState<string>(
    project.visibility || 'private'
  )
  const [isUpdatingVisibility, setIsUpdatingVisibility] = useState(false)

  const handleComplete = async () => {
    setIsCompleting(true)
    try {
      const response = await fetch(`/api/projects/${project.id}/complete`, {
        method: 'POST',
      })

      const result = await response.json()

      if (result.success) {
        toast.success(result.data.message)
        onUpdate()
      } else {
        toast.error(result.error || t('deploy.completeFailed'))
      }
    } catch {
      toast.error(t('deploy.completeFailed'))
    } finally {
      setIsCompleting(false)
    }
  }

  const handleCopyShareUrl = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl)
      toast.success(t('deploy.linkCopied'))
    }
  }

  const HTML_DOC_TYPES = new Set(['landing', 'ppt', 'leaflet', 'infographic'])

  const handleDownloadAll = () => {
    documents.forEach(doc => {
      if (!doc.content) return

      if (HTML_DOC_TYPES.has(doc.type)) {
        // HTML 문서는 HTML 파일로 다운로드
        const blob = new Blob([doc.content], { type: 'text/html' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${doc.title}.html`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      } else {
        // 사업계획서/피치는 PDF 인쇄 창으로 다운로드
        exportToPdf(doc.title, doc.content)
      }
    })
    toast.success(t('deploy.downloadAllComplete'))
  }

  const handleGenerateShareUrl = async () => {
    // 간단한 공유 URL 생성 (실제 구현에서는 서버에서 생성)
    const url = `${window.location.origin}/share/${project.id}`
    setShareUrl(url)
    navigator.clipboard.writeText(url)
    toast.success(t('deploy.shareLinkCopied'))
  }

  const handleDeployLanding = async () => {
    setIsDeploying(true)
    try {
      const response = await fetch(`/api/projects/${project.id}/deploy-landing`, {
        method: 'POST',
      })

      const result = await response.json()

      if (result.success) {
        setLandingUrl(result.data.url)
        toast.success(result.data.message)
        onUpdate()
      } else {
        toast.error(result.error || t('deploy.deployFailed'))
      }
    } catch {
      toast.error(t('deploy.deployFailed'))
    } finally {
      setIsDeploying(false)
    }
  }

  const handleVisibilityChange = async (newVisibility: string) => {
    setIsUpdatingVisibility(true)
    try {
      const response = await fetch(`/api/projects/${project.id}/visibility`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visibility: newVisibility }),
      })
      const result = await response.json()
      if (result.success) {
        setVisibility(newVisibility)
        toast.success(t('deploy.visibilityUpdated'))
        onUpdate()
      } else {
        toast.error(result.error || t('deploy.visibilityFailed'))
      }
    } catch {
      toast.error(t('deploy.visibilityFailed'))
    } finally {
      setIsUpdatingVisibility(false)
    }
  }

  const documentIcons = {
    business_plan: FileText,
    pitch: Presentation,
    landing: Globe,
    ppt: Monitor,
    leaflet: Newspaper,
    infographic: BarChart3,
  }

  if (!canDeploy) {
    return (
      <Card className="border-orange-500 bg-orange-50 dark:bg-orange-950">
        <CardContent className="flex items-center gap-4 py-6">
          <div className="rounded-full bg-orange-500 p-2">
            <AlertTriangle className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-orange-700 dark:text-orange-300">
              {t('deploy.gate3Required')}
            </h3>
            <p className="text-sm text-orange-600 dark:text-orange-400">
              {t('deploy.gate3RequiredDesc')}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const isCompleted = !!project.gate_4_passed_at

  return (
    <div className="space-y-6">
      {/* 프로젝트 요약 */}
      <Card>
        <CardHeader>
          <CardTitle>{t('deploy.projectSummary')}</CardTitle>
          <CardDescription>{t('deploy.projectSummaryDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 아이디어 요약 */}
          <div className="rounded-lg border p-4">
            <h4 className="mb-2 font-medium">{t('deploy.ideaSummary')}</h4>
            <p className="text-sm text-muted-foreground line-clamp-3">
              {ideaCard?.problem || ideaCard?.raw_input || '-'}
            </p>
          </div>

          {/* 평가 점수 */}
          {evaluation && (
            <div className="rounded-lg border p-4">
              <h4 className="mb-2 font-medium">{t('deploy.evalResult')}</h4>
              <div className="flex gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {evaluation.total_score}
                  </div>
                  <div className="text-xs text-muted-foreground">{t('deploy.totalScore')}</div>
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>{t('deploy.investScore')}</span>
                    <span>{evaluation.investor_score}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>{t('deploy.marketScore')}</span>
                    <span>{evaluation.market_score}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>{t('deploy.techScore')}</span>
                    <span>{evaluation.tech_score}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 생성된 문서 목록 */}
          <div className="rounded-lg border p-4">
            <div className="mb-2 flex items-center justify-between">
              <h4 className="font-medium">{t('deploy.generatedDocs')}</h4>
              {onGoToDocuments && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onGoToDocuments}
                >
                  <Undo2 className="mr-1 h-4 w-4" />
                  {t('deploy.editDocuments')}
                </Button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {documents.map(doc => {
                const Icon = documentIcons[doc.type as keyof typeof documentIcons] || FileText
                return (
                  <Badge key={doc.id} variant="secondary" className="gap-1">
                    <Icon className="h-3 w-3" />
                    {doc.title}
                    {doc.is_confirmed && <Check className="h-3 w-3 text-green-500" />}
                  </Badge>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 액션 버튼들 */}
      {!isCompleted && (
        <Card>
          <CardContent className="py-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="font-semibold">{t('deploy.completeProject')}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('deploy.completeProjectDesc')}
                </p>
              </div>
              <Button
                size="lg"
                onClick={handleComplete}
                disabled={isCompleting}
              >
                {isCompleting ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    {t('common.processing')}
                  </>
                ) : (
                  <>
                    <Rocket className="mr-2 h-5 w-5" />
                    {t('deploy.completeGate4')}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 쇼케이스 공개 설정 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            {t('deploy.visibility')}
          </CardTitle>
          <CardDescription>{t('deploy.visibilityDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            {([
              {
                value: 'public',
                label: t('deploy.visibilityPublic'),
                desc: t('deploy.visibilityPublicDesc'),
                icon: Eye,
                disabled: !isCompleted,
              },
              {
                value: 'summary',
                label: t('deploy.visibilitySummary'),
                desc: t('deploy.visibilitySummaryDesc'),
                icon: Eye,
                disabled: false,
              },
              {
                value: 'private',
                label: t('deploy.visibilityPrivate'),
                desc: t('deploy.visibilityPrivateDesc'),
                icon: EyeOff,
                disabled: false,
              },
            ] as const).map((option) => (
              <button
                key={option.value}
                onClick={() => handleVisibilityChange(option.value)}
                disabled={isUpdatingVisibility || option.disabled}
                className={`rounded-lg border-2 p-4 text-left transition-all ${
                  visibility === option.value
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-muted-foreground/50'
                } ${option.disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
              >
                <div className="flex items-center gap-2">
                  <option.icon className="h-4 w-4" />
                  <span className="font-medium text-sm">{option.label}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{option.desc}</p>
                {option.value === 'public' && !isCompleted && (
                  <p className="mt-1 text-xs text-orange-500">{t('deploy.visibilityGate4Required')}</p>
                )}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 배포/공유 옵션 */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5" />
              {t('deploy.share')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {shareUrl ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  className="flex-1 rounded border bg-muted px-3 py-2 text-sm"
                />
                <Button size="icon" variant="outline" onClick={handleCopyShareUrl}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button className="w-full" onClick={handleGenerateShareUrl}>
                <Share2 className="mr-2 h-4 w-4" />
                {t('deploy.generateShareLink')}
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              {t('deploy.deployLanding')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {landingUrl ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={landingUrl}
                    readOnly
                    className="flex-1 rounded border bg-muted px-3 py-2 text-sm"
                  />
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(landingUrl)
                      toast.success(t('deploy.urlCopied'))
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => window.open(landingUrl, '_blank')}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  {t('deploy.openPage')}
                </Button>
              </div>
            ) : (
              <Button
                className="w-full"
                onClick={handleDeployLanding}
                disabled={isDeploying}
              >
                {isDeploying ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    {t('deploy.deploying')}
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    {t('deploy.deployLanding')}
                  </>
                )}
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              {t('document.download')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={handleDownloadAll}>
              <Download className="mr-2 h-4 w-4" />
              {t('deploy.downloadAll')}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* 완료 메시지 */}
      {isCompleted && (
        <Card className="border-green-500 bg-green-50 dark:bg-green-950">
          <CardContent className="flex items-center gap-4 py-6">
            <div className="rounded-full bg-green-500 p-2">
              <Check className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-green-700 dark:text-green-300">
                {t('deploy.projectComplete')}
              </h3>
              <p className="text-sm text-green-600 dark:text-green-400">
                {t('deploy.projectCompleteDesc')}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
