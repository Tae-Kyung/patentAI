'use client'

import { useTranslations } from 'next-intl'
import { Info } from 'lucide-react'

export function AiDisclaimer() {
  const t = useTranslations()

  return (
    <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300">
      <Info className="h-3.5 w-3.5 shrink-0" />
      <span>{t('common.aiDisclaimer')}</span>
    </div>
  )
}
