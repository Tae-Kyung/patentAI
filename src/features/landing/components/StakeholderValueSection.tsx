'use client'

import { Link } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import {
  Building2,
  GraduationCap,
  Rocket,
  LayoutDashboard,
  Sparkles,
  DollarSign,
  BarChart3,
  MonitorCheck,
  FileStack,
  Bot,
  FolderOpen,
  Lightbulb,
  MessageCircle,
  TrendingUp,
  Link2,
  ArrowRight,
  Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useScrollAnimation } from '../hooks/useScrollAnimation'

type Role = 'institution' | 'mentor' | 'entrepreneur'

const institutionIcons = [LayoutDashboard, Sparkles, DollarSign, BarChart3]
const mentorIcons = [MonitorCheck, FileStack, Bot, FolderOpen]
const entrepreneurIcons = [Lightbulb, MessageCircle, TrendingUp, Link2]

export function StakeholderValueSection() {
  const t = useTranslations('landing.stakeholder')
  const { ref, isVisible } = useScrollAnimation()
  const [activeRole, setActiveRole] = useState<Role>('institution')

  const tabs: {
    key: Role
    label: string
    Icon: typeof Building2
    activeClass: string
    iconColor: string
  }[] = [
    {
      key: 'institution',
      label: t('institutionTab'),
      Icon: Building2,
      activeClass: 'border-primary bg-primary/10 text-primary',
      iconColor: 'text-primary',
    },
    {
      key: 'mentor',
      label: t('mentorTab'),
      Icon: GraduationCap,
      activeClass: 'border-violet-400 bg-violet-500/10 text-violet-600',
      iconColor: 'text-violet-600',
    },
    {
      key: 'entrepreneur',
      label: t('entrepreneurTab'),
      Icon: Rocket,
      activeClass: 'border-emerald-400 bg-emerald-500/10 text-emerald-600',
      iconColor: 'text-emerald-600',
    },
  ]

  const roleData = {
    institution: {
      title: t('institution.title'),
      cta: t('institution.cta'),
      href: '/signup?role=institution',
      ctaClass: '',
      iconBg: 'bg-primary/10',
      iconColor: 'text-primary',
      checkColor: 'text-primary',
      icons: institutionIcons,
      features: [
        { title: t('institution.f1Title'), desc: t('institution.f1Desc') },
        { title: t('institution.f2Title'), desc: t('institution.f2Desc') },
        { title: t('institution.f3Title'), desc: t('institution.f3Desc') },
        { title: t('institution.f4Title'), desc: t('institution.f4Desc') },
      ],
    },
    mentor: {
      title: t('mentor.title'),
      cta: t('mentor.cta'),
      href: '/signup?role=mentor',
      ctaClass: 'bg-violet-600 hover:bg-violet-700 text-white',
      iconBg: 'bg-violet-500/10',
      iconColor: 'text-violet-600',
      checkColor: 'text-violet-600',
      icons: mentorIcons,
      features: [
        { title: t('mentor.f1Title'), desc: t('mentor.f1Desc') },
        { title: t('mentor.f2Title'), desc: t('mentor.f2Desc') },
        { title: t('mentor.f3Title'), desc: t('mentor.f3Desc') },
        { title: t('mentor.f4Title'), desc: t('mentor.f4Desc') },
      ],
    },
    entrepreneur: {
      title: t('entrepreneur.title'),
      cta: t('entrepreneur.cta'),
      href: '/signup',
      ctaClass: 'bg-emerald-600 hover:bg-emerald-700 text-white',
      iconBg: 'bg-emerald-500/10',
      iconColor: 'text-emerald-600',
      checkColor: 'text-emerald-600',
      icons: entrepreneurIcons,
      features: [
        { title: t('entrepreneur.f1Title'), desc: t('entrepreneur.f1Desc') },
        { title: t('entrepreneur.f2Title'), desc: t('entrepreneur.f2Desc') },
        { title: t('entrepreneur.f3Title'), desc: t('entrepreneur.f3Desc') },
        { title: t('entrepreneur.f4Title'), desc: t('entrepreneur.f4Desc') },
      ],
    },
  }

  const active = roleData[activeRole]
  const activeTab = tabs.find((tab) => tab.key === activeRole)!

  return (
    <section id="stakeholders" className="py-20 md:py-24 bg-muted/20">
      <div ref={ref} className="container mx-auto px-4">
        {/* Header */}
        <div
          className={`text-center mb-10 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <h2 className="text-3xl md:text-4xl font-bold">{t('title')}</h2>
        </div>

        {/* Tab buttons */}
        <div
          className={`flex flex-wrap justify-center gap-3 mb-10 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
          style={{ transitionDelay: isVisible ? '150ms' : '0ms' }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveRole(tab.key)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full border-2 text-sm font-semibold transition-all duration-200 ${
                activeRole === tab.key
                  ? tab.activeClass
                  : 'border-border text-muted-foreground hover:border-muted-foreground/50'
              }`}
            >
              <tab.Icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content card */}
        <div
          className={`max-w-4xl mx-auto transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
          style={{ transitionDelay: isVisible ? '300ms' : '0ms' }}
        >
          <div className="bg-card border-2 rounded-2xl p-6 md:p-10">
            {/* Card header */}
            <div className="flex items-center gap-3 mb-8">
              <div
                className={`h-10 w-10 rounded-xl flex items-center justify-center ${active.iconBg}`}
              >
                <activeTab.Icon className={`h-5 w-5 ${activeTab.iconColor}`} />
              </div>
              <h3 className="text-lg md:text-xl font-bold">{active.title}</h3>
            </div>

            {/* Feature grid */}
            <div className="grid sm:grid-cols-2 gap-4 mb-8">
              {active.features.map((feature, i) => {
                const FIcon = active.icons[i]
                return (
                  <div
                    key={i}
                    className="flex items-start gap-4 rounded-xl border bg-muted/30 p-4"
                  >
                    <div
                      className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${active.iconBg}`}
                    >
                      <FIcon className={`h-4 w-4 ${active.iconColor}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <Check className={`h-3.5 w-3.5 ${active.checkColor} shrink-0`} />
                        <span className="text-sm font-semibold">{feature.title}</span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {feature.desc}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* CTA button */}
            <Button
              size="lg"
              className={`h-12 px-8 ${active.ctaClass}`}
              variant={active.ctaClass ? undefined : 'default'}
              asChild
            >
              <Link href={active.href}>
                {active.cta}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
