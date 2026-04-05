'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { X } from 'lucide-react'
import type { User, MentorProfile } from '@/types/database'

interface DashboardBannerProps {
  user: User
  mentorProfile?: MentorProfile | null
}

export function DashboardBanner({ user, mentorProfile }: DashboardBannerProps) {
  const t = useTranslations()
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  // 승인 대기 배너
  if (!user.is_approved) {
    return (
      <div className="relative bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
        <button
          onClick={() => setDismissed(true)}
          className="absolute top-2 right-2 text-yellow-600 dark:text-yellow-400 hover:opacity-70"
        >
          <X className="h-4 w-4" />
        </button>
        <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
          {t('auth.pendingApprovalTitle')}
        </p>
        <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-1">
          {t('auth.pendingApprovalDesc')}
        </p>
      </div>
    )
  }

  // 멘토 프로필 미완성 배너
  if (user.role === 'mentor' && mentorProfile && (!mentorProfile.resume_url || !mentorProfile.bank_account_url)) {
    return (
      <div className="relative bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
        <button
          onClick={() => setDismissed(true)}
          className="absolute top-2 right-2 text-blue-600 dark:text-blue-400 hover:opacity-70"
        >
          <X className="h-4 w-4" />
        </button>
        <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
          {t('auth.profileIncomplete')}
        </p>
        <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
          {t('auth.profileIncompleteDesc')}
        </p>
      </div>
    )
  }

  return null
}
