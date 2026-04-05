'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslations } from 'next-intl'
import {
  Save,
  Sparkles,
  Check,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Target,
  ShieldAlert,
  Heart,
  MapPin,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Undo2,
  FileUp,
  FileText,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/common/loading-spinner'
import { CreditCostBadge } from '@/components/common/credit-cost-badge'
import { AiDisclaimer } from '@/components/common/ai-disclaimer'
import { useSSE } from '@/hooks/useSSE'
import { toast } from 'sonner'
import { MarkdownContent } from '@/components/common/markdown-content'
import { extractTextFromPdf, renderPdfToImages } from '@/lib/utils/pdf-extract'
import type { BusinessReview } from '@/types/database'
import type { Json } from '@/types/database'

interface ReviewStageProps {
  projectId: string
  review: BusinessReview | null
  isConfirmed: boolean
  canCancelConfirm?: boolean
  onUpdate: () => void
}

interface AIReviewResult {
  score?: number
  strengths?: string[]
  weaknesses?: string[]
  opportunities?: string[]
  threats?: string[]
  financial_health?: string
  market_position?: string
  recommendations?: string[]
}

export function ReviewStage({
  projectId,
  review,
  isConfirmed,
  canCancelConfirm = false,
  onUpdate,
}: ReviewStageProps) {
  const t = useTranslations()

  // Form state
  const [businessPlanText, setBusinessPlanText] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [industry, setIndustry] = useState('')
  const [foundedYear, setFoundedYear] = useState<string>('')
  const [employeeCount, setEmployeeCount] = useState<string>('')
  const [annualRevenue, setAnnualRevenue] = useState('')
  const [fundingStage, setFundingStage] = useState('')
  const [showCompanyInfo, setShowCompanyInfo] = useState(false)

  // PDF upload state
  const [isExtractingPdf, setIsExtractingPdf] = useState(false)
  const [pdfFileName, setPdfFileName] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // UI state
  const [isSaving, setIsSaving] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)
  const [isCancellingConfirm, setIsCancellingConfirm] = useState(false)
  const [isFetching, setIsFetching] = useState(false)
  const [localReview, setLocalReview] = useState<BusinessReview | null>(review)

  // SSE for AI analysis
  const sse = useSSE({
    onDone: () => {
      toast.success(t('review.analyzeComplete'))
      onUpdate()
    },
    onError: (error) => {
      toast.error(error)
    },
  })

  // Initialize state from review prop
  useEffect(() => {
    if (review) {
      setLocalReview(review)
      setBusinessPlanText(review.business_plan_text || '')
      setCompanyName(review.company_name || '')
      setIndustry(review.industry || '')
      setFoundedYear(review.founded_year ? String(review.founded_year) : '')
      setEmployeeCount(review.employee_count ? String(review.employee_count) : '')
      setAnnualRevenue(review.annual_revenue || '')
      setFundingStage(review.funding_stage || '')
    }
  }, [review])

  // Fetch review data if not provided
  useEffect(() => {
    if (!review && !isFetching) {
      fetchReview()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchReview = async () => {
    setIsFetching(true)
    try {
      const response = await fetch(`/api/projects/${projectId}/review`)
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          const data = result.data as BusinessReview
          setLocalReview(data)
          setBusinessPlanText(data.business_plan_text || '')
          setCompanyName(data.company_name || '')
          setIndustry(data.industry || '')
          setFoundedYear(data.founded_year ? String(data.founded_year) : '')
          setEmployeeCount(data.employee_count ? String(data.employee_count) : '')
          setAnnualRevenue(data.annual_revenue || '')
          setFundingStage(data.funding_stage || '')
        }
      }
    } catch {
      // No existing review, that's fine
    } finally {
      setIsFetching(false)
    }
  }

  const handlePdfUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsExtractingPdf(true)
    try {
      const result = await extractTextFromPdf(file)

      if (result.text.trim().length >= 10) {
        setBusinessPlanText(result.text)
        setPdfFileName(file.name)
        toast.success(t('review.pdfExtractSuccess', { pages: result.pageCount }))
        return
      }

      // 텍스트 추출 실패 → OCR 폴백 (스캔 PDF 또는 한글 인코딩 문제)
      toast.info(t('review.pdfOcrProcessing'))
      const rendered = await renderPdfToImages(file, 10)
      const ocrResponse = await fetch('/api/pdf-ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: rendered.images, pageCount: rendered.pageCount }),
      })

      if (ocrResponse.ok) {
        const ocrResult = await ocrResponse.json()
        const ocrText: string = ocrResult.data?.text || ''
        if (ocrText.trim().length >= 10) {
          setBusinessPlanText(ocrText)
          setPdfFileName(file.name)
          toast.success(t('review.pdfExtractSuccess', { pages: rendered.pageCount }))
          return
        }
      }

      toast.error(t('review.pdfOcrFailed'))
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'PDF_TOO_LARGE') {
          toast.error(t('review.pdfTooLarge'))
        } else if (error.message === 'NOT_PDF') {
          toast.error(t('review.pdfInvalidType'))
        } else {
          toast.error(t('review.pdfExtractFailed'))
        }
      } else {
        toast.error(t('review.pdfExtractFailed'))
      }
    } finally {
      setIsExtractingPdf(false)
      // Reset file input so the same file can be re-selected
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }, [t])

  const handleRemovePdf = useCallback(() => {
    setPdfFileName(null)
    setBusinessPlanText('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  const handleSave = useCallback(async () => {
    if (businessPlanText.length < 50) {
      toast.error(t('review.minLengthError'))
      return
    }

    setIsSaving(true)
    try {
      const method = localReview ? 'PATCH' : 'POST'
      const response = await fetch(`/api/projects/${projectId}/review`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_plan_text: businessPlanText,
          company_name: companyName || null,
          industry: industry || null,
          founded_year: foundedYear ? Number(foundedYear) : null,
          employee_count: employeeCount ? Number(employeeCount) : null,
          annual_revenue: annualRevenue || null,
          funding_stage: fundingStage || null,
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast.success(t('review.saveSuccess'))
        setLocalReview(result.data)
        onUpdate()
      } else {
        toast.error(result.error || t('review.saveFailed'))
      }
    } catch {
      toast.error(t('review.saveFailed'))
    } finally {
      setIsSaving(false)
    }
  }, [projectId, businessPlanText, companyName, industry, foundedYear, employeeCount, annualRevenue, fundingStage, localReview, onUpdate, t])

  const handleAnalyze = useCallback(() => {
    sse.start(`/api/projects/${projectId}/review/analyze`)
  }, [projectId, sse])

  const handleConfirm = useCallback(async () => {
    setIsConfirming(true)
    try {
      const response = await fetch(`/api/projects/${projectId}/review/confirm`, {
        method: 'POST',
      })

      const result = await response.json()

      if (result.success) {
        toast.success(t('review.confirmSuccess'))
        onUpdate()
      } else {
        toast.error(result.error || t('review.confirmFailed'))
      }
    } catch {
      toast.error(t('review.confirmFailed'))
    } finally {
      setIsConfirming(false)
    }
  }, [projectId, onUpdate, t])

  const handleCancelConfirm = useCallback(async () => {
    setIsCancellingConfirm(true)
    try {
      const response = await fetch(`/api/projects/${projectId}/review/cancel-confirm`, {
        method: 'POST',
      })

      const result = await response.json()

      if (result.success) {
        toast.success(t('review.cancelConfirmSuccess'))
        onUpdate()
      } else {
        toast.error(result.error || t('review.cancelConfirmFailed'))
      }
    } catch {
      toast.error(t('review.cancelConfirmFailed'))
    } finally {
      setIsCancellingConfirm(false)
    }
  }, [projectId, onUpdate, t])

  const parseAIReview = (data: Json | null): AIReviewResult | null => {
    if (!data) return null
    try {
      if (typeof data === 'string') {
        return JSON.parse(data)
      }
      return data as unknown as AIReviewResult
    } catch {
      return null
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400'
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-100 dark:bg-green-900/50'
    if (score >= 60) return 'bg-yellow-100 dark:bg-yellow-900/50'
    return 'bg-red-100 dark:bg-red-900/50'
  }

  if (isFetching) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </CardContent>
      </Card>
    )
  }

  // Confirmed read-only view
  if (isConfirmed) {
    const aiReview = parseAIReview(localReview?.ai_review ?? null)

    return (
      <div className="space-y-6">
        <Card className="border-green-500 bg-green-50 dark:bg-green-950">
          <CardContent className="flex items-center justify-between py-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-green-500 p-2">
                <Check className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-green-700 dark:text-green-300">
                  {t('review.gate1Passed')}
                </h3>
                <p className="text-sm text-green-600 dark:text-green-400">
                  {t('review.gate1PassedDesc')}
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
              {t('review.cancelConfirm')}
            </Button>
          </CardContent>
        </Card>

        {aiReview && (
          <ReviewResultDisplay
            aiReview={aiReview}
            score={localReview?.review_score ?? null}
            getScoreColor={getScoreColor}
            getScoreBgColor={getScoreBgColor}
            t={t}
          />
        )}
      </div>
    )
  }

  const aiReview = parseAIReview(localReview?.ai_review ?? null)
  const hasSaved = !!localReview?.business_plan_text

  return (
    <div className="space-y-6">
      <AiDisclaimer />
      {/* Business Plan Form */}
      <Card>
        <CardHeader>
          <CardTitle>{t('review.formTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* PDF Upload */}
          <div className="space-y-2">
            <Label>{t('review.pdfUploadLabel')}</Label>
            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handlePdfUpload}
                className="hidden"
                disabled={isExtractingPdf}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isExtractingPdf}
              >
                {isExtractingPdf ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    {t('review.pdfExtracting')}
                  </>
                ) : (
                  <>
                    <FileUp className="mr-2 h-4 w-4" />
                    {t('review.pdfUploadButton')}
                  </>
                )}
              </Button>
              {pdfFileName && (
                <div className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{pdfFileName}</span>
                  <button
                    type="button"
                    onClick={handleRemovePdf}
                    className="ml-1 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{t('review.pdfUploadHint')}</p>
          </div>

          {/* Business Plan Text */}
          <div className="space-y-2">
            <Label htmlFor="business_plan_text">{t('review.businessPlanLabel')}</Label>
            <Textarea
              id="business_plan_text"
              value={businessPlanText}
              onChange={(e) => setBusinessPlanText(e.target.value)}
              placeholder={t('review.businessPlanPlaceholder')}
              rows={12}
              className="min-h-[200px]"

            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>
                {businessPlanText.length < 50
                  ? t('review.minLengthHint', { remaining: 50 - businessPlanText.length })
                  : t('review.lengthOk')}
              </span>
              <span>{businessPlanText.length} {t('review.chars')}</span>
            </div>
          </div>

          {/* Company Info Toggle */}
          <button
            type="button"
            onClick={() => setShowCompanyInfo(!showCompanyInfo)}
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            {showCompanyInfo ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
            {t('review.companyInfoToggle')}
          </button>

          {/* Company Info Section */}
          {showCompanyInfo && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="company_name">{t('review.companyName')}</Label>
                <Input
                  id="company_name"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder={t('review.companyNamePlaceholder')}
    
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="industry">{t('review.industry')}</Label>
                <Input
                  id="industry"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  placeholder={t('review.industryPlaceholder')}
    
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="founded_year">{t('review.foundedYear')}</Label>
                <Input
                  id="founded_year"
                  type="number"
                  value={foundedYear}
                  onChange={(e) => setFoundedYear(e.target.value)}
                  placeholder={t('review.foundedYearPlaceholder')}
    
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="employee_count">{t('review.employeeCount')}</Label>
                <Input
                  id="employee_count"
                  type="number"
                  value={employeeCount}
                  onChange={(e) => setEmployeeCount(e.target.value)}
                  placeholder={t('review.employeeCountPlaceholder')}
    
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="annual_revenue">{t('review.annualRevenue')}</Label>
                <Input
                  id="annual_revenue"
                  value={annualRevenue}
                  onChange={(e) => setAnnualRevenue(e.target.value)}
                  placeholder={t('review.annualRevenuePlaceholder')}
    
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="funding_stage">{t('review.fundingStage')}</Label>
                <Input
                  id="funding_stage"
                  value={fundingStage}
                  onChange={(e) => setFundingStage(e.target.value)}
                  placeholder={t('review.fundingStagePlaceholder')}
    
                />
              </div>
            </div>
          )}

          {/* Save Button */}
          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              disabled={isSaving || businessPlanText.length < 50}
            >
              {isSaving ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  {t('common.processing')}
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {t('review.save')}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* AI Analyze Button */}
      {hasSaved && !aiReview && !sse.isLoading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-4 py-12">
            <div className="rounded-full bg-muted p-4">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold">{t('review.analyzeTitle')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('review.analyzeDesc')}
              </p>
            </div>
            <Button size="lg" onClick={handleAnalyze}>
              <Sparkles className="mr-2 h-4 w-4" />
              {t('review.analyzeButton')}
              <CreditCostBadge cost={1} className="ml-2" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Re-analyze Button (when results exist but not confirmed) */}
      {hasSaved && aiReview && !isConfirmed && !sse.isLoading && (
        <Card className="border-dashed">
          <CardContent className="flex items-center justify-between py-4">
            <div>
              <p className="text-sm font-medium">{t('review.reanalyzeDesc')}</p>
            </div>
            <Button variant="outline" onClick={handleAnalyze}>
              <RotateCcw className="mr-2 h-4 w-4" />
              {t('review.reanalyzeButton')}
              <CreditCostBadge cost={1} className="ml-1" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* SSE Streaming */}
      {sse.isLoading && (
        <Card>
          <CardContent className="py-6">
            <div className="flex items-center gap-3 mb-4">
              <LoadingSpinner size="md" />
              <span className="font-medium">{t('review.analyzing')}</span>
            </div>
            {sse.data && (
              <div className="rounded-lg bg-muted/50 p-4">
                <pre className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {sse.data.slice(-500)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* SSE Error */}
      {sse.error && (
        <Card className="border-red-500">
          <CardContent className="flex items-center gap-4 py-4">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <p className="text-sm text-red-600 dark:text-red-400">{sse.error}</p>
          </CardContent>
        </Card>
      )}

      {/* AI Review Results */}
      {aiReview && !sse.isLoading && (
        <ReviewResultDisplay
          aiReview={aiReview}
          score={localReview?.review_score ?? null}
          getScoreColor={getScoreColor}
          getScoreBgColor={getScoreBgColor}
          t={t}
        />
      )}

      {/* Confirm Button (Gate 1) */}
      {aiReview && !isConfirmed && !sse.isLoading && (
        <Card>
          <CardContent className="flex items-center justify-end gap-4 py-4">
            <Button
              size="lg"
              onClick={handleConfirm}
              disabled={isConfirming}
            >
              {isConfirming ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  {t('common.processing')}
                </>
              ) : (
                <>
                  <Check className="mr-2 h-5 w-5" />
                  {t('review.confirmGate1')}
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Sub-component for displaying AI review results
function ReviewResultDisplay({
  aiReview,
  score,
  getScoreColor,
  getScoreBgColor,
  t,
}: {
  aiReview: AIReviewResult
  score: number | null
  getScoreColor: (score: number) => string
  getScoreBgColor: (score: number) => string
  t: ReturnType<typeof useTranslations>
}) {
  const displayScore = aiReview.score ?? score

  return (
    <div className="space-y-4">
      {/* Score Badge */}
      {displayScore !== null && displayScore !== undefined && (
        <Card className="border-2">
          <CardContent className="flex items-center gap-6 py-6">
            <div className={`flex h-20 w-20 items-center justify-center rounded-full ${getScoreBgColor(displayScore)}`}>
              <span className={`text-3xl font-bold ${getScoreColor(displayScore)}`}>
                {displayScore}
              </span>
            </div>
            <div>
              <h3 className="text-lg font-semibold">{t('review.reviewScore')}</h3>
              <p className="text-sm text-muted-foreground">{t('review.reviewScoreDesc')}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* SWOT Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Strengths */}
        {aiReview.strengths && aiReview.strengths.length > 0 && (
          <Card className="border-green-200 dark:border-green-800">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                <CardTitle className="text-base text-green-700 dark:text-green-300">
                  {t('review.strengths')}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {aiReview.strengths.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-green-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Weaknesses */}
        {aiReview.weaknesses && aiReview.weaknesses.length > 0 && (
          <Card className="border-red-200 dark:border-red-800">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
                <CardTitle className="text-base text-red-700 dark:text-red-300">
                  {t('review.weaknesses')}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {aiReview.weaknesses.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Opportunities */}
        {aiReview.opportunities && aiReview.opportunities.length > 0 && (
          <Card className="border-blue-200 dark:border-blue-800">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <CardTitle className="text-base text-blue-700 dark:text-blue-300">
                  {t('review.opportunities')}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {aiReview.opportunities.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Threats */}
        {aiReview.threats && aiReview.threats.length > 0 && (
          <Card className="border-orange-200 dark:border-orange-800">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                <CardTitle className="text-base text-orange-700 dark:text-orange-300">
                  {t('review.threats')}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {aiReview.threats.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Financial Health & Market Position */}
      <div className="grid gap-4 md:grid-cols-2">
        {aiReview.financial_health && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-pink-600 dark:text-pink-400" />
                <CardTitle className="text-base">{t('review.financialHealth')}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <MarkdownContent content={aiReview.financial_health} className="text-sm text-muted-foreground" />
            </CardContent>
          </Card>
        )}

        {aiReview.market_position && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                <CardTitle className="text-base">{t('review.marketPosition')}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <MarkdownContent content={aiReview.market_position} className="text-sm text-muted-foreground" />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recommendations */}
      {aiReview.recommendations && aiReview.recommendations.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              <CardTitle className="text-base">{t('review.recommendations')}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {aiReview.recommendations.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Badge variant="outline" className="mt-0.5 shrink-0 text-xs">
                    {i + 1}
                  </Badge>
                  {item}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
