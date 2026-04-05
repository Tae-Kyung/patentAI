'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import {
  Sparkles, Edit2, Check, Wand2, Save, Download,
  Search, Building2, TrendingUp, Undo2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/common/loading-spinner'
import { CreditCostBadge } from '@/components/common/credit-cost-badge'
import { AiDisclaimer } from '@/components/common/ai-disclaimer'
import { useSSE } from '@/hooks/useSSE'
import { toast } from 'sonner'
import type { IdeaCard } from '@/types/database'

interface IdeaStageProps {
  projectId: string
  ideaCard: IdeaCard | null
  isConfirmed: boolean
  canCancelConfirm?: boolean
  onUpdate: () => void
}

interface ExpandedIdea {
  problem?: string
  solution?: string
  target?: string
  differentiation?: string
  uvp?: string
  channels?: string
  revenue_streams?: string
  revenueStreams?: string
  cost_structure?: string
  costStructure?: string
  key_metrics?: string
  keyMetrics?: string
  marketSize?: string
  revenueModel?: string
  challenges?: string[]
  raw?: string
}

interface CanvasData {
  problem: string
  solution: string
  target: string
  differentiation: string
  uvp: string
  channels: string
  revenue_streams: string
  cost_structure: string
  key_metrics: string
}

interface SimilarCompany {
  name: string
  description: string
  stage: string
  funding: string
  similarity: number
  similarPoints: string
}

// 캔버스 블록 렌더링 컴포넌트 (리렌더 시 언마운트 방지를 위해 외부 정의)
function CanvasBlock({
  label,
  field,
  value,
  onChange,
  className = '',
  rows = 4,
  isLoading = false,
  disabled = false,
}: {
  label: string
  field: string
  value: string
  onChange: (field: keyof CanvasData, value: string) => void
  className?: string
  rows?: number
  isLoading?: boolean
  disabled?: boolean
}) {
  return (
    <div className={`border border-border p-3 ${className}`}>
      <h3 className="mb-1.5 text-xs font-bold text-foreground/80">{label}</h3>
      {isLoading ? (
        <div className="flex h-16 items-center justify-center">
          <LoadingSpinner size="sm" />
        </div>
      ) : (
        <textarea
          value={value}
          onChange={(e) => onChange(field as keyof CanvasData, e.target.value)}
          className="w-full resize-none border-0 bg-transparent p-0 text-sm leading-relaxed text-muted-foreground outline-none focus:text-foreground"
          rows={rows}
          disabled={disabled}
          placeholder="-"
        />
      )}
    </div>
  )
}

function normalizeCanvas(idea: ExpandedIdea | IdeaCard): CanvasData {
  const get = (val: unknown) => (typeof val === 'string' ? val : '')
  if ('raw_input' in idea) {
    // IdeaCard from DB
    const card = idea as IdeaCard
    return {
      problem: get(card.problem),
      solution: get(card.solution),
      target: get(card.target),
      differentiation: get(card.differentiation),
      uvp: get(card.uvp),
      channels: get(card.channels),
      revenue_streams: get(card.revenue_streams),
      cost_structure: get(card.cost_structure),
      key_metrics: get(card.key_metrics),
    }
  }
  // ExpandedIdea from AI
  const ei = idea as ExpandedIdea
  return {
    problem: get(ei.problem),
    solution: get(ei.solution),
    target: get(ei.target),
    differentiation: get(ei.differentiation),
    uvp: get(ei.uvp),
    channels: get(ei.channels),
    revenue_streams: get(ei.revenue_streams || ei.revenueStreams),
    cost_structure: get(ei.cost_structure || ei.costStructure),
    key_metrics: get(ei.key_metrics || ei.keyMetrics),
  }
}

