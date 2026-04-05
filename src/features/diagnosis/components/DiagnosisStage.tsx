'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import {
  Stethoscope,
  Check,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Target,
  ShieldAlert,
  Lock,
  Activity,
  Zap,
  RotateCcw,
  Undo2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/common/loading-spinner'
import { CreditCostBadge } from '@/components/common/credit-cost-badge'
import { AiDisclaimer } from '@/components/common/ai-disclaimer'
import { useSSE } from '@/hooks/useSSE'
import { toast } from 'sonner'
import { MarkdownContent } from '@/components/common/markdown-content'
import type { BusinessReview } from '@/types/database'
import type { Json } from '@/types/database'

interface DiagnosisStageProps {
  projectId: string
  review: BusinessReview | null
  isConfirmed: boolean
  canDiagnose: boolean
  canCancelConfirm?: boolean
  onUpdate: () => void
}

interface SWOTItem {
  item: string
  detail?: string
}

interface KeyIssue {
  issue: string
  severity: 'high' | 'medium' | 'low'
  description?: string
}

interface DiagnosisResult {
  overall_health?: 'healthy' | 'warning' | 'critical'
  health_score?: number
  swot?: {
    strengths?: (string | SWOTItem)[]
    weaknesses?: (string | SWOTItem)[]
    opportunities?: (string | SWOTItem)[]
    threats?: (string | SWOTItem)[]
  }
  key_issues?: KeyIssue[]
  competitive_position?: string
  growth_potential?: string
}

