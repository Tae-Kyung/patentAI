'use client'

import { Link } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import { ArrowRight, Quote, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useScrollAnimation } from '../hooks/useScrollAnimation'

export function TestimonialSection() {
  const t = useTranslations('landing.testimonial')
  const { ref, isVisible } = useScrollAnimation()

  const testimonials = [
    {
      quote: t('t1Quote'),
      name: t('t1Name'),
      role: t('t1Role'),
      initial: t('t1Name').charAt(0),
      accentBg: 'bg-primary/10',
      accentText: 'text-primary',
    },
    {
      quote: t('t2Quote'),
      name: t('t2Name'),
      role: t('t2Role'),
      initial: t('t2Name').charAt(0),
      accentBg: 'bg-violet-500/10',
      accentText: 'text-violet-600',
    },
    {
      quote: t('t3Quote'),
      name: t('t3Name'),
      role: t('t3Role'),
      initial: t('t3Name').charAt(0),
      accentBg: 'bg-emerald-500/10',
      accentText: 'text-emerald-600',
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

        <div className="grid md:grid-cols-3 gap-6 md:gap-8 max-w-5xl mx-auto">
          {testimonials.map((item, i) => (
            <div
              key={i}
              className={`rounded-2xl border bg-card p-6 md:p-8 flex flex-col transition-all duration-700 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
              style={{ transitionDelay: isVisible ? `${i * 150}ms` : '0ms' }}
            >
              <Quote className={`h-7 w-7 ${item.accentText} opacity-30 mb-4`} />
              <div className="flex gap-0.5 mb-4">
                {[...Array(5)].map((_, si) => (
                  <Star key={si} className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <blockquote className="text-sm leading-relaxed mb-6 flex-1 text-muted-foreground">
                &ldquo;{item.quote}&rdquo;
              </blockquote>
              <div className="flex items-center gap-3">
                <div
                  className={`h-10 w-10 rounded-full ${item.accentBg} flex items-center justify-center text-sm font-bold ${item.accentText}`}
                >
                  {item.initial}
                </div>
                <div>
                  <div className="font-semibold text-sm">{item.name}</div>
                  <div className="text-xs text-muted-foreground">{item.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div
          className={`text-center mt-10 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
          style={{ transitionDelay: isVisible ? '450ms' : '0ms' }}
        >
          <Button size="lg" asChild>
            <Link href="/signup">
              {t('cta')}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
