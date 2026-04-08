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
            <div className="flex flex-wrap gap-3">
              {Object.entries(data.projectsByStatus).map(([status, count]) => (
                <div key={status} className="rounded-lg border px-3 py-2 text-center">
                  <p className="text-lg font-bold">{count}</p>
                  <p className="text-xs text-muted-foreground">{status}</p>
                </div>
              ))}
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
