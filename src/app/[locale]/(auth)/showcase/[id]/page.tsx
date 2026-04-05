'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useParams, usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  TrendingUp,
  Users,
  Cpu,
  Megaphone,
  FileText,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/common/loading-spinner'

interface PublicProfile {
  id: string
  name: string
  industryTags: string[]
  completedAt: string | null
  ideaSummary: {
    problem: string
    solution: string
    target: string
    differentiation: string
    uvp?: string
    channels?: string
    revenueStreams?: string
    costStructure?: string
    keyMetrics?: string
  } | null
  scores: {
    investor: number | null
    market: number | null
    tech: number | null
    total: number | null
  } | null
  elevatorPitch: string | null
  recommendations: string[]
  documents?: Array<{
    id: string
    type: string
    title: string
  }>
}

export default function ShowcaseDetailPage() {
  const t = useTranslations()
  const { id } = useParams<{ id: string }>()
  const pathname = usePathname()
  const locale = pathname.split('/')[1] || 'ko'
  const [profile, setProfile] = useState<PublicProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    async function fetchProfile() {
      try {
        const response = await fetch(`/api/projects/${id}/public-profile`)
        const result = await response.json()
        if (result.success) {
          setProfile(result.data)
        } else {
          setNotFound(true)
        }
      } catch {
        setNotFound(true)
      } finally {
        setIsLoading(false)
      }
    }
    fetchProfile()
  }, [id])

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400'
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-green-500'
    if (score >= 60) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const docTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      business_plan: t('document.businessPlan'),
      pitch: t('document.pitch'),
      landing: t('document.landing'),
      gtm_checklist: t('document.gtmChecklist'),
      ppt: t('document.ppt'),
      leaflet: t('document.leaflet'),
      infographic: t('document.infographic'),
    }
    return labels[type] || type
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (notFound || !profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold">{t('showcase.notFound')}</h1>
        <p className="text-muted-foreground">{t('showcase.notFoundDesc')}</p>
        <Link href={`/${locale}/showcase`}>
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('showcase.backToList')}
          </Button>
        </Link>
      </div>
    )
  }

  const idea = profile.ideaSummary
  const hasLeanCanvas = idea && (idea.uvp || idea.channels || idea.revenueStreams || idea.costStructure || idea.keyMetrics)

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* 네비게이션 */}
      <div className="border-b bg-background/80 backdrop-blur-sm">
        <div className="mx-auto max-w-4xl px-4 py-4">
          <Link
            href={`/${locale}/showcase`}
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            {t('showcase.backToList')}
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-8 space-y-8">
        {/* 프로젝트 헤더 */}
        <div>
          <h1 className="text-3xl font-bold">{profile.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {profile.industryTags?.map((tag, i) => (
              <Badge key={i} variant="outline">{tag}</Badge>
            ))}
            {profile.completedAt && (
              <span className="text-sm text-muted-foreground">
                {new Date(profile.completedAt).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>

        {/* 엘리베이터 피치 */}
        {profile.elevatorPitch && (
          <Card className="border-purple-200 dark:border-purple-800 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30">
            <CardContent className="py-6">
              <div className="flex items-start gap-3">
                <Megaphone className="mt-1 h-5 w-5 shrink-0 text-purple-500" />
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-purple-700 dark:text-purple-300">
                    {t('showcase.elevatorPitch')}
                  </h3>
                  <blockquote className="border-l-4 border-purple-400 pl-4 text-base italic leading-relaxed">
                    &ldquo;{profile.elevatorPitch}&rdquo;
                  </blockquote>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 린 캔버스 or 기존 4-card 레이아웃 */}
        {idea && (
          hasLeanCanvas ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('idea.leanCanvas')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-hidden rounded-lg border border-border">
                  {/* Top Row */}
                  <div className="grid grid-cols-1 lg:grid-cols-5">
                    <div className="lg:row-span-2 border border-border p-3 bg-red-50/50 dark:bg-red-950/20">
                      <h3 className="mb-1 text-xs font-bold text-foreground/80">{t('idea.problem')}</h3>
                      <p className="whitespace-pre-wrap text-sm text-muted-foreground">{idea.problem || '-'}</p>
                    </div>
                    <div className="border border-border p-3 bg-green-50/50 dark:bg-green-950/20">
                      <h3 className="mb-1 text-xs font-bold text-foreground/80">{t('idea.solution')}</h3>
                      <p className="whitespace-pre-wrap text-sm text-muted-foreground">{idea.solution || '-'}</p>
                    </div>
                    <div className="lg:row-span-2 border border-border p-3 bg-amber-50/50 dark:bg-amber-950/20">
                      <h3 className="mb-1 text-xs font-bold text-foreground/80">{t('idea.uvp')}</h3>
                      <p className="whitespace-pre-wrap text-sm text-muted-foreground">{idea.uvp || '-'}</p>
                    </div>
                    <div className="border border-border p-3 bg-purple-50/50 dark:bg-purple-950/20">
                      <h3 className="mb-1 text-xs font-bold text-foreground/80">{t('idea.differentiation')}</h3>
                      <p className="whitespace-pre-wrap text-sm text-muted-foreground">{idea.differentiation || '-'}</p>
                    </div>
                    <div className="lg:row-span-2 border border-border p-3 bg-rose-50/50 dark:bg-rose-950/20">
                      <h3 className="mb-1 text-xs font-bold text-foreground/80">{t('idea.target')}</h3>
                      <p className="whitespace-pre-wrap text-sm text-muted-foreground">{idea.target || '-'}</p>
                    </div>
                    <div className="border border-border p-3 bg-blue-50/50 dark:bg-blue-950/20">
                      <h3 className="mb-1 text-xs font-bold text-foreground/80">{t('idea.keyMetrics')}</h3>
                      <p className="whitespace-pre-wrap text-sm text-muted-foreground">{idea.keyMetrics || '-'}</p>
                    </div>
                    <div className="border border-border p-3 bg-cyan-50/50 dark:bg-cyan-950/20">
                      <h3 className="mb-1 text-xs font-bold text-foreground/80">{t('idea.channels')}</h3>
                      <p className="whitespace-pre-wrap text-sm text-muted-foreground">{idea.channels || '-'}</p>
                    </div>
                  </div>
                  {/* Bottom Row */}
                  <div className="grid grid-cols-1 lg:grid-cols-2">
                    <div className="border border-border p-3 bg-slate-50/50 dark:bg-slate-950/20">
                      <h3 className="mb-1 text-xs font-bold text-foreground/80">{t('idea.costStructure')}</h3>
                      <p className="whitespace-pre-wrap text-sm text-muted-foreground">{idea.costStructure || '-'}</p>
                    </div>
                    <div className="border border-border p-3 bg-slate-50/50 dark:bg-slate-950/20">
                      <h3 className="mb-1 text-xs font-bold text-foreground/80">{t('idea.revenueStreams')}</h3>
                      <p className="whitespace-pre-wrap text-sm text-muted-foreground">{idea.revenueStreams || '-'}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            /* 기존 4-card 레이아웃 (하위 호환) */
            <div className="grid gap-4 sm:grid-cols-2">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{t('showcase.problem')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{idea.problem}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{t('showcase.solution')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{idea.solution}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{t('showcase.targetCustomer')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{idea.target}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{t('showcase.differentiation')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{idea.differentiation}</p>
                </CardContent>
              </Card>
            </div>
          )
        )}

        {/* 평가 점수 */}
        {profile.scores && profile.scores.total !== null && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('showcase.evaluationScores')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 종합 점수 */}
              <div className="flex items-center gap-4">
                <div className={`text-4xl font-bold ${getScoreColor(profile.scores.total)}`}>
                  {profile.scores.total}
                  <span className="text-lg font-medium text-muted-foreground">/100</span>
                </div>
                <span className="text-sm text-muted-foreground">{t('showcase.totalScore')}</span>
              </div>

              {/* 개별 점수 바 */}
              <div className="space-y-3">
                {[
                  { label: t('evaluation.investor'), score: profile.scores.investor, icon: TrendingUp },
                  { label: t('evaluation.market'), score: profile.scores.market, icon: Users },
                  { label: t('evaluation.tech'), score: profile.scores.tech, icon: Cpu },
                ].map(({ label, score, icon: Icon }) => score !== null && (
                  <div key={label} className="flex items-center gap-3">
                    <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="w-20 shrink-0 text-sm">{label}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${getScoreBg(score)}`}
                        style={{ width: `${score}%` }}
                      />
                    </div>
                    <span className={`w-8 text-right text-sm font-semibold ${getScoreColor(score)}`}>
                      {score}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 개선 제안 */}
        {profile.recommendations && profile.recommendations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('evaluation.recommendations')}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {profile.recommendations.slice(0, 5).map((rec, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    {typeof rec === 'string' ? rec : JSON.stringify(rec)}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* 확정 문서 목록 (전체 공개일 때만) */}
        {profile.documents && profile.documents.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('showcase.documents')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {profile.documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center gap-3 rounded-lg border p-3"
                  >
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <span className="text-sm font-medium">{doc.title}</span>
                      <Badge variant="outline" className="ml-2 text-xs">
                        {docTypeLabel(doc.type)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
