import { redirect } from 'next/navigation'
import { setRequestLocale } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { LandingNav } from '@/features/landing/components/LandingNav'
import { HeroSection } from '@/features/landing/components/HeroSection'
import { ProblemSection } from '@/features/landing/components/ProblemSection'
import { SolutionOverviewSection } from '@/features/landing/components/SolutionOverviewSection'
import { StakeholderValueSection } from '@/features/landing/components/StakeholderValueSection'
import { WorkflowSection } from '@/features/landing/components/WorkflowSection'
import { AITechSection } from '@/features/landing/components/AITechSection'
import { StatsSection } from '@/features/landing/components/StatsSection'
import { PartnersSection } from '@/features/landing/components/PartnersSection'
import { TestimonialSection } from '@/features/landing/components/TestimonialSection'
import { FAQSection } from '@/features/landing/components/FAQSection'
import { FinalCTASection } from '@/features/landing/components/FinalCTASection'
import { LandingFooter } from '@/features/landing/components/LandingFooter'

interface Props {
  params: Promise<{ locale: string }>
}

export default async function LandingPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)

  // 로그인된 사용자는 역할에 따라 리다이렉트
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const { data: profile } = await supabase
      .from('bi_users')
      .select('role, is_approved')
      .eq('id', user.id)
      .single()

    // 미승인 사용자는 승인 대기 페이지로
    if (profile && !profile.is_approved) {
      redirect(`/${locale}/pending-approval`)
    }

    if (profile?.role === 'admin') {
      redirect(`/${locale}/admin`)
    } else if (profile?.role === 'institution') {
      redirect(`/${locale}/institution/dashboard`)
    } else {
      redirect(`/${locale}/dashboard`)
    }
  }

  return (
    <div className="min-h-screen">
      <LandingNav />
      <HeroSection />
      <ProblemSection />
      <SolutionOverviewSection />
      <StakeholderValueSection />
      <WorkflowSection />
      <AITechSection />
      <StatsSection />
      <PartnersSection />
      <TestimonialSection />
      <FAQSection />
      <FinalCTASection />
      <LandingFooter />
    </div>
  )
}
