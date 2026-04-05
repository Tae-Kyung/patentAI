'use client'

import { useState, useCallback, useRef } from 'react'
import { useTranslations } from 'next-intl'
import {
  FileText,
  Presentation,
  Globe,
  Monitor,
  Newspaper,
  BarChart3,
  ClipboardList,
  Image as ImageIcon,
  Check,
  RefreshCw,
  Download,
  ChevronDown,
  ChevronUp,
  Eye,
  AlertTriangle,
  Edit3,
  ArrowLeft,
  Undo2,
  PlayCircle,
} from 'lucide-react'
import { exportToPdf, exportToDocx, exportToPptx, exportImagesToPdf } from '@/lib/utils/document-export'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/common/loading-spinner'
import { CreditCostBadge } from '@/components/common/credit-cost-badge'
import { AiDisclaimer } from '@/components/common/ai-disclaimer'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import type { Document as DocType } from '@/types/database'
import { extractSections } from '../utils'
import { DocumentPreviewDialog } from './DocumentPreviewDialog'
import { SectionReviseDialog } from './SectionReviseDialog'
import { GoBackConfirmDialog } from './GoBackConfirmDialog'

interface DocumentStageProps {
  projectId: string
  documents: DocType[]
  isGate3Passed: boolean
  canGenerate: boolean  // Gate 2가 통과되었는지
  onUpdate: () => void
}

type DocumentTypeKey = 'business_plan' | 'pitch' | 'landing' | 'ppt' | 'ppt_image' | 'leaflet' | 'infographic' | 'startup_application' | 'u300_plan'

const REQUIRED_DOC_TYPES: DocumentTypeKey[] = ['business_plan', 'pitch', 'landing']
const OPTIONAL_DOC_TYPES: DocumentTypeKey[] = ['ppt', 'ppt_image', 'leaflet', 'infographic']
const COMPETITION_DOC_TYPES: DocumentTypeKey[] = ['startup_application', 'u300_plan']
const HTML_DOC_TYPES = new Set<string>(['landing', 'ppt'])
const IMAGE_DOC_TYPES = new Set<string>(['infographic', 'leaflet'])
const MULTI_IMAGE_DOC_TYPES = new Set<string>(['ppt_image'])
// 비스트리밍 JSON 응답 타입
const JSON_RESPONSE_DOC_TYPES = new Set<string>(['infographic', 'leaflet', 'ppt_image'])

