'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Search, TrendingUp, Award, ArrowRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { LoadingSpinner } from '@/components/common/loading-spinner'

interface ShowcaseProject {
  id: string
  name: string
  visibility: 'public' | 'summary'
  industryTags: string[]
  completedAt: string | null
  problem: string | null
  solution: string | null
  totalScore: number | null
  elevatorPitch: string | null
}

interface ShowcaseResponse {
  projects: ShowcaseProject[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export default function ShowcasePage() {
  const t = useTranslations()
  const pathname = usePathname()
  const locale = pathname.split('/')[1] || 'ko'
  const [data, setData] = useState<ShowcaseResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function fetchShowcase() {
      try {
        const response = await fetch('/api/showcase')
        const result = await response.json()
        if (result.success) {
          setData(result.data)
        }
      } catch {
        // ignore
      } finally {
        setIsLoading(false)
      }
    }
    fetchShowcase()
  }, [])

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400'
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const filteredProjects = data?.projects.filter(p => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      p.name.toLowerCase().includes(q) ||
      p.problem?.toLowerCase().includes(q) ||
      p.solution?.toLowerCase().includes(q)
    )
  }) || []

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* 헤더 */}
      <div className="border-b bg-background/80 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <Link href={`/${locale}`} className="text-sm text-muted-foreground hover:text-foreground">
                CASA
              </Link>
              <h1 className="mt-1 text-2xl font-bold">{t('showcase.title')}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{t('showcase.description')}</p>
            </div>
            <div className="flex items-center gap-2">
              <Award className="h-8 w-8 text-purple-500" />
              {data && (
                <span className="text-sm text-muted-foreground">
                  {t('showcase.totalProjects', { count: data.pagination.total })}
                </span>
              )}
            </div>
          </div>

          {/* 검색 */}
          <div className="relative mt-4 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-10"
              placeholder={t('showcase.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* 프로젝트 목록 */}
      <div className="mx-auto max-w-6xl px-4 py-8">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <LoadingSpinner size="lg" />
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Award className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <h3 className="text-lg font-semibold">{t('showcase.empty')}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{t('showcase.emptyDesc')}</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProjects.map((project) => (
              <Link
                key={project.id}
                href={`/${locale}/showcase/${project.id}`}
              >
                <Card className="group h-full cursor-pointer transition-all hover:border-purple-300 hover:shadow-lg dark:hover:border-purple-700">
                  <CardContent className="flex h-full flex-col p-6">
                    {/* 프로젝트명 + 점수 */}
                    <div className="flex items-start justify-between">
                      <h3 className="font-semibold text-lg group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                        {project.name}
                      </h3>
                      {project.totalScore !== null && (
                        <div className={`flex items-center gap-1 ${getScoreColor(project.totalScore)}`}>
                          <TrendingUp className="h-4 w-4" />
                          <span className="text-lg font-bold">{project.totalScore}</span>
                        </div>
                      )}
                    </div>

                    {/* 산업 태그 */}
                    {project.industryTags && project.industryTags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {project.industryTags.slice(0, 3).map((tag, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* 엘리베이터 피치 또는 문제 요약 */}
                    <div className="mt-3 flex-1">
                      {project.elevatorPitch ? (
                        <p className="text-sm italic text-muted-foreground line-clamp-3">
                          &ldquo;{project.elevatorPitch}&rdquo;
                        </p>
                      ) : project.problem ? (
                        <p className="text-sm text-muted-foreground line-clamp-3">
                          {project.problem}
                        </p>
                      ) : null}
                    </div>

                    {/* 하단 */}
                    <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                      {project.completedAt && (
                        <span>{new Date(project.completedAt).toLocaleDateString()}</span>
                      )}
                      <span className="flex items-center gap-1 text-purple-500 opacity-0 transition-opacity group-hover:opacity-100">
                        {t('showcase.viewDetail')} <ArrowRight className="h-3 w-3" />
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
