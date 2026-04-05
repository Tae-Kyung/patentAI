import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  const t = useTranslations('notFound')

  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <h1 className="text-6xl font-bold">{t('title')}</h1>
      <p className="mt-4 text-xl text-muted-foreground">{t('description')}</p>
      <Button asChild className="mt-8">
        <Link href="/dashboard">{t('goToDashboard')}</Link>
      </Button>
    </div>
  )
}
