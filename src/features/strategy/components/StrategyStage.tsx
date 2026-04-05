'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import {
  Compass,
  Check,
  AlertTriangle,
  Lock,
  Eye,
  Flag,
  ListChecks,
  DollarSign,
  Shield,
  TrendingUp,
  Clock,
  Target,
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

interface StrategyStageProps {
  projectId: string
  review: BusinessReview | null
  isConfirmed: boolean
  canGenerate: boolean
  canCancelConfirm?: boolean
  onUpdate: () => void
}

interface StrategicGoal {
  goal: string
  timeline?: string
  kpis?: string[]
}

interface ActionPlanItem {
  priority: 'high' | 'medium' | 'low'
  action: string
  responsible?: string
  timeline?: string
  expected_outcome?: string
}

interface RiskItem {
  risk: string
  mitigation: string
  likelihood?: 'high' | 'medium' | 'low'
}

interface ResourceRequirements {
  team?: string
  budget?: string
  technology?: string
}

interface FinancialProjections {
  break_even?: string
  revenue_target?: string
  cost_optimization?: string
}

interface StrategyResult {
  vision?: string
  strategic_goals?: StrategicGoal[]
  action_plan?: ActionPlanItem[]
  resource_requirements?: string | ResourceRequirements
  risk_mitigation?: RiskItem[]
  financial_projections?: string | FinancialProjections
}

