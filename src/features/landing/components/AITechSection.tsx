'use client'

import { useTranslations } from 'next-intl'
import { Check, X } from 'lucide-react'
import { useScrollAnimation } from '../hooks/useScrollAnimation'

export function AITechSection() {
  const t = useTranslations('landing.aiTech')
  const { ref, isVisible } = useScrollAnimation()

  const columns = [
    {
      title: t('col1Title'),
      items: [t('col1Item1'), t('col1Item2'), t('col1Item3'), t('col1Item4'), t('col1Item5')],
      highlighted: false,
    },
    {
      title: t('col2Title'),
      items: [t('col2Item1'), t('col2Item2'), t('col2Item3'), t('col2Item4'), t('col2Item5')],
      highlighted: false,
    },
    {
      title: t('col3Title'),
      items: [t('col3Item1'), t('col3Item2'), t('col3Item3'), t('col3Item4'), t('col3Item5')],
      highlighted: true,
    },
  ]

  return (
    <section className="py-20 md:py-24 bg-slate-900 text-white">
      <div ref={ref} className="container mx-auto px-4">
        <div
          className={`text-center mb-12 md:mb-16 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">{t('title')}</h2>
          <p className="text-lg text-slate-300 max-w-2xl mx-auto">{t('subtitle')}</p>
        </div>

        {/* Orchestrator diagram */}
        <div
          className={`max-w-2xl mx-auto mb-16 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
          style={{ transitionDelay: isVisible ? '200ms' : '0ms' }}
        >
          <div className="relative">
            {/* User input */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-600 bg-slate-800 text-sm font-medium">
                <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                User Input
              </div>
            </div>

            {/* Connection line */}
            <div className="flex justify-center mb-4">
              <div className="w-px h-8 bg-gradient-to-b from-primary/60 to-primary/20" />
            </div>

            {/* AI models */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[
                { name: 'Claude', role: 'Logical Analysis', color: 'border-orange-400/50 bg-orange-400/5' },
                { name: 'GPT-4o', role: 'Creative Expansion', color: 'border-green-400/50 bg-green-400/5' },
                { name: 'Gemini', role: 'Market Data', color: 'border-blue-400/50 bg-blue-400/5' },
              ].map((model) => (
                <div
                  key={model.name}
                  className={`text-center p-3 rounded-xl border ${model.color}`}
                >
                  <div className="text-sm font-bold">{model.name}</div>
                  <div className="text-xs text-slate-400">{model.role}</div>
                </div>
              ))}
            </div>

            {/* Connection line */}
            <div className="flex justify-center mb-4">
              <div className="w-px h-8 bg-gradient-to-b from-primary/20 to-primary/60" />
            </div>

            {/* Orchestrator */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border-2 border-primary bg-primary/10 text-sm font-bold shadow-[0_0_20px_rgba(59,130,246,0.15)]">
                <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                AI Orchestrator
              </div>
            </div>

            {/* Connection line */}
            <div className="flex justify-center mb-4">
              <div className="w-px h-8 bg-gradient-to-b from-primary/60 to-emerald-500/60" />
            </div>

            {/* Result */}
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-emerald-500/50 bg-emerald-500/10 text-sm font-medium text-emerald-400">
                Optimized Results
              </div>
            </div>
          </div>
        </div>

        {/* New feature cards (NEW) */}
        <div
          className={`grid sm:grid-cols-2 gap-4 max-w-2xl mx-auto mb-12 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
          style={{ transitionDelay: isVisible ? '350ms' : '0ms' }}
        >
          {[
            { emoji: '🤖', title: t('feature1Title'), desc: t('feature1Desc') },
            { emoji: '📊', title: t('feature2Title'), desc: t('feature2Desc') },
          ].map((card, i) => (
            <div
              key={i}
              className="rounded-xl border border-slate-700 bg-slate-800/60 p-5 text-left"
            >
              <div className="text-2xl mb-2">{card.emoji}</div>
              <h4 className="text-sm font-bold text-white mb-1">{card.title}</h4>
              <p className="text-xs text-slate-400 leading-relaxed">{card.desc}</p>
            </div>
          ))}
        </div>

        {/* Comparison table */}
        <div className="grid md:grid-cols-3 gap-4 md:gap-6">
          {columns.map((col, ci) => (
            <div
              key={col.title}
              className={`rounded-xl p-6 transition-all duration-700 ${
                col.highlighted
                  ? 'border-2 border-primary bg-slate-800 ring-1 ring-primary/20'
                  : 'border border-slate-700 bg-slate-800/50 opacity-80'
              } ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
              style={{
                transitionDelay: isVisible ? `${400 + ci * 150}ms` : '0ms',
                opacity: isVisible ? (col.highlighted ? 1 : 0.8) : 0,
              }}
            >
              <h3
                className={`text-lg font-bold mb-4 ${
                  col.highlighted ? 'text-primary' : 'text-slate-300'
                }`}
              >
                {col.highlighted && '* '}{col.title}
              </h3>
              <ul className="space-y-3">
                {col.items.map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm">
                    {col.highlighted ? (
                      <Check className="h-4 w-4 text-green-400 shrink-0" />
                    ) : (
                      <X className="h-4 w-4 text-slate-500 shrink-0" />
                    )}
                    <span className={col.highlighted ? 'text-white' : 'text-slate-400'}>
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
