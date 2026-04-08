'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Search, Coins, Plus, RefreshCw, History, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/common/loading-spinner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

interface UserCredit {
  id: string
  name: string | null
  email: string
  role: string
  ai_credits: number
  created_at: string
}

interface CreditLog {
  id: string
  amount: number
  balance_after: number
  reason: string
  project_id: string | null
  created_by: string | null
  created_at: string
  created_by_name: string | null
  project_name: string | null
}

interface HistoryResponse {
  logs: CreditLog[]
  total: number
  page: number
  limit: number
  totalPages: number
}

const REASON_LABELS: Record<string, string> = {
  admin_recharge: '관리자 충전',
  ai_idea_expand: '아이디어 확장',
  ai_idea_enhance: '아이디어 강화',
  ai_similar_companies: '유사 기업 분석',
  ai_mentor_review: '멘토 리뷰',
  ai_evaluation: 'AI 평가',
  ai_evaluation_retry: 'AI 평가 재시도',
  ai_doc_business_plan: '사업계획서 생성',
  ai_doc_pitch: '피치덱 생성',
  ai_doc_landing: '랜딩페이지 생성',
  ai_doc_ppt: 'PPT 생성',
  ai_doc_ppt_image: 'PPT 이미지 생성 (8장)',
  ai_doc_leaflet: '리플렛 생성',
  ai_doc_infographic: '인포그래픽 생성',
  ai_doc_startup_application: '창업지원서 생성',
  ai_doc_revise: '문서 수정',
  ai_review_analyze: '사업 리뷰 분석',
  ai_diagnosis: '진단 분석',
  ai_strategy: '전략 생성',
  ai_report: '보고서 생성',
}

