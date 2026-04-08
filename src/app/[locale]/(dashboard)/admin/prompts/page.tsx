'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Search, RefreshCw, Settings2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/common/loading-spinner'
import { toast } from 'sonner'
import type { PatentaiPrompt } from '@/types/database'

export default function PromptsPage() {
  const [prompts, setPrompts] = useState<PatentaiPrompt[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')

  const fetchPrompts = async (q = search) => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({ limit: '100' })
      if (q) params.set('search', q)
      const res = await fetch(`/api/admin/prompts?${params}`)
      const json = await res.json()
      if (json.success) setPrompts(json.data.items)
    } catch {
      toast.error('프롬프트 목록을 불러오지 못했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { fetchPrompts() }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchPrompts(search)
  }

  const handleSyncCache = async () => {
    try {
      const res = await fetch('/api/admin/prompts/sync-cache', { method: 'POST' })
      const json = await res.json()
      if (json.success) toast.success('캐시가 갱신되었습니다.')
      else toast.error('캐시 갱신에 실패했습니다.')
    } catch {
      toast.error('캐시 갱신에 실패했습니다.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">프롬프트 관리</h1>
          <p className="text-sm text-muted-foreground">PatentAI 프롬프트를 조회하고 수정합니다.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleSyncCache}>
            <RefreshCw className="mr-2 h-4 w-4" />
            캐시 갱신
          </Button>
          <Button asChild size="sm">
            <Link href="/admin/prompts/new">
              <Plus className="mr-2 h-4 w-4" />
              새 프롬프트
            </Link>
          </Button>
        </div>
      </div>

      {/* 검색 */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <Input
          placeholder="프롬프트 이름 또는 키 검색"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Button type="submit" variant="outline" size="icon">
          <Search className="h-4 w-4" />
        </Button>
      </form>

      {/* 목록 */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner size="lg" />
        </div>
      ) : prompts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Settings2 className="mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" />
          <p className="text-sm text-muted-foreground">등록된 프롬프트가 없습니다.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {prompts.map((prompt) => (
            <Link key={prompt.id} href={`/admin/prompts/${prompt.id}`}>
              <Card className="transition-colors hover:bg-accent">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">{prompt.name}</CardTitle>
                      <Badge variant="secondary" className="text-xs">{prompt.category}</Badge>
                      {!prompt.is_active && (
                        <Badge variant="destructive" className="text-xs">비활성</Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">{prompt.model}</span>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                    <code className="rounded bg-muted px-1.5 py-0.5">{prompt.key}</code>
                    {prompt.description && (
                      <span className="line-clamp-1 flex-1">{prompt.description}</span>
                    )}
                    <span>max_tokens: {prompt.max_tokens}</span>
                    <span>temp: {prompt.temperature}</span>
                    <span>크레딧: {prompt.credit_cost}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
