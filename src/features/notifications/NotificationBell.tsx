'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { useRouter } from 'next/navigation'

interface Notification {
  id: string
  type: string
  title: string
  message: string | null
  link: string | null
  is_read: boolean
  created_at: string
}

export function NotificationBell() {
  const t = useTranslations('notifications')
  const router = useRouter()
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isOpen, setIsOpen] = useState(false)

  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications/unread-count')
      const result = await response.json()
      if (result.success) {
        setUnreadCount(result.data.count)
      }
    } catch {
      // silently fail
    }
  }, [])

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/notifications?limit=5')
      const result = await response.json()
      if (result.success) {
        setNotifications(result.data.items)
      }
    } catch {
      // silently fail
    }
  }

  useEffect(() => {
    fetchUnreadCount()
    const interval = setInterval(fetchUnreadCount, 30000) // 30초마다 체크
    return () => clearInterval(interval)
  }, [fetchUnreadCount])

  const handleOpen = (open: boolean) => {
    setIsOpen(open)
    if (open) {
      fetchNotifications()
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await fetch('/api/notifications/read-all', { method: 'POST' })
      setUnreadCount(0)
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    } catch {
      // silently fail
    }
  }

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      await fetch(`/api/notifications/${notification.id}/read`, { method: 'PATCH' })
      setUnreadCount((prev) => Math.max(0, prev - 1))
    }
    if (notification.link) {
      router.push(notification.link)
    }
    setIsOpen(false)
  }

  return (
    <Popover open={isOpen} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 p-0 text-[10px] text-white"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-sm font-semibold">{t('title')}</h3>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="text-xs" onClick={handleMarkAllRead}>
              {t('markAllRead')}
            </Button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              {t('noNotifications')}
            </p>
          ) : (
            <div>
              {notifications.map((notification) => (
                <button
                  key={notification.id}
                  className={`flex w-full flex-col gap-1 border-b px-4 py-3 text-left transition-colors hover:bg-muted/50 ${
                    !notification.is_read ? 'bg-blue-50 dark:bg-blue-950/20' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <p className={`text-sm ${!notification.is_read ? 'font-medium' : ''}`}>
                    {notification.title}
                  </p>
                  {notification.message && (
                    <p className="line-clamp-2 text-xs text-muted-foreground">
                      {notification.message}
                    </p>
                  )}
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(notification.created_at).toLocaleString()}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