export default function AdminCreditsPage() {
  const t = useTranslations()

  const [users, setUsers] = useState<UserCredit[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [rechargeTarget, setRechargeTarget] = useState<UserCredit | null>(null)
  const [rechargeAmount, setRechargeAmount] = useState('30')
  const [isRecharging, setIsRecharging] = useState(false)

  // 히스토리 상태
  const [historyTarget, setHistoryTarget] = useState<UserCredit | null>(null)
  const [historyData, setHistoryData] = useState<HistoryResponse | null>(null)
  const [isHistoryLoading, setIsHistoryLoading] = useState(false)
  const [historyPage, setHistoryPage] = useState(1)

  const fetchUsers = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)

      const response = await fetch(`/api/admin/credits?${params}`)
      const result = await response.json()

      if (result.success) {
        setUsers(result.data)
      }
    } catch {
      toast.error(t('admin.credits.fetchFailed'))
    } finally {
      setIsLoading(false)
    }
  }, [search, t])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const fetchHistory = useCallback(async (userId: string, page: number) => {
    setIsHistoryLoading(true)
    try {
      const response = await fetch(`/api/admin/credits/${userId}/history?page=${page}&limit=20`)
      const result = await response.json()

      if (result.success) {
        setHistoryData(result.data)
      } else {
        toast.error(t('admin.credits.historyFetchFailed'))
      }
    } catch {
      toast.error(t('admin.credits.historyFetchFailed'))
    } finally {
      setIsHistoryLoading(false)
    }
  }, [t])

  const openHistory = (user: UserCredit) => {
    setHistoryTarget(user)
    setHistoryPage(1)
    fetchHistory(user.id, 1)
  }

  const handleHistoryPageChange = (newPage: number) => {
    if (!historyTarget) return
    setHistoryPage(newPage)
    fetchHistory(historyTarget.id, newPage)
  }

  const handleRecharge = async () => {
    if (!rechargeTarget) return

    const amount = parseInt(rechargeAmount)
    if (isNaN(amount) || amount < 1) {
      toast.error(t('admin.credits.invalidAmount'))
      return
    }

    setIsRecharging(true)
    try {
      const response = await fetch('/api/admin/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: rechargeTarget.id,
          amount,
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast.success(
          t('admin.credits.rechargeSuccess', {
            name: rechargeTarget.name || rechargeTarget.email,
            amount,
          })
        )
        setRechargeTarget(null)
        fetchUsers()
      } else {
        toast.error(result.error || t('admin.credits.rechargeFailed'))
      }
    } catch {
      toast.error(t('admin.credits.rechargeFailed'))
    } finally {
      setIsRecharging(false)
    }
  }

  const getCreditBadge = (credits: number) => {
    if (credits <= 0) return 'destructive' as const
    if (credits <= 5) return 'secondary' as const
    return 'outline' as const
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchUsers()
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getReasonLabel = (reason: string) => {
    return REASON_LABELS[reason] || reason
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('admin.credits.title')}</h1>
          <p className="text-muted-foreground">{t('admin.credits.description')}</p>
        </div>
        <Button variant="outline" onClick={fetchUsers}>
          <RefreshCw className="mr-2 h-4 w-4" />
          {t('common.refresh')}
        </Button>
      </div>

      {/* 검색 */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('admin.credits.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button type="submit" variant="outline">
          <Search className="h-4 w-4" />
        </Button>
      </form>

      {/* 사용자 크레딧 목록 */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <div className="space-y-2">
          {/* 헤더 */}
          <div className="hidden rounded-lg bg-muted px-4 py-3 text-sm font-medium text-muted-foreground md:grid md:grid-cols-12 md:gap-4">
            <div className="col-span-3">{t('admin.credits.nameLabel')}</div>
            <div className="col-span-3">{t('admin.credits.emailLabel')}</div>
            <div className="col-span-2">{t('admin.credits.roleLabel')}</div>
            <div className="col-span-2">{t('admin.credits.creditsLabel')}</div>
            <div className="col-span-2">{t('admin.credits.actionLabel')}</div>
          </div>

          {users.map((user) => (
            <Card key={user.id}>
              <CardContent className="flex items-center gap-4 px-4 py-3 md:grid md:grid-cols-12">
                <div className="col-span-3 min-w-0">
                  <p className="truncate text-sm font-medium">
                    {user.name || '-'}
                  </p>
                  <p className="truncate text-xs text-muted-foreground md:hidden">
                    {user.email}
                  </p>
                </div>
                <div className="col-span-3 hidden min-w-0 md:block">
                  <p className="truncate text-sm">{user.email}</p>
                </div>
                <div className="col-span-2">
                  <Badge variant={user.role === 'admin' ? 'default' : user.role === 'mentor' ? 'secondary' : 'outline'}>
                    {user.role}
                  </Badge>
                </div>
                <div className="col-span-2">
                  <Badge variant={getCreditBadge(user.ai_credits)} className="text-base px-3 py-1">
                    <Coins className="mr-1.5 h-4 w-4" />
                    {user.ai_credits}
                  </Badge>
                </div>
                <div className="col-span-2 flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setRechargeTarget(user)
                      setRechargeAmount('30')
                    }}
                  >
                    <Plus className="mr-1.5 h-4 w-4" />
                    {t('admin.credits.recharge')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openHistory(user)}
                    title={t('admin.credits.history')}
                  >
                    <History className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {users.length === 0 && (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <p className="text-muted-foreground">{t('admin.credits.noUsers')}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* 충전 다이얼로그 */}
      <Dialog open={!!rechargeTarget} onOpenChange={(open) => !open && setRechargeTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin.credits.rechargeTitle')}</DialogTitle>
          </DialogHeader>
          {rechargeTarget && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted p-3">
                <p className="text-sm font-medium">{rechargeTarget.name || rechargeTarget.email}</p>
                <p className="text-xs text-muted-foreground">{rechargeTarget.email}</p>
                <p className="mt-1 text-sm">
                  {t('admin.credits.currentCredits')}: <span className="font-bold">{rechargeTarget.ai_credits}</span>
                </p>
              </div>
              <div className="space-y-2">
                <Label>{t('admin.credits.rechargeAmount')}</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min="1"
                    max="1000"
                    value={rechargeAmount}
                    onChange={(e) => setRechargeAmount(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  {[10, 30, 50, 100].map((amount) => (
                    <Button
                      key={amount}
                      variant="outline"
                      size="sm"
                      onClick={() => setRechargeAmount(String(amount))}
                    >
                      +{amount}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRechargeTarget(null)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleRecharge} disabled={isRecharging}>
              {isRecharging ? (
                <LoadingSpinner size="sm" className="mr-2" />
              ) : (
                <Coins className="mr-2 h-4 w-4" />
              )}
              {t('admin.credits.rechargeConfirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 크레딧 히스토리 다이얼로그 */}
      <Dialog open={!!historyTarget} onOpenChange={(open) => {
        if (!open) {
          setHistoryTarget(null)
          setHistoryData(null)
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              {t('admin.credits.historyTitle')}
            </DialogTitle>
            {historyTarget && (
              <div className="flex items-center gap-3 pt-2">
                <span className="text-sm font-medium">{historyTarget.name || historyTarget.email}</span>
                <Badge variant={getCreditBadge(historyTarget.ai_credits)} className="text-sm px-2 py-0.5">
                  <Coins className="mr-1 h-3 w-3" />
                  {historyTarget.ai_credits}
                </Badge>
              </div>
            )}
          </DialogHeader>

          <div className="flex-1 overflow-y-auto min-h-0">
            {isHistoryLoading ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner size="lg" />
              </div>
            ) : historyData && historyData.logs.length > 0 ? (
              <div className="space-y-2">
                {historyData.logs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 rounded-lg border px-3 py-2.5"
                  >
                    {/* 아이콘 */}
                    <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                      log.amount > 0
                        ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {log.amount > 0 ? (
                        <ArrowUp className="h-3.5 w-3.5" />
                      ) : (
                        <ArrowDown className="h-3.5 w-3.5" />
                      )}
                    </div>

                    {/* 내용 */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium truncate">
                          {getReasonLabel(log.reason)}
                        </p>
                        <span className={`shrink-0 text-sm font-bold ${
                          log.amount > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                        }`}>
                          {log.amount > 0 ? '+' : ''}{log.amount}
                        </span>
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                        <span>{formatDate(log.created_at)}</span>
                        <span>{t('admin.credits.historyBalance')}: {log.balance_after}</span>
                        {log.project_name && (
                          <span className="truncate">{t('admin.credits.historyProject')}: {log.project_name}</span>
                        )}
                        {log.created_by_name && log.amount > 0 && (
                          <span>{t('admin.credits.historyBy')}: {log.created_by_name}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center py-12">
                <p className="text-sm text-muted-foreground">{t('admin.credits.historyEmpty')}</p>
              </div>
            )}
          </div>

          {/* 페이지네이션 */}
          {historyData && historyData.totalPages > 1 && (
            <div className="flex items-center justify-between border-t pt-3 mt-3">
              <span className="text-xs text-muted-foreground">
                {t('admin.credits.historyTotal', { count: historyData.total })}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={historyPage <= 1}
                  onClick={() => handleHistoryPageChange(historyPage - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">
                  {historyPage} / {historyData.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={historyPage >= historyData.totalPages}
                  onClick={() => handleHistoryPageChange(historyPage + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
