'use client'

import { Link } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import {
  Building2,
  GraduationCap,
  Rocket,
  ArrowRight,
  Check,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useScrollAnimation } from '../hooks/useScrollAnimation'

export function HeroSection() {
  const t = useTranslations('landing.hero')
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.05 })

  const trustItems = [t('trust1'), t('trust2'), t('trust3')]

  const roles = [
    {
      Icon: Building2,
      title: t('institutionTitle'),
      desc: t('institutionDesc'),
      cta: t('institutionCta'),
      href: '/signup?role=institution',
      borderHover: 'hover:border-primary',
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
      borderHover: 'hover:border-violet-500',
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
      borderHover: 'hover:border-emerald-500',
      iconBg: 'bg-emerald-500/10',
      iconColor: 'text-emerald-600',
      btnClass: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    },
  ]

  return (
    <section className="relative min-h-[100dvh] flex items-center pt-16">
      {/* Background pattern */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_1px_1px,_theme(colors.primary/0.03)_1px,_transparent_0)] [background-size:24px_24px]" />
      {/* Gradient blob */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-primary/5 blur-3xl pointer-events-none" />

      <div ref={ref} className="container mx-auto px-4 py-10 md:py-20">
        <div className="max-w-5xl mx-auto text-center space-y-8">
          {/* Badge */}
          <div
            className={`transition-all duration-700 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            <Badge
              variant="secondary"
              className="px-4 py-1.5 text-sm font-medium bg-primary/10 text-primary border-0"
            >
              {t('badge')}
            </Badge>
          </div>

          {/* Headline */}
          <h1
            className={`text-4xl md:text-5xl lg:text-[60px] font-bold tracking-tight leading-tight transition-all duration-700 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
            style={{ transitionDelay: isVisible ? '100ms' : '0ms' }}
          >
            {t('titleLine1')}
            <br />
            <span className="bg-gradient-to-r from-primary to-emerald-500 bg-clip-text text-transparent">
              {t('titleLine2')}
            </span>
          </h1>

          {/* Subtitle */}
          <p
            className={`text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed transition-all duration-700 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
            style={{ transitionDelay: isVisible ? '200ms' : '0ms' }}
          >
            {t('subtitle')}
          </p>

          {/* Role cards */}
          <div
            className={`grid md:grid-cols-3 gap-5 max-w-4xl mx-auto transition-all duration-700 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
            style={{ transitionDelay: isVisible ? '400ms' : '0ms' }}
          >
            {roles.map((role, i) => (
              <div
                key={i}
                className={`group bg-card border-2 border-border rounded-2xl p-6 text-left ${role.borderHover} hover:shadow-lg transition-all duration-300 hover:scale-[1.02]`}
              >
                <div
                  className={`h-11 w-11 rounded-xl ${role.iconBg} flex items-center justify-center mb-4`}
                >
                  <role.Icon className={`h-5 w-5 ${role.iconColor}`} />
                </div>
                <h3 className="text-lg font-bold mb-2">{role.title}</h3>
                <p className="text-sm text-muted-foreground mb-5 leading-relaxed">{role.desc}</p>
                <Button
                  className={`w-full ${role.btnClass}`}
                  variant={role.btnClass ? undefined : 'default'}
                  asChild
                >
                  <Link href={role.href}>
                    {role.cta}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            ))}
          </div>

          {/* Trust items */}
          <div
            className={`flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground transition-all duration-700 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
            style={{ transitionDelay: isVisible ? '600ms' : '0ms' }}
          >
            {trustItems.map((item) => (
              <span key={item} className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-green-500" />
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <ChevronRight className="h-5 w-5 text-muted-foreground/50 rotate-90" />
      </div>
    </section>
  )
}
