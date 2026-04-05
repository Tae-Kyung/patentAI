import { setRequestLocale } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

interface AdminLayoutProps {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export default async function AdminLayout({
  children,
  params,
}: AdminLayoutProps) {
  const { locale } = await params
  setRequestLocale(locale)

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/${locale}/login`)
  }

  // 관리자 권한 확인
  const { data: userProfile } = await supabase
    .from('bi_users')
    .select('role')
    .eq('id', user.id)
    .single()

  // 멘토 또는 관리자만 접근 가능
  if (!userProfile || !['admin', 'mentor'].includes(userProfile.role)) {
    redirect(`/${locale}/dashboard`)
  }

  return <>{children}</>
}
