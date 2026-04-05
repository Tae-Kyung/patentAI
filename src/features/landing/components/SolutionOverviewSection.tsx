'use client'

import { useTranslations } from 'next-intl'
import { Building2, GraduationCap, Rocket, ArrowRight } from 'lucide-react'
import { useScrollAnimation } from '../hooks/useScrollAnimation'

export function SolutionOverviewSection() {
  const t = useTranslations('landing.solution')
  const { ref, isVisible } = useScrollAnimation()

  const nodes = [
    {
      Icon: Building2,
      label: '기관담당자',
      bg: 'bg-primary/10',
      border: 'border-primary/30',
      text: 'text-primary',
    },
    {
      Icon: GraduationCap,
      label: '멘토',
      bg: 'bg-violet-500/10',
      border: 'border-violet-400/30',
      text: 'text-violet-600',
    },
    {
      Icon: Rocket,
      label: '창업자',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-400/30',
      text: 'text-emerald-600',
    },
  ]

  const lines = [
    { Icon: Building2, bg: 'bg-primary/10', color: 'text-primary', text: t('institutionLine') },
    { Icon: GraduationCap, bg: 'bg-violet-500/10', color: 'text-violet-600', text: t('mentorLine') },
    { Icon: Rocket, bg: 'bg-emerald-500/10', color: 'text-emerald-600', text: t('entrepreneurLine') },
  ]

  return (
    <section className="py-20 md:py-24">
      <div ref={ref} className="container mx-auto px-4">
        <div
          className={`text-center mb-14 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <h2 className="text-3xl md:text-4xl font-bold">{t('title')}</h2>
        </div>

        <div className="max-w-3xl mx-auto">
          {/* Diagram */}
          <div
            className={`flex flex-col items-center mb-14 transition-all duration-700 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
            style={{ transitionDelay: isVisible ? '150ms' : '0ms' }}
          >
            {/* CASA Platform node */}
            <div className="px-8 py-3 rounded-2xl border-2 border-primary bg-primary/10 font-bold text-primary text-base mb-6 shadow-[0_0_20px_rgba(59,130,246,0.12)]">
              CASA Platform
            </div>
            {/* Vertical connector */}
            <div className="w-px h-6 bg-gradient-to-b from-primary/50 to-primary/10 mb-0" />
            {/* Horizontal bar */}
            <div className="relative w-full flex justify-between items-start">
              <div className="absolute top-0 left-[16.7%] right-[16.7%] h-px border-t-2 border-dashed border-primary/20" />
              {nodes.map((node, i) => (
                <div
                  key={i}
                  className={`flex flex-col items-center gap-2 p-4 md:p-6 rounded-2xl border ${node.border} ${node.bg} w-[30%] transition-all duration-700`}
                  style={{ transitionDelay: isVisible ? `${250 + i * 100}ms` : '0ms' }}
                >
                  <node.Icon className={`h-7 w-7 ${node.text}`} />
                  <span className={`text-xs sm:text-sm font-bold ${node.text}`}>{node.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Description lines */}
          <div className="space-y-3">
            {lines.map((line, i) => (
              <div
                key={i}
                className={`flex items-center gap-4 rounded-xl bg-card border p-4 md:p-5 transition-all duration-700 ${
                  isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-6'
                }`}
                style={{ transitionDelay: isVisible ? `${450 + i * 100}ms` : '0ms' }}
              >
                <div
                  className={`h-9 w-9 rounded-lg ${line.bg} flex items-center justify-center shrink-0`}
                >
                  <line.Icon className={`h-4 w-4 ${line.color}`} />
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground/30 shrink-0" />
                <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                  {line.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
