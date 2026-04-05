'use client'

import { useTranslations } from 'next-intl'
import { Building2, Lock, ClipboardCheck } from 'lucide-react'
import { useScrollAnimation } from '../hooks/useScrollAnimation'

const partnerNames = [
  '충북창조경제혁신센터',
  '충남창조경제혁신센터',
  '대전창조경제혁신센터',
  '경기창조경제혁신센터',
  '서울창조경제혁신센터',
  '부산창조경제혁신센터',
  '창업진흥원',
  '한국청년기업가정신재단',
]

export function PartnersSection() {
  const t = useTranslations('landing.partners')
  const { ref, isVisible } = useScrollAnimation()

  const badges = [
    { icon: Building2, text: t('badge1'), color: 'text-primary', bg: 'bg-primary/10' },
    { icon: Lock, text: t('badge2'), color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
    { icon: ClipboardCheck, text: t('badge3'), color: 'text-violet-600', bg: 'bg-violet-500/10' },
  ]

  return (
    <section className="py-20 md:py-24 bg-muted/20">
      <div ref={ref} className="container mx-auto px-4">
        <div
          className={`text-center mb-10 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-3">{t('title')}</h2>
          <p className="text-lg text-muted-foreground">{t('subtitle')}</p>
        </div>

        {/* Partner name scroller */}
        <div
          className={`overflow-hidden mb-10 transition-all duration-700 ${
            isVisible ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ transitionDelay: isVisible ? '200ms' : '0ms' }}
        >
          <div className="flex gap-6 animate-[marquee_20s_linear_infinite] whitespace-nowrap">
            {[...partnerNames, ...partnerNames].map((name, i) => (
              <div
                key={i}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border bg-card text-sm font-medium text-muted-foreground shrink-0"
              >
                <Building2 className="h-3.5 w-3.5 text-primary" />
                {name}
              </div>
            ))}
          </div>
        </div>

        {/* Trust badges */}
        <div
          className={`flex flex-wrap justify-center gap-4 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
          style={{ transitionDelay: isVisible ? '400ms' : '0ms' }}
        >
          {badges.map((badge, i) => (
            <div
              key={i}
              className={`flex items-center gap-2.5 px-5 py-2.5 rounded-full border ${badge.bg}`}
            >
              <badge.icon className={`h-4 w-4 ${badge.color}`} />
              <span className={`text-sm font-semibold ${badge.color}`}>{badge.text}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
