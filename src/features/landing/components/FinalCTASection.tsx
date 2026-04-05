'use client'

import { Link } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import { Building2, GraduationCap, Rocket, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useScrollAnimation } from '../hooks/useScrollAnimation'

export function FinalCTASection() {
  const t = useTranslations('landing.finalCta')
  const { ref, isVisible } = useScrollAnimation()

  const ctaCards = [
    {
      Icon: Building2,
      title: t('institutionTitle'),
      desc: t('institutionDesc'),
      cta: t('institutionCta'),
      href: '/signup?role=institution',
      borderColor: 'border-primary/40',
      iconBg: 'bg-primary/10',
      iconColor: 'text-primary',
      btnClass: '',
    },
    {
      Icon: GraduationCap,
      title: t('mentorTitle'),
      desc: t('mentorDesc'),
      cta: t('mentorCta'),
      href: '/signup?role=mentor',
      borderColor: 'border-violet-400/40',
      iconBg: 'bg-violet-500/10',
      iconColor: 'text-violet-600',
      btnClass: 'bg-violet-600 hover:bg-violet-700 text-white',
    },
    {
      Icon: Rocket,
      title: t('entrepreneurTitle'),
      desc: t('entrepreneurDesc'),
      cta: t('entrepreneurCta'),
      href: '/signup',
      borderColor: 'border-emerald-400/40',
      iconBg: 'bg-emerald-500/10',
      iconColor: 'text-emerald-600',
      btnClass: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    },
  ]

  return (
    <section className="py-20 md:py-24 bg-gradient-to-br from-primary/10 via-background to-emerald-500/10">
      <div ref={ref} className="container mx-auto px-4">
        <div
          className={`text-center mb-12 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <h2 className="text-3xl md:text-4xl lg:text-[40px] font-bold leading-tight mb-4">
            {t('title')}
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            {t('subtitle')}
          </p>
        </div>

        {/* 3-role CTA cards */}
        <div
          className={`grid md:grid-cols-3 gap-5 max-w-4xl mx-auto mb-8 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
          style={{ transitionDelay: isVisible ? '200ms' : '0ms' }}
        >
          {ctaCards.map((card, i) => (
            <div
              key={i}
              className={`flex flex-col bg-card rounded-2xl border-2 ${card.borderColor} p-6 hover:shadow-xl hover:scale-[1.02] transition-all duration-300`}
              style={{ transitionDelay: isVisible ? `${200 + i * 100}ms` : '0ms' }}
            >
              <div
                className={`h-12 w-12 rounded-xl ${card.iconBg} flex items-center justify-center mb-4`}
              >
                <card.Icon className={`h-6 w-6 ${card.iconColor}`} />
              </div>
              <h3 className="text-lg font-bold mb-2">{card.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-5 flex-1">{card.desc}</p>
              <Button
                size="lg"
                className={`w-full ${card.btnClass}`}
                variant={card.btnClass ? undefined : 'default'}
                asChild
              >
                <Link href={card.href}>
                  {card.cta}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          ))}
        </div>

        {/* Login link */}
        <p
          className={`text-sm text-muted-foreground text-center transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
          style={{ transitionDelay: isVisible ? '500ms' : '0ms' }}
        >
          {t('loginText')}{' '}
          <Link href="/login" className="text-primary hover:underline font-medium">
            {t('loginLink')}
          </Link>
        </p>
      </div>
    </section>
  )
}
