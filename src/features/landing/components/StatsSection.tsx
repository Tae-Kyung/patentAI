'use client'

import { useTranslations } from 'next-intl'
import { Check } from 'lucide-react'
import { useScrollAnimation } from '../hooks/useScrollAnimation'
import { useCountUp } from '../hooks/useCountUp'

function StatItem({
  value,
  suffix,
  label,
  sub,
  isStatic,
  isVisible,
  delay,
}: {
  value: string
  suffix: string
  label: string
  sub: string
  isStatic?: boolean
  isVisible: boolean
  delay: number
}) {
  const numericVal = parseInt(value, 10)
  const animated = useCountUp({
    end: isNaN(numericVal) ? 0 : numericVal,
    enabled: isVisible && !isStatic,
  })

  return (
    <div
      className={`text-center transition-all duration-700 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
      style={{ transitionDelay: isVisible ? `${delay}ms` : '0ms' }}
    >
      <div className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-primary mb-2">
        {isStatic ? value : animated}
        {suffix}
      </div>
      <div className="text-base md:text-lg font-medium mb-1">{label}</div>
      <div className="text-sm text-muted-foreground">{sub}</div>
    </div>
  )
}

export function StatsSection() {
  const t = useTranslations('landing.stats')
  const { ref, isVisible } = useScrollAnimation()

  const stats = [
    { value: t('stat1Value'), suffix: t('stat1Suffix'), label: t('stat1Label'), sub: t('stat1Sub') },
    { value: t('stat2Value'), suffix: t('stat2Suffix'), label: t('stat2Label'), sub: t('stat2Sub') },
    { value: t('stat3Value'), suffix: t('stat3Suffix'), label: t('stat3Label'), sub: t('stat3Sub'), isStatic: true },
    { value: t('stat4Value'), suffix: t('stat4Suffix'), label: t('stat4Label'), sub: t('stat4Sub'), isStatic: true },
    { value: t('stat5Value'), suffix: t('stat5Suffix'), label: t('stat5Label'), sub: t('stat5Sub'), isStatic: true },
  ]

  const bottomItems = [t('bottom1'), t('bottom2'), t('bottom3')]

  return (
    <section className="py-20 md:py-24 bg-primary/5">
      <div ref={ref} className="container mx-auto px-4">
        <h2
          className={`text-3xl md:text-4xl font-bold text-center mb-12 md:mb-16 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          {t('title')}
        </h2>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-8 md:gap-10 mb-12">
          {stats.map((s, i) => (
            <StatItem
              key={s.label}
              value={s.value}
              suffix={s.suffix}
              label={s.label}
              sub={s.sub}
              isStatic={s.isStatic}
              isVisible={isVisible}
              delay={i * 150}
            />
          ))}
        </div>

        <div
          className={`flex flex-wrap justify-center gap-x-6 gap-y-3 text-sm text-muted-foreground transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
          style={{ transitionDelay: isVisible ? '750ms' : '0ms' }}
        >
          {bottomItems.map((item) => (
            <span key={item} className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-primary" />
              {item}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
