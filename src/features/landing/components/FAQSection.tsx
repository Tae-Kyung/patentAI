'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { useScrollAnimation } from '../hooks/useScrollAnimation'

type Category = 'all' | 'institution' | 'mentor' | 'entrepreneur'

export function FAQSection() {
  const t = useTranslations('landing.faq')
  const { ref, isVisible } = useScrollAnimation()
  const [activeCategory, setActiveCategory] = useState<Category>('all')

  const categories: { key: Category; label: string; color: string; activeClass: string }[] = [
    { key: 'all', label: t('catAll'), color: 'text-foreground', activeClass: 'bg-foreground/10 text-foreground border-foreground/30' },
    { key: 'institution', label: t('catInstitution'), color: 'text-primary', activeClass: 'bg-primary/10 text-primary border-primary/40' },
    { key: 'mentor', label: t('catMentor'), color: 'text-violet-600', activeClass: 'bg-violet-500/10 text-violet-600 border-violet-400/40' },
    { key: 'entrepreneur', label: t('catEntrepreneur'), color: 'text-emerald-600', activeClass: 'bg-emerald-500/10 text-emerald-600 border-emerald-400/40' },
  ]

  const allFaqs = Array.from({ length: 10 }, (_, i) => ({
    q: t(`q${i + 1}` as 'q1'),
    a: t(`a${i + 1}` as 'a1'),
    cat: t(`cat${i + 1}` as 'cat1') as Category,
  }))

  const filteredFaqs =
    activeCategory === 'all'
      ? allFaqs
      : allFaqs.filter((faq) => faq.cat === activeCategory || faq.cat === 'all')

  const half = Math.ceil(filteredFaqs.length / 2)
  const leftFaqs = filteredFaqs.slice(0, half)
  const rightFaqs = filteredFaqs.slice(half)

  return (
    <section id="faq" className="py-20 md:py-24">
      <div ref={ref} className="container mx-auto px-4">
        <h2
          className={`text-3xl md:text-4xl font-bold text-center mb-8 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          {t('title')}
        </h2>

        {/* Category tabs */}
        <div
          className={`flex flex-wrap justify-center gap-2 mb-10 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
          style={{ transitionDelay: isVisible ? '150ms' : '0ms' }}
        >
          {categories.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={`px-4 py-2 rounded-full border-2 text-sm font-semibold transition-all duration-200 ${
                activeCategory === cat.key
                  ? cat.activeClass
                  : 'border-border text-muted-foreground hover:border-muted-foreground/50'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div
          className={`max-w-5xl mx-auto grid md:grid-cols-2 gap-6 md:gap-8 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
          style={{ transitionDelay: isVisible ? '300ms' : '0ms' }}
        >
          <Accordion type="single" collapsible className="space-y-2">
            {leftFaqs.map((faq, i) => (
              <AccordionItem key={i} value={`left-${i}`} className="border rounded-lg px-4">
                <AccordionTrigger className="text-sm font-semibold text-left hover:no-underline">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          <Accordion type="single" collapsible className="space-y-2">
            {rightFaqs.map((faq, i) => (
              <AccordionItem key={i} value={`right-${i}`} className="border rounded-lg px-4">
                <AccordionTrigger className="text-sm font-semibold text-left hover:no-underline">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  )
}
