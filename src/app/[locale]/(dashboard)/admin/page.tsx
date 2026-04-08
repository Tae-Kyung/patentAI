'use client'

import { useState, useEffect } from 'react'
import { FileText, Coins, RefreshCw, Users } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/common/loading-spinner'
import Link from 'next/link'

interface AdminStats {
  totalProjects: number
  projectsByStatus: Record<string, number>
  totalUsers: number
  creditStats: {
    totalDistributed: number
    totalConsumed: number
  }
}

const STATUS_META: { key: string; step: string; label: string; color: string }[] = [
  { key: 'draft',      step: '시작',   label: '초안',          color: 'bg-gray-400' },
  { key: 'step1_done', step: 'STEP 1', label: '입력·분석 완료', color: 'bg-blue-400' },
  { key: 'step2_done', step: 'STEP 2', label: '기술 구조화 완료', color: 'bg-indigo-400' },
  { key: 'step3_done', step: 'STEP 3', label: '청구범위 완료',  color: 'bg-violet-400' },
  { key: 'step4_done', step: 'STEP 4', label: '명세서 완료',   color: 'bg-purple-400' },
  { key: 'step5_done', step: 'STEP 5', label: '도면 완료',     color: 'bg-fuchsia-400' },
  { key: 'completed',  step: '완료',   label: '출력 완료',     color: 'bg-green-500' },
]

export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchStats = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/admin/dashboard')
      const json = await res.json()
      if (json.success) setData(json.data)
    } catch {
      // silent
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { fetchStats() }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">관리자 대시보드</h1>
          <p className="text-sm text-muted-foreground">PatentAI 운영 현황</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchStats}>
          <RefreshCw className="mr-2 h-4 w-4" />
          새로고침
        </Button>
      </div>

      {/* 요약 카드 */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">전체 특허 프로젝트</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.totalProjects ?? 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">전체 사용자</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.totalUsers ?? 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">크레딧 소비</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.creditStats.totalConsumed ?? 0}</div>
            <p className="text-xs text-muted-foreground">
              지급: {data?.creditStats.totalDistributed ?? 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 프로젝트 단계별 */}
      {data?.projectsByStatus && (
        <Card>
          <CardHeader>
            <CardTitle>프로젝트 단계별 현황</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {STATUS_META.map(({ key, step, label, color }) => {
                const count = data.projectsByStatus[key] ?? 0
                const pct = data.totalProjects > 0 ? Math.round((count / data.totalProjects) * 100) : 0
                return (
                  <div key={key} className="flex items-center gap-3">
                    <div className="w-16 shrink-0 text-right">
                      <span className="text-xs font-medium text-muted-foreground">{step}</span>
                    </div>
                    <div className="flex-1">
                      <div className="mb-0.5 flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{label}</span>
                        <span className="text-sm font-bold text-gray-900 dark:text-white">
                          {count}건 <span className="text-xs font-normal text-muted-foreground">({pct}%)</span>
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                        <div
                          className={`h-full rounded-full transition-all ${color}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 바로가기 */}
      <div className="flex gap-3">
        <Button asChild variant="outline">
          <Link href="/admin/prompts">프롬프트 관리</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/admin/credits">크레딧 관리</Link>
        </Button>
      </div>
    </div>
  )
}
