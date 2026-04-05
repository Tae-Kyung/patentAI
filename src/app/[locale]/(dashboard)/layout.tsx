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

  // 사용자 역할 조회
  const { data: userProfile } = await supabase
    .from('bi_users')
    .select('role, name')
    .eq('id', user.id)
    .single()

  const userRole = (userProfile?.role as 'user' | 'mentor' | 'institution' | 'admin') || 'user'

  // 기관 담당자인 경우 기관명 조회
  let institutionName: string | undefined
  if (userRole === 'institution') {
    const { data: membership } = await supabase
      .from('bi_institution_members')
      .select('institution:institution_id(name)')
      .eq('user_id', user.id)
      .eq('is_approved', true)
      .limit(1)
      .single()

    institutionName = (membership?.institution as unknown as { name: string } | null)?.name || undefined
  }

  return (
    <DashboardLayout userRole={userRole} userName={userProfile?.name} userEmail={user.email} institutionName={institutionName}>
      {children}
    </DashboardLayout>
  )
}
