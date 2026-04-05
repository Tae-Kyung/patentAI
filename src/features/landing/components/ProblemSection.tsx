'use client'

import { useTranslations } from 'next-intl'
import { Building2, GraduationCap, Rocket } from 'lucide-react'
import { useScrollAnimation } from '../hooks/useScrollAnimation'

export function ProblemSection() {
  const t = useTranslations('landing.problem')
  const { ref, isVisible } = useScrollAnimation()

  const columns = [
    {
      Icon: Building2,
      title: t('institutionTitle'),
      borderColor: 'border-t-primary',
      iconBg: 'bg-primary/10',
      iconColor: 'text-primary',
      titleColor: 'text-primary',
      items: [t('institution1'), t('institution2'), t('institution3')],
    },
    {
      Icon: GraduationCap,
      title: t('mentorTitle'),
      borderColor: 'border-t-violet-500',
      iconBg: 'bg-violet-500/10',
      iconColor: 'text-violet-600',
      titleColor: 'text-violet-600',
      items: [t('mentor1'), t('mentor2'), t('mentor3')],
    },
    {
      Icon: Rocket,
      title: t('entrepreneurTitle'),
      borderColor: 'border-t-emerald-500',
      iconBg: 'bg-emerald-500/10',
      iconColor: 'text-emerald-600',
      titleColor: 'text-emerald-600',
      items: [t('entrepreneur1'), t('entrepreneur2'), t('entrepreneur3')],
    },
  ]

  return (
    <section className="py-20 md:py-24 bg-muted/30">
      <div ref={ref} className="container mx-auto px-4">
        <h2
          className={`text-3xl md:text-4xl font-bold text-center mb-12 md:mb-16 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          {t('title')}
        </h2>

        <div className="grid md:grid-cols-3 gap-6 md:gap-8">
          {columns.map((col, i) => (
            <div
              key={i}
              className={`rounded-2xl border bg-card p-6 md:p-8 border-t-4 ${col.borderColor} transition-all duration-700 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
              style={{ transitionDelay: isVisible ? `${i * 150}ms` : '0ms' }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div
                  className={`h-10 w-10 rounded-lg ${col.iconBg} flex items-center justify-center`}
                >
                  <col.Icon className={`h-5 w-5 ${col.iconColor}`} />
                </div>
                <h3 className={`text-base font-bold ${col.titleColor}`}>{col.title}</h3>
              </div>
              <div className="space-y-4">
                {col.items.map((item, j) => (
                  <div key={j} className="flex items-start gap-3">
                    <span className="text-destructive/50 font-bold shrink-0 mt-0.5">•</span>
                    <p className="text-sm text-muted-foreground leading-relaxed">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
