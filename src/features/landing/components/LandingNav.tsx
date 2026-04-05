'use client'

import { useState, useEffect, useRef } from 'react'
import { Link } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import { Menu, ChevronDown, Building2, GraduationCap, Rocket } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet'
import { ThemeToggle } from '@/components/common/theme-toggle'
import { LocaleSelector } from '@/components/common/locale-selector'

export function LandingNav() {
  const t = useTranslations('landing')
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const navLinks = [
    { href: '#stakeholders', label: t('nav.stakeholders') },
    { href: '#workflow', label: t('nav.workflow') },
    { href: '#faq', label: t('nav.faq') },
  ]

  const startItems = [
    { href: '/signup?role=institution', label: t('nav.startInstitution'), Icon: Building2, color: 'text-primary' },
    { href: '/signup?role=mentor', label: t('nav.startMentor'), Icon: GraduationCap, color: 'text-violet-600' },
    { href: '/signup', label: t('nav.startEntrepreneur'), Icon: Rocket, color: 'text-emerald-600' },
  ]

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 h-16 transition-all duration-300 ${
        scrolled
          ? 'bg-background/80 backdrop-blur-md border-b shadow-sm'
          : 'bg-transparent'
      }`}
    >
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="text-xl font-bold tracking-tight">
          <span className="bg-gradient-to-r from-primary to-emerald-500 bg-clip-text text-transparent">
            CASA
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-2">
          <ThemeToggle />
          <LocaleSelector />
          <Button variant="ghost" size="sm" asChild>
            <Link href="/login">{t('login')}</Link>
          </Button>

          {/* Start dropdown */}
          <div ref={dropdownRef} className="relative">
            <Button
              size="sm"
              className="rounded-full gap-1"
              onClick={() => setDropdownOpen((v) => !v)}
            >
              {t('nav.startDropdown')}
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform duration-200 ${
                  dropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </Button>

            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-52 rounded-xl border bg-card shadow-lg overflow-hidden z-50">
                {startItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-muted transition-colors"
                  >
                    <item.Icon className={`h-4 w-4 ${item.color}`} />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Mobile */}
        <div className="flex md:hidden items-center gap-1">
          <ThemeToggle />
          <LocaleSelector />
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px]">
              <SheetTitle className="text-lg font-bold">CASA</SheetTitle>
              <nav className="flex flex-col gap-4 mt-6">
                {navLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="text-base font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </a>
                ))}
                <hr className="my-2" />
                <Button variant="ghost" asChild className="justify-start">
                  <Link href="/login" onClick={() => setOpen(false)}>
                    {t('login')}
                  </Link>
                </Button>
                <div className="space-y-2">
                  {startItems.map((item) => (
                    <Button key={item.href} asChild className="w-full justify-start gap-2">
                      <Link href={item.href} onClick={() => setOpen(false)}>
                        <item.Icon className="h-4 w-4" />
                        {item.label}
                      </Link>
                    </Button>
                  ))}
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
