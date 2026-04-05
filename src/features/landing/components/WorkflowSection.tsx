'use client'

import { useTranslations } from 'next-intl'
import { UserCheck, Link2, Cpu, MessageSquare, CheckCircle2 } from 'lucide-react'
import { useScrollAnimation } from '../hooks/useScrollAnimation'

const stepIcons = [UserCheck, Link2, Cpu, MessageSquare, CheckCircle2]
const stepColors = [
  { bg: 'bg-primary/10', text: 'text-primary', border: 'border-primary/30', badge: 'bg-primary/10 text-primary' },
  { bg: 'bg-violet-500/10', text: 'text-violet-600', border: 'border-violet-400/30', badge: 'bg-violet-500/10 text-violet-600' },
  { bg: 'bg-emerald-500/10', text: 'text-emerald-600', border: 'border-emerald-400/30', badge: 'bg-emerald-500/10 text-emerald-600' },
  { bg: 'bg-amber-500/10', text: 'text-amber-600', border: 'border-amber-400/30', badge: 'bg-amber-500/10 text-amber-600' },
  { bg: 'bg-teal-500/10', text: 'text-teal-600', border: 'border-teal-400/30', badge: 'bg-teal-500/10 text-teal-600' },
]

export function WorkflowSection() {
  const t = useTranslations('landing.workflow')
  const { ref, isVisible } = useScrollAnimation()

  const steps = [
    { title: t('step1Title'), desc: t('step1Desc'), role: t('step1Role') },
    { title: t('step2Title'), desc: t('step2Desc'), role: t('step2Role') },
    { title: t('step3Title'), desc: t('step3Desc'), role: t('step3Role') },
    { title: t('step4Title'), desc: t('step4Desc'), role: t('step4Role') },
    { title: t('step5Title'), desc: t('step5Desc'), role: t('step5Role') },
  ]

  return (
    <section id="workflow" className="py-20 md:py-24">
      <div ref={ref} className="container mx-auto px-4">
        <div
          className={`text-center mb-12 md:mb-16 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <h2 className="text-3xl md:text-4xl font-bold">{t('title')}</h2>
        </div>

        {/* Desktop: horizontal timeline */}
        <div className="hidden lg:block">
          <div className="relative max-w-6xl mx-auto">
            {/* Connecting line */}
            <div className="absolute top-10 left-[10%] right-[10%] h-px border-t-2 border-dashed border-muted-foreground/20" />

            <div className="grid grid-cols-5 gap-4">
              {steps.map((step, i) => {
                const Icon = stepIcons[i]
                const color = stepColors[i]
                return (
                  <div
                    key={i}
                    className={`flex flex-col items-center text-center transition-all duration-700 ${
                      isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                    }`}
                    style={{ transitionDelay: isVisible ? `${i * 100}ms` : '0ms' }}
                  >
                    {/* Step circle */}
                    <div
                      className={`relative z-10 h-20 w-20 rounded-2xl ${color.bg} border ${color.border} flex items-center justify-center mb-4 shadow-sm`}
                    >
                      <Icon className={`h-7 w-7 ${color.text}`} />
                      <span className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                        {i + 1}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold mb-1.5">{step.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed mb-2">{step.desc}</p>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${color.badge}`}
                    >
                      {step.role}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Mobile: vertical timeline */}
        <div className="lg:hidden max-w-md mx-auto space-y-0">
          {steps.map((step, i) => {
            const Icon = stepIcons[i]
            const color = stepColors[i]
            return (
              <div
                key={i}
                className={`flex gap-4 transition-all duration-700 ${
                  isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-6'
                }`}
                style={{ transitionDelay: isVisible ? `${i * 100}ms` : '0ms' }}
              >
                {/* Left column: icon + line */}
                <div className="flex flex-col items-center">
                  <div
                    className={`h-12 w-12 rounded-xl ${color.bg} border ${color.border} flex items-center justify-center shrink-0 relative`}
                  >
                    <Icon className={`h-5 w-5 ${color.text}`} />
                    <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
                      {i + 1}
                    </span>
                  </div>
                  {i < steps.length - 1 && (
                    <div className="w-px flex-1 min-h-[2rem] border-l-2 border-dashed border-muted-foreground/20 my-2" />
                  )}
                </div>

                {/* Right column: content */}
                <div className="pb-6">
                  <h3 className="text-sm font-bold mb-1">{step.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-1.5">{step.desc}</p>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${color.badge}`}>
                    {step.role}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