export function IdeaStage({
  projectId,
  ideaCard,
  isConfirmed,
  canCancelConfirm = false,
  onUpdate,
}: IdeaStageProps) {
  const t = useTranslations()
  const [rawInput, setRawInput] = useState(ideaCard?.raw_input || '')
  const [isEditing, setIsEditing] = useState(!ideaCard)
  const [isSaving, setIsSaving] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)
  const [isCancellingConfirm, setIsCancellingConfirm] = useState(false)
  const [isSavingCanvas, setIsSavingCanvas] = useState(false)
  const [expandedIdea, setExpandedIdea] = useState<ExpandedIdea | null>(
    ideaCard?.ai_expanded as ExpandedIdea || null
  )

  // 린 캔버스 편집 상태
  const [canvasData, setCanvasData] = useState<CanvasData>(() => {
    if (ideaCard?.problem) return normalizeCanvas(ideaCard)
    if (ideaCard?.ai_expanded) return normalizeCanvas(ideaCard.ai_expanded as ExpandedIdea)
    return { problem: '', solution: '', target: '', differentiation: '', uvp: '', channels: '', revenue_streams: '', cost_structure: '', key_metrics: '' }
  })

  // 유사 기업 상태 (DB에서 복원)
  const [similarCompanies, setSimilarCompanies] = useState<SimilarCompany[]>(() => {
    if (ideaCard?.similar_companies && Array.isArray(ideaCard.similar_companies)) {
      return ideaCard.similar_companies as unknown as SimilarCompany[]
    }
    return []
  })
  const [isExportingPdf, setIsExportingPdf] = useState(false)

  const { data: streamData, isLoading: isExpanding, start: startExpand } = useSSE({
    onDone: () => {
      onUpdate()
    },
    onError: (error) => {
      toast.error(t('ideaStage.aiExpandError', { error }))
    },
  })

  // AI 내용 완성 SSE
  const { isLoading: isEnhancing, start: startEnhance } = useSSE({
    onMessage: (chunk) => {
      setRawInput((prev) => prev + chunk)
    },
    onError: (error) => {
      toast.error(t('ideaStage.enhanceError', { error }))
    },
  })

  // 유사 기업 탐색 SSE
  const { data: similarData, isLoading: isSearchingSimilar, start: startSimilarSearch } = useSSE({
    onError: (error) => {
      toast.error(error)
    },
  })

  // 스트리밍 데이터 파싱
  useEffect(() => {
    if (streamData) {
      try {
        let cleanData = streamData.trim()
        const fenceMatch = cleanData.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```$/)
        if (fenceMatch) {
          cleanData = fenceMatch[1].trim()
        }
        const parsed = JSON.parse(cleanData)
        setExpandedIdea(parsed)
        setCanvasData(normalizeCanvas(parsed))
      } catch {
        setExpandedIdea({ raw: streamData })
      }
    }
  }, [streamData])

  // 유사 기업 데이터 파싱
  useEffect(() => {
    if (similarData) {
      try {
        let cleanData = similarData.trim()
        const fenceMatch = cleanData.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```$/)
        if (fenceMatch) {
          cleanData = fenceMatch[1].trim()
        }
        const parsed = JSON.parse(cleanData)
        if (parsed.companies) {
          setSimilarCompanies(parsed.companies)
        }
      } catch {
        // 파싱 실패 시 무시
      }
    }
  }, [similarData])

  const handleCanvasChange = useCallback((field: keyof CanvasData, value: string) => {
    setCanvasData(prev => ({ ...prev, [field]: value }))
  }, [])

  const handleSave = async () => {
    if (rawInput.length < 50) {
      toast.error(t('ideaStage.writeMore'))
      return
    }

    setIsSaving(true)
    try {
      const method = ideaCard ? 'PATCH' : 'POST'
      const response = await fetch(`/api/projects/${projectId}/idea`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw_input: rawInput }),
      })

      const result = await response.json()

      if (result.success) {
        toast.success(t('ideaStage.saved'))
        setIsEditing(false)
        onUpdate()
      } else {
        toast.error(result.error || t('toast.saveFailed'))
      }
    } catch {
      toast.error(t('toast.saveFailed'))
    } finally {
      setIsSaving(false)
    }
  }

  const handleEnhance = async () => {
    setRawInput('')
    startEnhance(`/api/projects/${projectId}/idea/enhance`, {
      raw_input: rawInput,
    })
  }

  const handleExpand = async () => {
    setExpandedIdea(null)
    startExpand(`/api/projects/${projectId}/idea/expand`)
  }

  const handleSaveCanvas = async () => {
    setIsSavingCanvas(true)
    try {
      const response = await fetch(`/api/projects/${projectId}/idea/canvas`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(canvasData),
      })
      const result = await response.json()
      if (result.success) {
        toast.success(t('idea.canvasSaved'))
        onUpdate()
      } else {
        toast.error(result.error || t('idea.canvasSaveFailed'))
      }
    } catch {
      toast.error(t('idea.canvasSaveFailed'))
    } finally {
      setIsSavingCanvas(false)
    }
  }

  const handleExportPdf = async () => {
    setIsExportingPdf(true)
    try {
      const response = await fetch(`/api/projects/${projectId}/idea/canvas-pdf`)
      if (!response.ok) throw new Error('Failed')
      const html = await response.text()

      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(html)
        printWindow.document.close()
        printWindow.onload = () => {
          printWindow.print()
        }
        toast.success(t('idea.pdfExported'))
      }
    } catch {
      toast.error(t('idea.pdfExportFailed'))
    } finally {
      setIsExportingPdf(false)
    }
  }

  const handleSearchSimilar = () => {
    setSimilarCompanies([])
    startSimilarSearch(`/api/projects/${projectId}/idea/similar-companies`)
  }

  const handleConfirm = async () => {
    setIsConfirming(true)
    try {
      const response = await fetch(`/api/projects/${projectId}/idea/confirm`, {
        method: 'POST',
      })

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
      setIsConfirming(false)
    }
  }

  const handleCancelConfirm = async () => {
    setIsCancellingConfirm(true)
    try {
      const response = await fetch(`/api/projects/${projectId}/idea/cancel-confirm`, {
        method: 'POST',
      })

      const result = await response.json()

      if (result.success) {
        toast.success(t('idea.cancelConfirmSuccess'))
        onUpdate()
      } else {
        toast.error(result.error || t('idea.cancelConfirmFailed'))
      }
    } catch {
      toast.error(t('idea.cancelConfirmFailed'))
    } finally {
      setIsCancellingConfirm(false)
    }
  }

  const hasCanvasData = canvasData.problem || canvasData.solution || canvasData.target

  return (
    <div className="space-y-6">
      <AiDisclaimer />
      {/* 아이디어 입력/표시 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t('idea.title')}</CardTitle>
          {ideaCard && !isConfirmed && !isEditing && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
            >
              <Edit2 className="mr-2 h-4 w-4" />
              {t('common.edit')}
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {isEditing || !ideaCard ? (
            <>
              <p className="text-sm text-muted-foreground">
                {t('idea.description')}
              </p>
              <Textarea
                value={rawInput}
                onChange={(e) => setRawInput(e.target.value)}
                placeholder={t('idea.placeholder')}
                rows={8}
                disabled={isSaving || isConfirmed || isEnhancing}
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">
                    {rawInput.length}자
                    {rawInput.length < 500 && (
                      <span className="text-orange-500"> ({t('idea.minLength')})</span>
                    )}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleEnhance}
                    disabled={rawInput.length < 50 || isEnhancing || isSaving || isConfirmed}
                  >
                    {isEnhancing ? (
                      <>
                        <LoadingSpinner size="sm" className="mr-2" />
                        {t('idea.enhancing')}
                      </>
                    ) : (
                      <>
                        <Wand2 className="mr-2 h-4 w-4" />
                        {t('idea.enhance')}
                        <CreditCostBadge cost={1} className="ml-1" />
                      </>
                    )}
                  </Button>
                </div>
                <div className="flex gap-2">
                  {ideaCard && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setRawInput(ideaCard.raw_input)
                        setIsEditing(false)
                      }}
                      disabled={isSaving || isEnhancing}
                    >
                      {t('common.cancel')}
                    </Button>
                  )}
                  <Button onClick={handleSave} disabled={isSaving || isEnhancing}>
                    {isSaving ? (
                      <>
                        <LoadingSpinner size="sm" className="mr-2" />
                        {t('common.loading')}
                      </>
                    ) : (
                      t('common.save')
                    )}
                  </Button>
                </div>
              </div>
              {rawInput.length > 0 && rawInput.length < 50 && (
                <p className="text-xs text-muted-foreground">
                  {t('idea.enhanceHint')}
                </p>
              )}
            </>
          ) : (
            <div className="whitespace-pre-wrap rounded bg-muted p-4">
              {ideaCard.raw_input}
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI 확장 버튼 */}
      {ideaCard && !isEditing && !isConfirmed && (
        <div className="flex justify-center">
          <Button
            size="lg"
            onClick={handleExpand}
            disabled={isExpanding}
          >
            {isExpanding ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                {t('idea.expanding')}
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-5 w-5" />
                {expandedIdea ? t('idea.regenerate') : t('idea.expand')}
                <CreditCostBadge cost={1} className="ml-1" />
              </>
            )}
          </Button>
        </div>
      )}

      {/* 린 캔버스 9-Block */}
      {(hasCanvasData || isExpanding) && (
        <Card>
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>{t('idea.leanCanvas')}</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">{t('idea.leanCanvasDesc')}</p>
            </div>
            {hasCanvasData && !isExpanding && (
              <div className="flex gap-2">
                {!isConfirmed && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSaveCanvas}
                    disabled={isSavingCanvas}
                  >
                    {isSavingCanvas ? (
                      <>
                        <LoadingSpinner size="sm" className="mr-2" />
                        {t('idea.savingCanvas')}
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        {t('idea.saveCanvas')}
                      </>
                    )}
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportPdf}
                  disabled={isExportingPdf}
                >
                  {isExportingPdf ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      {t('idea.exportingPdf')}
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      {t('idea.exportPdf')}
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {/* 데스크톱: 5-column grid, 모바일: 스택 */}
            <div className="overflow-hidden rounded-lg border border-border">
              {/* Top Row: 5 columns */}
              <div className="grid grid-cols-1 lg:grid-cols-5">
                {/* Col 1: Problem (tall) */}
                <div className="lg:row-span-2">
                  <CanvasBlock
                    label={t('idea.problem')}
                    field="problem"
                    value={canvasData.problem}
                    onChange={handleCanvasChange}
                    isLoading={isExpanding && !canvasData.problem}
                    disabled={isConfirmed}
                    className="h-full bg-red-50/50 dark:bg-red-950/20"
                    rows={8}
                  />
                </div>

                {/* Col 2 Top: Solution */}
                <CanvasBlock
                  label={t('idea.solution')}
                  field="solution"
                  value={canvasData.solution}
                  onChange={handleCanvasChange}
                  isLoading={isExpanding && !canvasData.solution}
                  disabled={isConfirmed}
                  className="bg-green-50/50 dark:bg-green-950/20"
                  rows={4}
                />

                {/* Col 3: UVP (tall) */}
                <div className="lg:row-span-2">
                  <CanvasBlock
                    label={t('idea.uvp')}
                    field="uvp"
                    value={canvasData.uvp}
                    onChange={handleCanvasChange}
                    isLoading={isExpanding && !canvasData.uvp}
                    disabled={isConfirmed}
                    className="h-full bg-amber-50/50 dark:bg-amber-950/20"
                    rows={8}
                  />
                </div>

                {/* Col 4 Top: Unfair Advantage */}
                <CanvasBlock
                  label={t('idea.differentiation')}
                  field="differentiation"
                  value={canvasData.differentiation}
                  onChange={handleCanvasChange}
                  isLoading={isExpanding && !canvasData.differentiation}
                  disabled={isConfirmed}
                  className="bg-purple-50/50 dark:bg-purple-950/20"
                  rows={4}
                />

                {/* Col 5: Customer Segments (tall) */}
                <div className="lg:row-span-2">
                  <CanvasBlock
                    label={t('idea.target')}
                    field="target"
                    value={canvasData.target}
                    onChange={handleCanvasChange}
                    isLoading={isExpanding && !canvasData.target}
                    disabled={isConfirmed}
                    className="h-full bg-rose-50/50 dark:bg-rose-950/20"
                    rows={8}
                  />
                </div>

                {/* Col 2 Bottom: Key Metrics */}
                <CanvasBlock
                  label={t('idea.keyMetrics')}
                  field="key_metrics"
                  value={canvasData.key_metrics}
                  onChange={handleCanvasChange}
                  isLoading={isExpanding && !canvasData.key_metrics}
                  disabled={isConfirmed}
                  className="bg-blue-50/50 dark:bg-blue-950/20"
                  rows={4}
                />

                {/* Col 4 Bottom: Channels */}
                <CanvasBlock
                  label={t('idea.channels')}
                  field="channels"
                  value={canvasData.channels}
                  onChange={handleCanvasChange}
                  isLoading={isExpanding && !canvasData.channels}
                  disabled={isConfirmed}
                  className="bg-cyan-50/50 dark:bg-cyan-950/20"
                  rows={4}
                />
              </div>

              {/* Bottom Row: Cost + Revenue */}
              <div className="grid grid-cols-1 lg:grid-cols-2">
                <CanvasBlock
                  label={t('idea.costStructure')}
                  field="cost_structure"
                  value={canvasData.cost_structure}
                  onChange={handleCanvasChange}
                  isLoading={isExpanding && !canvasData.cost_structure}
                  disabled={isConfirmed}
                  className="bg-slate-50/50 dark:bg-slate-950/20"
                  rows={3}
                />
                <CanvasBlock
                  label={t('idea.revenueStreams')}
                  field="revenue_streams"
                  value={canvasData.revenue_streams}
                  onChange={handleCanvasChange}
                  isLoading={isExpanding && !canvasData.revenue_streams}
                  disabled={isConfirmed}
                  className="bg-slate-50/50 dark:bg-slate-950/20"
                  rows={3}
                />
              </div>
            </div>

            {/* Raw fallback */}
            {expandedIdea?.raw && (
              <div className="mt-4 rounded-lg border border-border p-4">
                <h3 className="mb-2 text-sm font-semibold">{t('ideaStage.aiResponseRaw')}</h3>
                <pre className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {expandedIdea.raw}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 유사 기업 탐색 */}
      {hasCanvasData && !isExpanding && (
        <Card>
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                {t('idea.similarCompanies')}
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">{t('idea.similarCompaniesDesc')}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSearchSimilar}
              disabled={isSearchingSimilar}
            >
              {isSearchingSimilar ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  {t('idea.searchingSimilar')}
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  {t('idea.searchSimilar')}
                  <CreditCostBadge cost={1} className="ml-1" />
                </>
              )}
            </Button>
          </CardHeader>
          <CardContent>
            {similarCompanies.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {similarCompanies.map((company, idx) => (
                  <div
                    key={idx}
                    className="flex items-start justify-between rounded-xl border border-border p-4 transition-colors hover:border-blue-300 dark:hover:border-blue-700"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <h4 className="font-bold text-foreground">{company.name}</h4>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{company.description}</p>
                      {company.similarPoints && (
                        <p className="mt-1.5 text-xs text-blue-600 dark:text-blue-400">{company.similarPoints}</p>
                      )}
                      <div className="mt-2 flex gap-2">
                        <Badge variant="outline">{company.stage}</Badge>
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          {company.funding}
                        </Badge>
                      </div>
                    </div>
                    <div className="ml-3 text-right">
                      <div className="text-2xl font-black text-primary">
                        {company.similarity}%
                      </div>
                      <div className="text-xs text-muted-foreground">{t('idea.similarity')}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : isSearchingSimilar ? (
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : (
              <p className="py-4 text-center text-sm text-muted-foreground">
                {t('idea.noSimilarCompanies')}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Gate 1 승인 버튼 */}
      {hasCanvasData && !isConfirmed && !isExpanding && canvasData.problem && (
        <Card className="border-primary">
          <CardContent className="flex items-center justify-between py-6">
            <div>
              <h3 className="font-semibold">{t('gate.gate1')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('ideaStage.confirmQuestion')}
              </p>
            </div>
            <Button
              size="lg"
              onClick={handleConfirm}
              disabled={isConfirming}
            >
              {isConfirming ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  {t('common.loading')}
                </>
              ) : (
                <>
                  <Check className="mr-2 h-5 w-5" />
                  {t('idea.confirm')}
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 확정 완료 메시지 */}
      {isConfirmed && (
        <Card className="border-green-500 bg-green-50 dark:bg-green-950">
          <CardContent className="flex items-center justify-between py-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-green-500 p-2">
                <Check className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-green-700 dark:text-green-300">
                  {t('gate.gate1')} {t('gate.passed')}
                </h3>
                <p className="text-sm text-green-600 dark:text-green-400">
                  {t('ideaStage.confirmedMessage')}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancelConfirm}
              disabled={isCancellingConfirm}
            >
              {isCancellingConfirm ? (
                <LoadingSpinner size="sm" className="mr-2" />
              ) : (
                <Undo2 className="mr-2 h-4 w-4" />
              )}
              {t('idea.cancelConfirm')}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