export function DocumentStage({
  projectId,
  documents,
  isGate3Passed,
  canGenerate,
  onUpdate,
}: DocumentStageProps) {
  const t = useTranslations()

  const documentConfig: Record<DocumentTypeKey, {
    icon: typeof FileText
    label: string
    description: string
    apiPath: string
  }> = {
    business_plan: {
      icon: FileText,
      label: t('document.businessPlan'),
      description: t('documentStage.businessPlanDesc'),
      apiPath: 'business-plan',
    },
    pitch: {
      icon: Presentation,
      label: t('document.pitch'),
      description: t('documentStage.pitchDesc'),
      apiPath: 'pitch',
    },
    landing: {
      icon: Globe,
      label: t('document.landing'),
      description: t('documentStage.landingDesc'),
      apiPath: 'landing',
    },
    ppt: {
      icon: Monitor,
      label: t('document.ppt'),
      description: t('documentStage.pptDesc'),
      apiPath: 'ppt',
    },
    ppt_image: {
      icon: ImageIcon,
      label: t('document.pptImage'),
      description: t('documentStage.pptImageDesc'),
      apiPath: 'ppt-image',
    },
    leaflet: {
      icon: Newspaper,
      label: t('document.leaflet'),
      description: t('documentStage.leafletDesc'),
      apiPath: 'leaflet',
    },
    infographic: {
      icon: BarChart3,
      label: t('document.infographic'),
      description: t('documentStage.infographicDesc'),
      apiPath: 'infographic',
    },
    startup_application: {
      icon: ClipboardList,
      label: t('document.startupApplication'),
      description: t('documentStage.startupApplicationDesc'),
      apiPath: 'startup-application',
    },
    u300_plan: {
      icon: FileText,
      label: t('document.u300Plan'),
      description: t('documentStage.u300PlanDesc'),
      apiPath: 'u300-plan',
    },
  }
  const [generatingTypes, setGeneratingTypes] = useState<Set<DocumentTypeKey>>(new Set())
  const streamingMapRef = useRef<Map<DocumentTypeKey, { content: string; length: number; model: string | null }>>(new Map())
  const [, forceUpdate] = useState(0)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [previewDoc, setPreviewDoc] = useState<DocType | null>(null)

  // 섹션 수정 관련 상태
  const [reviseDoc, setReviseDoc] = useState<DocType | null>(null)
  const [reviseSection, setReviseSection] = useState('')
  const [reviseInstruction, setReviseInstruction] = useState('')
  const [isRevising, setIsRevising] = useState(false)
  const [reviseStreamContent, setReviseStreamContent] = useState('')

  // 문서 확정 해제 관련 상태
  const [unconfirmingId, setUnconfirmingId] = useState<string | null>(null)

  // 섹션 접기/펼치기 상태
  const [isOptionalOpen, setIsOptionalOpen] = useState(false)
  const [isCompetitionOpen, setIsCompetitionOpen] = useState(true)

  // 평가 단계로 돌아가기 관련 상태
  const [showGoBackDialog, setShowGoBackDialog] = useState(false)
  const [isGoingBack, setIsGoingBack] = useState(false)

  // 문서 타입별로 매핑
  const docByType: Partial<Record<DocumentTypeKey, DocType>> = {}
  documents.forEach(doc => {
    docByType[doc.type as DocumentTypeKey] = doc
  })

  const handleGenerate = useCallback(async (type: DocumentTypeKey) => {
    setGeneratingTypes(prev => new Set(prev).add(type))
    streamingMapRef.current.set(type, { content: '', length: 0, model: null })
    forceUpdate(n => n + 1)

    try {
      const response = await fetch(
        `/api/projects/${projectId}/documents/${documentConfig[type].apiPath}`,
        { method: 'POST' }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || t('documentStage.generateFailed'))
      }

      // 이미지/PPT 이미지 타입은 JSON 응답 (비스트리밍)
      if (JSON_RESPONSE_DOC_TYPES.has(type)) {
        const result = await response.json()
        if (result.success) {
          toast.success(t('documentStage.generateComplete', { label: documentConfig[type].label }))
          onUpdate()
        } else {
          throw new Error(result.error || t('documentStage.generateFailed'))
        }
        return
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error(t('documentStage.streamError'))
      }

      let buffer = ''
      let totalLength = 0

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const blocks = buffer.split('\n\n')
        buffer = blocks.pop() || ''

        for (const block of blocks) {
          const lines = block.split('\n')
          const eventLine = lines.find(l => l.startsWith('event: '))
          const dataLine = lines.find(l => l.startsWith('data: '))
          if (!dataLine) continue

          const eventType = eventLine ? eventLine.slice(7) : null
          const rawData = dataLine.slice(6)

          if (eventType === 'error') {
            let errorMsg = rawData
            try { errorMsg = JSON.parse(rawData) } catch { /* raw string 사용 */ }
            throw new Error(typeof errorMsg === 'string' ? errorMsg : String(errorMsg))
          }

          try {
            const parsed = JSON.parse(rawData)

            if (eventType === 'start') {
              try {
                const inner = typeof parsed === 'string' ? JSON.parse(parsed) : parsed
                if (inner.model) {
                  const entry = streamingMapRef.current.get(type)
                  if (entry) entry.model = inner.model
                  forceUpdate(n => n + 1)
                }
              } catch { /* ignore */ }
            } else if (eventType === 'text') {
              const text = typeof parsed === 'string' ? parsed : String(parsed)
              totalLength += text.length
              const entry = streamingMapRef.current.get(type)
              if (entry) {
                entry.content += text
                entry.length = totalLength
              }
              forceUpdate(n => n + 1)
            } else if (eventType === 'complete') {
              toast.success(t('documentStage.generateComplete', { label: documentConfig[type].label }))
              onUpdate()
            }
          } catch {
            // JSON 파싱 오류 무시
          }
        }
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('documentStage.generateFailed'))
    } finally {
      setGeneratingTypes(prev => {
        const next = new Set(prev)
        next.delete(type)
        return next
      })
      streamingMapRef.current.delete(type)
      forceUpdate(n => n + 1)
    }
  }, [projectId, onUpdate])

  const handleGenerateAll = async () => {
    const toGenerate = REQUIRED_DOC_TYPES.filter(type => !docByType[type])
    if (toGenerate.length === 0) return
    await Promise.allSettled(toGenerate.map(type => handleGenerate(type)))
  }

  const handleConfirm = async (docId: string) => {
    setConfirmingId(docId)
    try {
      const response = await fetch(
        `/api/projects/${projectId}/documents/${docId}/confirm`,
        { method: 'POST' }
      )

      const result = await response.json()

      if (result.success) {
        toast.success(result.data.message)
        onUpdate()
      } else {
        toast.error(result.error || t('toast.confirmFailed'))
      }
    } catch {
      toast.error(t('toast.confirmFailed'))
    } finally {
      setConfirmingId(null)
    }
  }

  const handleUnconfirm = async (docId: string) => {
    setUnconfirmingId(docId)
    try {
      const response = await fetch(
        `/api/projects/${projectId}/documents/${docId}/unconfirm`,
        { method: 'POST' }
      )

      const result = await response.json()

      if (result.success) {
        toast.success(t('documentStage.unconfirmSuccess'))
        onUpdate()
      } else {
        toast.error(result.error || t('documentStage.unconfirmFailed'))
      }
    } catch {
      toast.error(t('documentStage.unconfirmFailed'))
    } finally {
      setUnconfirmingId(null)
    }
  }

  const handleDownloadMd = (doc: DocType) => {
    if (!doc.content) return

    const isHtmlType = HTML_DOC_TYPES.has(doc.type)
    const blob = new Blob([doc.content], {
      type: isHtmlType ? 'text/html' : 'text/markdown'
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = isHtmlType ? `${doc.title}.html` : `${doc.title}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleDownloadPdf = (doc: DocType) => {
    if (!doc.content) return
    exportToPdf(doc.title, doc.content)
  }

  const handleDownloadDocx = (doc: DocType) => {
    if (!doc.content) return
    try {
      exportToDocx(doc.title, doc.content)
    } catch {
      toast.error(t('documentStage.wordExportFailed'))
    }
  }

  const handleDownloadPptx = (doc: DocType) => {
    if (!doc.content) return
    try {
      exportToPptx(doc.title, doc.content)
    } catch {
      toast.error(t('documentStage.pptExportFailed'))
    }
  }

  const handleRevise = async () => {
    if (!reviseDoc || !reviseSection.trim() || !reviseInstruction.trim()) return

    setIsRevising(true)
    setReviseStreamContent('')

    try {
      const response = await fetch(
        `/api/projects/${projectId}/documents/${reviseDoc.id}/revise`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            section: reviseSection,
            instruction: reviseInstruction,
          }),
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || t('documentStage.reviseFailed'))
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error(t('documentStage.streamError'))
      }

      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('event: ')) continue

          const eventMatch = line.match(/event: (\w+)\ndata: (.*)/)
          if (!eventMatch) continue

          const [, eventType, data] = eventMatch

          if (eventType === 'text') {
            try {
              const text = JSON.parse(data)
              setReviseStreamContent(prev => prev + text)
            } catch {
              // 파싱 오류 무시
            }
          } else if (eventType === 'complete') {
            toast.success(t('documentStage.reviseComplete'))
            onUpdate()
            setReviseDoc(null)
            setReviseSection('')
            setReviseInstruction('')
          }
        }
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('documentStage.reviseFailed'))
    } finally {
      setIsRevising(false)
      setReviseStreamContent('')
    }
  }

  const handleGoBack = async () => {
    setIsGoingBack(true)
    try {
      const response = await fetch(
        `/api/projects/${projectId}/evaluation/reset`,
        { method: 'POST' }
      )
      const result = await response.json()
      if (result.success) {
        toast.success(t('documentStage.goBackSuccess'))
        setShowGoBackDialog(false)
        onUpdate()
      } else {
        toast.error(result.error || t('documentStage.goBackFailed'))
      }
    } catch {
      toast.error(t('documentStage.goBackFailed'))
    } finally {
      setIsGoingBack(false)
    }
  }

  if (!canGenerate) {
    return (
      <Card className="border-orange-500 bg-orange-50 dark:bg-orange-950">
        <CardContent className="flex items-center gap-4 py-6">
          <div className="rounded-full bg-orange-500 p-2">
            <AlertTriangle className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-orange-700 dark:text-orange-300">
              {t('documentStage.gate2Required')}
            </h3>
            <p className="text-sm text-orange-600 dark:text-orange-400">
              {t('documentStage.gate2RequiredDesc')}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // 필수 문서 3개 기준으로만 카운트
  const requiredDocs = documents.filter(d => REQUIRED_DOC_TYPES.includes(d.type as DocumentTypeKey))
  const confirmedCount = requiredDocs.filter(d => d.is_confirmed).length

  const isAnyGenerating = generatingTypes.size > 0

  const renderDocCard = (type: DocumentTypeKey, config: typeof documentConfig.business_plan) => {
    const Icon = config.icon
    const doc = docByType[type]
    const isGenerating = generatingTypes.has(type)
    const streamInfo = streamingMapRef.current.get(type)
    const isConfirming = confirmingId === doc?.id
    const isHtmlType = HTML_DOC_TYPES.has(type)
    const isImageType = IMAGE_DOC_TYPES.has(type)
    const isMultiImageType = MULTI_IMAGE_DOC_TYPES.has(type)
    const isJsonResponse = JSON_RESPONSE_DOC_TYPES.has(type)
    const noRevise = isHtmlType || isImageType || isMultiImageType

    return (
      <Card key={type} className={doc?.is_confirmed ? 'border-green-500' : ''}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon className="h-5 w-5" />
              <CardTitle className="text-base">{config.label}</CardTitle>
            </div>
            {doc?.is_confirmed && (
              <Badge className="bg-green-500">{t('documentStage.confirmed')}</Badge>
            )}
          </div>
          <CardDescription>{config.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isGenerating ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <LoadingSpinner size="sm" />
                <span className="text-sm">{t('documentStage.generating')}</span>
                {streamInfo?.model && (
                  <Badge variant="outline" className="text-xs">
                    {streamInfo.model}
                  </Badge>
                )}
              </div>
              {isMultiImageType && (
                <p className="text-xs text-muted-foreground">
                  {t('documentStage.generatingSlides')}
                </p>
              )}
              {!isJsonResponse && (streamInfo?.length ?? 0) > 0 && (
                <p className="text-xs text-muted-foreground">
                  {t('documentStage.generatingChars', { count: (streamInfo?.length ?? 0).toLocaleString() })}
                </p>
              )}
              {!isJsonResponse && streamInfo?.content && (
                <div className="max-h-32 overflow-y-auto rounded bg-muted p-2">
                  <pre className="whitespace-pre-wrap text-xs">
                    {streamInfo.content.slice(-500)}...
                  </pre>
                </div>
              )}
            </div>
          ) : doc ? (
            <div className="space-y-2">
              {/* 이미지 타입: 썸네일 미리보기 */}
              {isImageType && doc.storage_path && (
                <div className="overflow-hidden rounded border">
                  <img
                    src={doc.storage_path}
                    alt={doc.title}
                    className="h-40 w-full cursor-pointer object-cover transition-opacity hover:opacity-80"
                    onClick={() => setPreviewDoc(doc)}
                  />
                </div>
              )}
              {/* 멀티 이미지 타입: 첫 번째 이미지 썸네일 + 슬라이드 수 */}
              {isMultiImageType && doc.storage_path && (
                <div className="overflow-hidden rounded border relative">
                  <img
                    src={doc.storage_path}
                    alt={doc.title}
                    className="h-40 w-full cursor-pointer object-cover transition-opacity hover:opacity-80"
                    onClick={() => setPreviewDoc(doc)}
                  />
                  {doc.content && (() => {
                    try {
                      const urls = JSON.parse(doc.content)
                      if (Array.isArray(urls)) {
                        return (
                          <span className="absolute bottom-2 right-2 rounded bg-black/60 px-2 py-0.5 text-xs text-white">
                            {urls.length} {t('documentStage.slides')}
                          </span>
                        )
                      }
                    } catch { /* ignore */ }
                    return null
                  })()}
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>{t('documentStage.createdAt', { date: new Date(doc.created_at).toLocaleDateString() })}</span>
                {doc.ai_model_used && (
                  <Badge variant="outline" className="text-xs">
                    {doc.ai_model_used}
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPreviewDoc(doc)}
                >
                  <Eye className="mr-1 h-4 w-4" />
                  {t('document.preview')}
                </Button>
                {isMultiImageType ? (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        try {
                          const urls = JSON.parse(doc.content || '[]')
                          if (Array.isArray(urls) && urls.length > 0) {
                            exportImagesToPdf(doc.title, urls)
                          }
                        } catch { /* ignore */ }
                      }}
                    >
                      <Download className="mr-1 h-4 w-4" />
                      PDF
                    </Button>
                  </>
                ) : isImageType ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (doc.storage_path) {
                        const a = document.createElement('a')
                        a.href = doc.storage_path
                        a.download = doc.file_name || `${doc.title}.png`
                        a.target = '_blank'
                        document.body.appendChild(a)
                        a.click()
                        document.body.removeChild(a)
                      }
                    }}
                  >
                    <Download className="mr-1 h-4 w-4" />
                    {t('document.download')}
                  </Button>
                ) : isHtmlType ? (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownloadMd(doc)}
                    >
                      <Download className="mr-1 h-4 w-4" />
                      {t('document.download')}
                    </Button>
                    {type === 'ppt' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownloadPptx(doc)}
                      >
                        <Download className="mr-1 h-4 w-4" />
                        {t('documentStage.downloadPptx')}
                      </Button>
                    )}
                  </>
                ) : (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="outline">
                        <Download className="mr-1 h-4 w-4" />
                        {t('document.downloadAs')}
                        <ChevronDown className="ml-1 h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuItem onClick={() => handleDownloadMd(doc)}>
                        {t('document.downloadMd')}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDownloadPdf(doc)}>
                        {t('document.downloadPdf')}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDownloadDocx(doc)}>
                        {t('document.downloadDoc')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
              {doc.is_confirmed ? (
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleUnconfirm(doc.id)}
                    disabled={unconfirmingId === doc.id}
                  >
                    {unconfirmingId === doc.id ? (
                      <LoadingSpinner size="sm" className="mr-1" />
                    ) : (
                      <Undo2 className="mr-1 h-4 w-4" />
                    )}
                    {t('documentStage.unconfirm')}
                  </Button>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2 pt-2">
                  {!noRevise && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setReviseDoc(doc)
                        setReviseSection('')
                        setReviseInstruction('')
                      }}
                      disabled={isAnyGenerating}
                    >
                      <Edit3 className="mr-1 h-4 w-4" />
                      {t('documentStage.sectionRevise')}
                      <CreditCostBadge cost={1} className="ml-1" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleGenerate(type)}
                    disabled={isAnyGenerating}
                  >
                    <RefreshCw className="mr-1 h-4 w-4" />
                    {t('documentStage.regenerate')}
                    <CreditCostBadge cost={type === 'ppt_image' ? 5 : 1} className="ml-1" />
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleConfirm(doc.id)}
                    disabled={isConfirming}
                  >
                    {isConfirming ? (
                      <LoadingSpinner size="sm" className="mr-1" />
                    ) : (
                      <Check className="mr-1 h-4 w-4" />
                    )}
                    {t('common.confirm')}
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <Button
              className="w-full"
              onClick={() => handleGenerate(type)}
              disabled={isAnyGenerating}
            >
              {t('documentStage.generate', { label: config.label })}
              <CreditCostBadge cost={type === 'ppt_image' ? 5 : 1} className="ml-2" />
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <AiDisclaimer />
      {/* 진행 상태 요약 */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">{t('documentStage.docStatus')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('documentStage.docStatusDesc')}
              </p>
            </div>
            <Badge variant={confirmedCount === 3 ? 'default' : 'secondary'}>
              {t('documentStage.confirmedCount', { count: confirmedCount })}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* 평가 단계로 돌아가기 */}
      {!isGate3Passed && (
        <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <ArrowLeft className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <div>
                <h3 className="font-medium text-blue-700 dark:text-blue-300">
                  {t('documentStage.goBackToEvaluation')}
                </h3>
                <p className="text-sm text-blue-600 dark:text-blue-400">
                  {confirmedCount > 0
                    ? t('documentStage.goBackHasConfirmedDocs')
                    : t('documentStage.goBackToEvaluationDesc')}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowGoBackDialog(true)}
              disabled={confirmedCount > 0}
              className="border-blue-300 text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:text-blue-300 dark:hover:bg-blue-900"
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              {t('documentStage.goBackToEvaluation')}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Gate 3 통과 시 확정 해제 안내 */}
      {isGate3Passed && (
        <Card className="border-green-500 bg-green-50 dark:bg-green-950">
          <CardContent className="flex items-center justify-between py-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-green-500 p-2">
                <Check className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-green-700 dark:text-green-300">
                  {t('documentStage.gate3Passed')}
                </h3>
                <p className="text-sm text-green-600 dark:text-green-400">
                  {t('documentStage.gate3PassedDesc')}
                </p>
              </div>
            </div>
            <p className="text-sm text-green-600 dark:text-green-400">
              {t('documentStage.unconfirmHint')}
            </p>
          </CardContent>
        </Card>
      )}

      {/* 필수 문서 (Gate 3) */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-muted-foreground">
            {t('documentStage.requiredDocs')}
          </h3>
          {(() => {
            const ungeneratedRequired = REQUIRED_DOC_TYPES.filter(type => !docByType[type])
            if (ungeneratedRequired.length < 2) return null
            return (
              <Button
                size="sm"
                onClick={handleGenerateAll}
                disabled={isAnyGenerating}
              >
                <PlayCircle className="mr-1 h-4 w-4" />
                {isAnyGenerating
                  ? t('documentStage.generatingCount', { count: generatingTypes.size })
                  : t('documentStage.generateAll', { count: ungeneratedRequired.length })}
                <CreditCostBadge cost={ungeneratedRequired.length} className="ml-1" />
              </Button>
            )
          })()}
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {REQUIRED_DOC_TYPES.map(type => renderDocCard(type, documentConfig[type]))}
        </div>
      </div>

      {/* 추가 문서 (선택) */}
      <div>
        <button
          className="mb-3 flex w-full items-center justify-between text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => setIsOptionalOpen(prev => !prev)}
        >
          <span>{t('documentStage.optionalDocs')}</span>
          {isOptionalOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {isOptionalOpen && (
          <div className="grid gap-4 md:grid-cols-3">
            {OPTIONAL_DOC_TYPES.map(type => renderDocCard(type, documentConfig[type]))}
          </div>
        )}
      </div>

      {/* 공모전/지원사업 서류 */}
      <div>
        <button
          className="mb-3 flex w-full items-center justify-between text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => setIsCompetitionOpen(prev => !prev)}
        >
          <span>{t('documentStage.competitionDocs')}</span>
          {isCompetitionOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {isCompetitionOpen && (
          <div className="grid gap-4 md:grid-cols-3">
            {COMPETITION_DOC_TYPES.map(type => renderDocCard(type, documentConfig[type]))}
          </div>
        )}
      </div>

      {/* Gate 3 통과 메시지 - 하단에도 표시 */}
      {isGate3Passed && (
        <Card className="border-green-500 bg-green-50 dark:bg-green-950">
          <CardContent className="flex items-center gap-4 py-6">
            <div className="rounded-full bg-green-500 p-2">
              <Check className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-green-700 dark:text-green-300">
                {t('documentStage.gate3Passed')}
              </h3>
              <p className="text-sm text-green-600 dark:text-green-400">
                {t('documentStage.gate3PassedDesc')}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <DocumentPreviewDialog doc={previewDoc} onClose={() => setPreviewDoc(null)} />

      <GoBackConfirmDialog
        open={showGoBackDialog}
        isLoading={isGoingBack}
        onOpenChange={setShowGoBackDialog}
        onConfirm={handleGoBack}
      />

      <SectionReviseDialog
        open={!!reviseDoc}
        title={reviseDoc?.title || ''}
        sections={extractSections(reviseDoc?.content || '', reviseDoc?.type)}
        reviseSection={reviseSection}
        reviseInstruction={reviseInstruction}
        isRevising={isRevising}
        reviseStreamContent={reviseStreamContent}
        onClose={() => setReviseDoc(null)}
        onSectionChange={setReviseSection}
        onInstructionChange={setReviseInstruction}
        onRevise={handleRevise}
      />
    </div>
  )
}