export function DiagnosisStage({
  projectId,
  review,
  isConfirmed,
  canDiagnose,
  canCancelConfirm = false,
  onUpdate,
}: DiagnosisStageProps) {
  const t = useTranslations()

  const [isConfirming, setIsConfirming] = useState(false)
  const [isCancellingConfirm, setIsCancellingConfirm] = useState(false)
  const [isFetching, setIsFetching] = useState(false)
  const [localReview, setLocalReview] = useState<BusinessReview | null>(review)

  const sse = useSSE({
    onDone: () => {
      toast.success(t('diagnosis.analyzeComplete'))
      onUpdate()
    },
    onError: (error) => {
      toast.error(error)
    },
  })

  useEffect(() => {
    if (review) {
      setLocalReview(review)
    }
  }, [review])

  // Fetch review data if not provided
  useEffect(() => {
    if (!review && canDiagnose && !isFetching) {
      fetchReview()
    }
  }, [canDiagnose]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchReview = async () => {
    setIsFetching(true)
    try {
      const response = await fetch(`/api/projects/${projectId}/review`)
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          setLocalReview(result.data)
        }
      }
    } catch {
      // silent
    } finally {
      setIsFetching(false)
    }
  }

  const handleDiagnose = useCallback(() => {
    sse.start(`/api/projects/${projectId}/diagnosis/analyze`)
  }, [projectId, sse])

  const handleConfirm = useCallback(async () => {
    setIsConfirming(true)
    try {
      const response = await fetch(`/api/projects/${projectId}/diagnosis/confirm`, {
        method: 'POST',
      })

      const result = await response.json()

      if (result.success) {
        toast.success(t('diagnosis.confirmSuccess'))
        onUpdate()
      } else {
        toast.error(result.error || t('diagnosis.confirmFailed'))
      }
    } catch {
      toast.error(t('diagnosis.confirmFailed'))
    } finally {
      setIsConfirming(false)
    }
  }, [projectId, onUpdate, t])

  const handleCancelConfirm = useCallback(async () => {
    setIsCancellingConfirm(true)
    try {
      const response = await fetch(`/api/projects/${projectId}/diagnosis/cancel-confirm`, {
        method: 'POST',
      })

      const result = await response.json()

      if (result.success) {
        toast.success(t('diagnosis.cancelConfirmSuccess'))
        onUpdate()
      } else {
        toast.error(result.error || t('diagnosis.cancelConfirmFailed'))
      }
    } catch {
      toast.error(t('diagnosis.cancelConfirmFailed'))
    } finally {
      setIsCancellingConfirm(false)
    }
  }, [projectId, onUpdate, t])

  const parseDiagnosisResult = (data: Json | null): DiagnosisResult | null => {
    if (!data) return null
    try {
      if (typeof data === 'string') {
        return JSON.parse(data)
      }
      return data as unknown as DiagnosisResult
    } catch {
      return null
    }
  }

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy':
        return 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
      case 'warning':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300'
      case 'critical':
        return 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900/50 dark:text-gray-300'
    }
  }

  const getHealthLabel = (health: string) => {
    switch (health) {
      case 'healthy':
        return t('diagnosis.healthy')
      case 'warning':
        return t('diagnosis.warning')
      case 'critical':
        return t('diagnosis.critical')
      default:
        return health
    }
  }

  const getSeverityVariant = (severity: string): 'default' | 'secondary' | 'destructive' => {
    switch (severity) {
      case 'high':
        return 'destructive'
      case 'medium':
        return 'secondary'
      default:
        return 'default'
    }
  }

  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case 'high':
        return t('diagnosis.severityHigh')
      case 'medium':
        return t('diagnosis.severityMedium')
      case 'low':
        return t('diagnosis.severityLow')
      default:
        return severity
    }
  }

  const getItemText = (item: string | SWOTItem): string => {
    if (typeof item === 'string') return item
    return item.item
  }

  // Locked state
  if (!canDiagnose) {
    return (
      <Card className="border-orange-500 bg-orange-50 dark:bg-orange-950">
        <CardContent className="flex items-center gap-4 py-6">
          <div className="rounded-full bg-orange-500 p-2">
            <Lock className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-orange-700 dark:text-orange-300">
              {t('diagnosis.locked')}
            </h3>
            <p className="text-sm text-orange-600 dark:text-orange-400">
              {t('diagnosis.lockedDesc')}
            </p>
          </div>
        </CardContent>
      </Card>
    )
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

  const diagnosisResult = parseDiagnosisResult(localReview?.diagnosis_result ?? null)

  // Confirmed view
  if (isConfirmed) {
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
                  {t('diagnosis.gate2Passed')}
                </h3>
                <p className="text-sm text-green-600 dark:text-green-400">
                  {t('diagnosis.gate2PassedDesc')}
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
              {t('diagnosis.cancelConfirm')}
            </Button>
          </CardContent>
        </Card>

        {diagnosisResult && (
          <DiagnosisResultDisplay
            result={diagnosisResult}
            getHealthColor={getHealthColor}
            getHealthLabel={getHealthLabel}
            getSeverityVariant={getSeverityVariant}
            getSeverityLabel={getSeverityLabel}
            getItemText={getItemText}
            t={t}
          />
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <AiDisclaimer />
      {/* Start Diagnosis Button */}
      {!diagnosisResult && !sse.isLoading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-4 py-12">
            <div className="rounded-full bg-muted p-4">
              <Stethoscope className="h-8 w-8 text-primary" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold">{t('diagnosis.startTitle')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('diagnosis.startDesc')}
              </p>
            </div>
            <Button size="lg" onClick={handleDiagnose}>
              <Stethoscope className="mr-2 h-4 w-4" />
              {t('diagnosis.startButton')}
              <CreditCostBadge cost={1} className="ml-2" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Re-diagnose Button (when results exist but not confirmed) */}
      {diagnosisResult && !isConfirmed && !sse.isLoading && (
        <Card className="border-dashed">
          <CardContent className="flex items-center justify-between py-4">
            <div>
              <p className="text-sm font-medium">{t('diagnosis.rediagnoseDesc')}</p>
            </div>
            <Button variant="outline" onClick={handleDiagnose}>
              <RotateCcw className="mr-2 h-4 w-4" />
              {t('diagnosis.rediagnoseButton')}
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
              <span className="font-medium">{t('diagnosis.analyzing')}</span>
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

      {/* Diagnosis Results */}
      {diagnosisResult && !sse.isLoading && (
        <DiagnosisResultDisplay
          result={diagnosisResult}
          getHealthColor={getHealthColor}
          getHealthLabel={getHealthLabel}
          getSeverityVariant={getSeverityVariant}
          getSeverityLabel={getSeverityLabel}
          getItemText={getItemText}
          t={t}
        />
      )}

      {/* Confirm Button (Gate 2) */}
      {diagnosisResult && !isConfirmed && !sse.isLoading && (
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
                  {t('diagnosis.confirmGate2')}
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Sub-component for diagnosis results
function DiagnosisResultDisplay({
  result,
  getHealthColor,
  getHealthLabel,
  getSeverityVariant,
  getSeverityLabel,
  getItemText,
  t,
}: {
  result: DiagnosisResult
  getHealthColor: (health: string) => string
  getHealthLabel: (health: string) => string
  getSeverityVariant: (severity: string) => 'default' | 'secondary' | 'destructive'
  getSeverityLabel: (severity: string) => string
  getItemText: (item: string | SWOTItem) => string
  t: ReturnType<typeof useTranslations>
}) {
  return (
    <div className="space-y-4">
      {/* Overall Health */}
      {result.overall_health && (
        <Card className="border-2">
          <CardContent className="flex items-center gap-6 py-6">
            <div className={`flex h-20 w-20 items-center justify-center rounded-full ${getHealthColor(result.overall_health)}`}>
              {result.health_score !== undefined ? (
                <span className="text-3xl font-bold">{result.health_score}</span>
              ) : (
                <Activity className="h-8 w-8" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold">{t('diagnosis.overallHealth')}</h3>
                <Badge className={getHealthColor(result.overall_health)}>
                  {getHealthLabel(result.overall_health)}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{t('diagnosis.overallHealthDesc')}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* SWOT Analysis 2x2 Grid */}
      {result.swot && (
        <div className="grid gap-4 md:grid-cols-2">
          {/* Strengths */}
          {result.swot.strengths && result.swot.strengths.length > 0 && (
            <Card className="border-green-200 dark:border-green-800">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <CardTitle className="text-base text-green-700 dark:text-green-300">
                    {t('diagnosis.strengths')}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {result.swot.strengths.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-green-500" />
                      {getItemText(item)}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Weaknesses */}
          {result.swot.weaknesses && result.swot.weaknesses.length > 0 && (
            <Card className="border-red-200 dark:border-red-800">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
                  <CardTitle className="text-base text-red-700 dark:text-red-300">
                    {t('diagnosis.weaknesses')}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {result.swot.weaknesses.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
                      {getItemText(item)}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Opportunities */}
          {result.swot.opportunities && result.swot.opportunities.length > 0 && (
            <Card className="border-blue-200 dark:border-blue-800">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <CardTitle className="text-base text-blue-700 dark:text-blue-300">
                    {t('diagnosis.opportunities')}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {result.swot.opportunities.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                      {getItemText(item)}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Threats */}
          {result.swot.threats && result.swot.threats.length > 0 && (
            <Card className="border-orange-200 dark:border-orange-800">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  <CardTitle className="text-base text-orange-700 dark:text-orange-300">
                    {t('diagnosis.threats')}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {result.swot.threats.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-500" />
                      {getItemText(item)}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Key Issues */}
      {result.key_issues && result.key_issues.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              <CardTitle className="text-base">{t('diagnosis.keyIssues')}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {result.key_issues.map((issue, i) => (
                <li key={i} className="flex items-start gap-3">
                  <Badge variant={getSeverityVariant(issue.severity)} className="mt-0.5 shrink-0">
                    {getSeverityLabel(issue.severity)}
                  </Badge>
                  <div>
                    <p className="text-sm font-medium">{issue.issue}</p>
                    {issue.description && (
                      <p className="text-sm text-muted-foreground mt-1">{issue.description}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Competitive Position & Growth Potential */}
      <div className="grid gap-4 md:grid-cols-2">
        {result.competitive_position && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                <CardTitle className="text-base">{t('diagnosis.competitivePosition')}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <MarkdownContent content={result.competitive_position} className="text-sm text-muted-foreground" />
            </CardContent>
          </Card>
        )}

        {result.growth_potential && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                <CardTitle className="text-base">{t('diagnosis.growthPotential')}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <MarkdownContent content={result.growth_potential} className="text-sm text-muted-foreground" />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
