'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Plus, Search, RefreshCw, Settings2, Lightbulb, Building2, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { LoadingSpinner } from '@/components/common/loading-spinner'
import { EmptyState } from '@/components/common/empty-state'
import { Pagination } from '@/components/common/pagination'
import { toast } from 'sonner'
import type { Prompt, PromptCategory } from '@/types/database'

const categoryColors: Record<PromptCategory, string> = {
  ideation: 'bg-blue-500',
  evaluation: 'bg-green-500',
  document: 'bg-purple-500',
  marketing: 'bg-orange-500',
  startup: 'bg-emerald-500',
  mentoring: 'bg-violet-500',
}

type Track = 'all' | 'pre_startup' | 'startup' | 'mentoring'

export default function PromptsPage() {
  const t = useTranslations()

  const categoryLabels: Record<PromptCategory, string> = {
    ideation: t('admin.prompts.categoryIdeation'),
    evaluation: t('admin.prompts.categoryEvaluation'),
    document: t('admin.prompts.categoryDocument'),
    marketing: t('admin.prompts.categoryMarketing'),
    startup: t('admin.prompts.categoryStartup'),
    mentoring: t('admin.prompts.categoryMentoring'),
  }

  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [track, setTrack] = useState<Track>('all')
  const [category, setCategory] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const fetchPrompts = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
      })
      if (category !== 'all') {
        params.set('category', category)
      } else if (track !== 'all') {
        params.set('track', track)
      }
      if (search) {
        params.set('search', search)
      }

      const response = await fetch(`/api/admin/prompts?${params}`)
      const result = await response.json()

      if (result.success) {
        setPrompts(result.data.items)
        setTotalPages(result.data.totalPages)
      }
    } catch (error) {
      toast.error(t('admin.prompts.fetchFailed'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchPrompts()
  }, [page, track, category])

  const handleTrackChange = (newTrack: Track) => {
    setTrack(newTrack)
    setCategory('all')
    setPage(1)
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchPrompts()
  }

  const handleSyncCache = async () => {
    try {
      const response = await fetch('/api/admin/prompts/sync-cache', {
        method: 'POST',
      })
      const result = await response.json()

      if (result.success) {
        toast.success(t('admin.prompts.syncCacheSuccess'))
      } else {
        toast.error(t('admin.prompts.syncCacheFailed'))
      }
    } catch (error) {
      toast.error(t('admin.prompts.syncCacheFailed'))
    }
  }

  // 트랙에 따른 카테고리 옵션
  const preStartupCategories: PromptCategory[] = ['ideation', 'evaluation', 'document', 'marketing']
  const startupCategories: PromptCategory[] = ['startup']
  const mentoringCategories: PromptCategory[] = ['mentoring']

  const visibleCategories =
    track === 'pre_startup' ? preStartupCategories :
    track === 'startup' ? startupCategories :
    track === 'mentoring' ? mentoringCategories :
    [...preStartupCategories, ...startupCategories, ...mentoringCategories]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t('nav.prompts')}</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSyncCache}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {t('admin.prompts.syncCache')}
          </Button>
          <Button asChild>
            <Link href="/admin/prompts/new">
              <Plus className="mr-2 h-4 w-4" />
              {t('admin.prompts.newPrompt')}
            </Link>
          </Button>
        </div>
      </div>

      {/* 트랙 필터 탭 */}
      <div className="flex gap-2">
        <Button
          variant={track === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleTrackChange('all')}
        >
          {t('common.all')}
        </Button>
        <Button
          variant={track === 'pre_startup' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleTrackChange('pre_startup')}
          className={track === 'pre_startup' ? 'bg-blue-600 hover:bg-blue-700' : ''}
        >
          <Lightbulb className="mr-1.5 h-4 w-4" />
          {t('project.preStartup')}
        </Button>
        <Button
          variant={track === 'startup' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleTrackChange('startup')}
          className={track === 'startup' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
        >
          <Building2 className="mr-1.5 h-4 w-4" />
          {t('project.startup')}
        </Button>
        <Button
          variant={track === 'mentoring' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleTrackChange('mentoring')}
          className={track === 'mentoring' ? 'bg-purple-600 hover:bg-purple-700' : ''}
        >
          <Users className="mr-1.5 h-4 w-4" />
          {t('admin.prompts.categoryMentoring')}
        </Button>
      </div>

      {/* 검색 + 카테고리 필터 */}
      <div className="flex flex-col gap-4 md:flex-row">
        <form onSubmit={handleSearch} className="flex flex-1 gap-2">
          <Input
            placeholder={t('admin.prompts.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
          <Button type="submit" variant="outline">
            <Search className="h-4 w-4" />
          </Button>
        </form>

        {visibleCategories.length > 1 && (
          <Select value={category} onValueChange={(value) => {
            setCategory(value)
            setPage(1)
          }}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t('admin.prompts.category')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('common.all')}</SelectItem>
              {visibleCategories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {categoryLabels[cat]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* 프롬프트 목록 */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : prompts.length === 0 ? (
        <EmptyState
          icon={<Settings2 className="h-8 w-8 text-muted-foreground" />}
          title={t('admin.prompts.noPrompts')}
          description={t('admin.prompts.noPromptsDesc')}
          actionLabel={t('admin.prompts.newPrompt')}
          actionHref="/admin/prompts/new"
        />
      ) : (
        <>
          <div className="grid gap-4">
            {prompts.map((prompt) => (
              <Link key={prompt.id} href={`/admin/prompts/${prompt.id}`}>
                <Card className="transition-colors hover:bg-accent">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">{prompt.name}</CardTitle>
                        <Badge
                          variant="secondary"
                          className={`${categoryColors[prompt.category]} text-white`}
                        >
                          {categoryLabels[prompt.category]}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">v{prompt.version}</Badge>
                        {!prompt.is_active && (
                          <Badge variant="destructive">{t('admin.prompts.inactive')}</Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                      <div>
                        <span className="font-medium">{t('admin.prompts.keyLabel')}</span>{' '}
                        <code className="rounded bg-muted px-1">{prompt.key}</code>
                      </div>
                      {prompt.description && (
                        <p className="line-clamp-2">{prompt.description}</p>
                      )}
                      <div className="flex gap-4">
                        <span>{t('admin.prompts.modelLabel', { model: prompt.model })}</span>
                        <span>{t('admin.prompts.temperatureLabel', { value: prompt.temperature })}</span>
                        <span>{t('admin.prompts.maxTokensLabel', { value: prompt.max_tokens })}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  )
}
