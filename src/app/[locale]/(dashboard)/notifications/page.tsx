'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Bell, RefreshCw, CheckCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/common/loading-spinner'
import { Pagination } from '@/components/common/pagination'
import { toast } from 'sonner'

interface Notification {
  id: string
  type: string
  title: string
  message: string | null
  link: string | null
  is_read: boolean
  created_at: string
}

export default function NotificationsPage() {
  const t = useTranslations()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({ page: currentPage.toString(), limit: '20' })
      const response = await fetch(`/api/notifications?${params}`)
      const result = await response.json()

      if (result.success) {
        setNotifications(result.data.items)
        setTotalPages(result.data.pagination?.totalPages || 1)
      }
    } catch {
      toast.error(t('notifications.fetchFailed'))
    } finally {
      setIsLoading(false)
    }
  }, [currentPage, t])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  const handleMarkAllRead = async () => {
    try {
      const response = await fetch('/api/notifications/read-all', { method: 'POST' })
      const result = await response.json()
      if (result.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
        toast.success(t('notifications.markAllRead'))
      }
    } catch {
      toast.error(t('notifications.fetchFailed'))
    }
  }

  const handleMarkRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' })
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      )
    } catch {}
  }

  const typeIcons: Record<string, string> = {
    approval: '✅',
    match: '🔗',
    message: '✉️',
    payout: '💰',
    payout_approved: '💰',
    report: '📄',
    report_rejected: '❌',
    report_confirmed: '✅',
    system: '🔔',
    mentor_invite: '📩',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('notifications.title')}</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
            <CheckCheck className="mr-2 h-4 w-4" />
            {t('notifications.markAllRead')}
          </Button>
          <Button variant="outline" size="sm" onClick={fetchNotifications}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {t('common.refresh')}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : notifications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bell className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">{t('notifications.noNotifications')}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-2">
            {notifications.map((notif) => (
              <Card
                key={notif.id}
                className={`cursor-pointer transition-colors hover:bg-accent/50 ${
                  !notif.is_read ? 'border-l-4 border-l-primary' : ''
                }`}
                onClick={() => {
                  if (!notif.is_read) handleMarkRead(notif.id)
                  if (notif.link) window.location.href = notif.link
                }}
              >
                <CardContent className="flex items-start gap-3 py-3">
                  <span className="mt-0.5 text-lg">
                    {typeIcons[notif.type] || '🔔'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm ${!notif.is_read ? 'font-semibold' : ''}`}>
                        {notif.title}
                      </p>
                      {!notif.is_read && (
                        <Badge className="bg-primary text-primary-foreground text-xs px-1.5">
                          New
                        </Badge>
                      )}
                    </div>
                    {notif.message && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {notif.message}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(notif.created_at).toLocaleString('ko-KR', {
                        year: 'numeric', month: '2-digit', day: '2-digit',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {totalPages > 1 && (
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
          )}
        </>
      )}
    </div>
  )
}