export function StrategyStage({
  projectId,
  review,
  isConfirmed,
  canGenerate,
  canCancelConfirm = false,
  onUpdate,
}: StrategyStageProps) {
  const t = useTranslations()

  const [isConfirming, setIsConfirming] = useState(false)
  const [isCancellingConfirm, setIsCancellingConfirm] = useState(false)
  const [isFetching, setIsFetching] = useState(false)
  const [localReview, setLocalReview] = useState<BusinessReview | null>(review)

  const sse = useSSE({
    onDone: () => {
      toast.success(t('strategy.generateComplete'))
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

  useEffect(() => {
    if (!review && canGenerate && !isFetching) {
      fetchReview()
    }
  }, [canGenerate]) // eslint-disable-line react-hooks/exhaustive-deps

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

  const handleGenerate = useCallback(() => {
    sse.start(`/api/projects/${projectId}/strategy/generate`)
  }, [projectId, sse])

  const handleConfirm = useCallback(async () => {
    setIsConfirming(true)
    try {
      const response = await fetch(`/api/projects/${projectId}/strategy/confirm`, {
        method: 'POST',
      })

      const result = await response.json()

      if (result.success) {
        toast.success(t('strategy.confirmSuccess'))
        onUpdate()
      } else {
        toast.error(result.error || t('strategy.confirmFailed'))
      }
    } catch {
      toast.error(t('strategy.confirmFailed'))
    } finally {
      setIsConfirming(false)
    }
  }, [projectId, onUpdate, t])

  const handleCancelConfirm = useCallback(async () => {
    setIsCancellingConfirm(true)
    try {
      const response = await fetch(`/api/projects/${projectId}/strategy/cancel-confirm`, {
        method: 'POST',
      })

      const result = await response.json()

      if (result.success) {
        toast.success(t('strategy.cancelConfirmSuccess'))
        onUpdate()
      } else {
        toast.error(result.error || t('strategy.cancelConfirmFailed'))
      }
    } catch {
      toast.error(t('strategy.cancelConfirmFailed'))
    } finally {
      setIsCancellingConfirm(false)
    }
  }, [projectId, onUpdate, t])

  const parseStrategyResult = (data: Json | null): StrategyResult | null => {
    if (!data) return null
    try {
      if (typeof data === 'string') {
        return JSON.parse(data)
      }
      return data as unknown as StrategyResult
    } catch {
      return null
    }
  }

  const getPriorityVariant = (priority: string): 'default' | 'secondary' | 'destructive' => {
    switch (priority) {
      case 'high':
        return 'destructive'
      case 'medium':
        return 'secondary'
      default:
        return 'default'
    }
  }

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high':
        return t('strategy.priorityHigh')
      case 'medium':
        return t('strategy.priorityMedium')
      case 'low':
        return t('strategy.priorityLow')
      default:
        return priority
    }
  }

  // Locked state
  if (!canGenerate) {
    return (
      <Card className="border-orange-500 bg-orange-50 dark:bg-orange-950">
        <CardContent className="flex items-center gap-4 py-6">
          <div className="rounded-full bg-orange-500 p-2">
            <Lock className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-orange-700 dark:text-orange-300">
              {t('strategy.locked')}
            </h3>
            <p className="text-sm text-orange-600 dark:text-orange-400">
              {t('strategy.lockedDesc')}
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

  const strategyResult = parseStrategyResult(localReview?.strategy_result ?? null)

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
                  {t('strategy.gate3Passed')}
                </h3>
                <p className="text-sm text-green-600 dark:text-green-400">
                  {t('strategy.gate3PassedDesc')}
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
              {t('strategy.cancelConfirm')}
            </Button>
          </CardContent>
        </Card>

        {strategyResult && (
          <StrategyResultDisplay
            result={strategyResult}
            getPriorityVariant={getPriorityVariant}
            getPriorityLabel={getPriorityLabel}
            t={t}
          />
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <AiDisclaimer />
      {/* Start Strategy Generation Button */}
      {!strategyResult && !sse.isLoading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-4 py-12">
            <div className="rounded-full bg-muted p-4">
              <Compass className="h-8 w-8 text-primary" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold">{t('strategy.generateTitle')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('strategy.generateDesc')}
              </p>
            </div>
            <Button size="lg" onClick={handleGenerate}>
              <Compass className="mr-2 h-4 w-4" />
              {t('strategy.generateButton')}
              <CreditCostBadge cost={1} className="ml-2" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Re-generate Button (when results exist but not confirmed) */}
      {strategyResult && !isConfirmed && !sse.isLoading && (
        <Card className="border-dashed">
          <CardContent className="flex items-center justify-between py-4">
            <div>
              <p className="text-sm font-medium">{t('strategy.regenerateDesc')}</p>
            </div>
            <Button variant="outline" onClick={handleGenerate}>
              <RotateCcw className="mr-2 h-4 w-4" />
              {t('strategy.regenerateButton')}
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
              <span className="font-medium">{t('strategy.generating')}</span>
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

      {/* Strategy Results */}
      {strategyResult && !sse.isLoading && (
        <StrategyResultDisplay
          result={strategyResult}
          getPriorityVariant={getPriorityVariant}
          getPriorityLabel={getPriorityLabel}
          t={t}
        />
      )}

      {/* Confirm Button (Gate 3) */}
      {strategyResult && !isConfirmed && !sse.isLoading && (
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
                  {t('strategy.confirmGate3')}
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Sub-component for strategy results
function StrategyResultDisplay({
  result,
  getPriorityVariant,
  getPriorityLabel,
  t,
}: {
  result: StrategyResult
  getPriorityVariant: (priority: string) => 'default' | 'secondary' | 'destructive'
  getPriorityLabel: (priority: string) => string
  t: ReturnType<typeof useTranslations>
}) {
  return (
    <div className="space-y-4">
      {/* Vision Statement */}
      {result.vision && (
        <Card className="border-2 border-primary/30 bg-primary/5">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">{t('strategy.vision')}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <blockquote className="border-l-4 border-primary pl-4 text-sm italic text-foreground leading-relaxed">
              {result.vision}
            </blockquote>
          </CardContent>
        </Card>
      )}

      {/* Strategic Goals */}
      {result.strategic_goals && result.strategic_goals.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Flag className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <CardTitle className="text-base">{t('strategy.strategicGoals')}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {result.strategic_goals.map((goal, i) => (
                <div key={i} className="rounded-lg border p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-medium text-sm">{goal.goal}</h4>
                    {goal.timeline && (
                      <Badge variant="outline" className="shrink-0">
                        <Clock className="mr-1 h-3 w-3" />
                        {goal.timeline}
                      </Badge>
                    )}
                  </div>
                  {goal.kpis && goal.kpis.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {goal.kpis.map((kpi, j) => (
                        <Badge key={j} variant="secondary" className="text-xs">
                          <Target className="mr-1 h-3 w-3" />
                          {kpi}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Plan Table */}
      {result.action_plan && result.action_plan.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <ListChecks className="h-5 w-5 text-green-600 dark:text-green-400" />
              <CardTitle className="text-base">{t('strategy.actionPlan')}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 pr-4 font-medium text-muted-foreground">{t('strategy.priority')}</th>
                    <th className="pb-2 pr-4 font-medium text-muted-foreground">{t('strategy.action')}</th>
                    <th className="pb-2 pr-4 font-medium text-muted-foreground hidden md:table-cell">{t('strategy.responsible')}</th>
                    <th className="pb-2 pr-4 font-medium text-muted-foreground hidden md:table-cell">{t('strategy.timeline')}</th>
                    <th className="pb-2 font-medium text-muted-foreground hidden lg:table-cell">{t('strategy.expectedOutcome')}</th>
                  </tr>
                </thead>
                <tbody>
                  {result.action_plan.map((item, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-3 pr-4">
                        <Badge variant={getPriorityVariant(item.priority)}>
                          {getPriorityLabel(item.priority)}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4 font-medium">{item.action}</td>
                      <td className="py-3 pr-4 text-muted-foreground hidden md:table-cell">{item.responsible || '-'}</td>
                      <td className="py-3 pr-4 text-muted-foreground hidden md:table-cell">{item.timeline || '-'}</td>
                      <td className="py-3 text-muted-foreground hidden lg:table-cell">{item.expected_outcome || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resource Requirements */}
      {result.resource_requirements && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <CardTitle className="text-base">{t('strategy.resourceRequirements')}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {typeof result.resource_requirements === 'string' ? (
              <MarkdownContent content={result.resource_requirements} className="text-sm text-muted-foreground" />
            ) : (
              <div className="space-y-3">
                {result.resource_requirements.team && (
                  <div className="rounded-lg border p-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1">{t('strategy.team')}</p>
                    <p className="text-sm">{result.resource_requirements.team}</p>
                  </div>
                )}
                {result.resource_requirements.budget && (
                  <div className="rounded-lg border p-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1">{t('strategy.budget')}</p>
                    <p className="text-sm">{result.resource_requirements.budget}</p>
                  </div>
                )}
                {result.resource_requirements.technology && (
                  <div className="rounded-lg border p-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1">{t('strategy.technology')}</p>
                    <p className="text-sm">{result.resource_requirements.technology}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Risk Mitigation */}
      {result.risk_mitigation && result.risk_mitigation.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-red-600 dark:text-red-400" />
              <CardTitle className="text-base">{t('strategy.riskMitigation')}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {result.risk_mitigation.map((item, i) => (
                <div key={i} className="rounded-lg border p-4">
                  <div className="flex items-start gap-3">
                    {item.likelihood && (
                      <Badge variant={getPriorityVariant(item.likelihood)} className="mt-0.5 shrink-0">
                        {getPriorityLabel(item.likelihood)}
                      </Badge>
                    )}
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{item.risk}</p>
                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">{t('strategy.mitigation')}:</span> {item.mitigation}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Financial Projections */}
      {result.financial_projections && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <CardTitle className="text-base">{t('strategy.financialProjections')}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {typeof result.financial_projections === 'string' ? (
              <MarkdownContent content={result.financial_projections} className="text-sm text-muted-foreground" />
            ) : (
              <div className="space-y-3">
                {result.financial_projections.revenue_target && (
                  <div className="rounded-lg border p-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1">{t('strategy.revenueTarget')}</p>
                    <p className="text-sm">{result.financial_projections.revenue_target}</p>
                  </div>
                )}
                {result.financial_projections.break_even && (
                  <div className="rounded-lg border p-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1">{t('strategy.breakEven')}</p>
                    <p className="text-sm">{result.financial_projections.break_even}</p>
                  </div>
                )}
                {result.financial_projections.cost_optimization && (
                  <div className="rounded-lg border p-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1">{t('strategy.costOptimization')}</p>
                    <p className="text-sm">{result.financial_projections.cost_optimization}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
