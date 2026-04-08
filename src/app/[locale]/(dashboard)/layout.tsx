import { setRequestLocale } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/dashboard-layout'

interface DashboardLayoutWrapperProps {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export default async function DashboardLayoutWrapper({
  children,
  params,
}: DashboardLayoutWrapperProps) {
  const { locale } = await params
  setRequestLocale(locale)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/${locale}/login`)
  }

  const isAdmin = user.app_metadata?.role === 'admin'

  return (
    <DashboardLayout userEmail={user.email} isAdmin={isAdmin}>
      {children}
    </DashboardLayout>
  )
}
