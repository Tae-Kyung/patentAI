'use client'

import { Link } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'

export function LandingFooter() {
  const t = useTranslations('landing.footer')

  return (
    <footer className="bg-slate-900 dark:bg-slate-950 text-slate-300 py-12 md:py-16">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-3 gap-8 md:gap-12 mb-8">
          {/* Brand */}
          <div className="space-y-3">
            <div className="text-xl font-bold text-white">{t('brand')}</div>
            <p className="text-sm text-slate-400">{t('brandDesc')}</p>
            <p className="text-sm text-slate-400 italic">{t('brandMotto')}</p>
          </div>

          {/* Quick links */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">{t('linksTitle')}</h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/signup"
                  className="text-sm text-slate-400 hover:text-white transition-colors"
                >
                  {t('linkStart')}
                </Link>
              </li>
              <li>
                <Link
                  href="/login"
                  className="text-sm text-slate-400 hover:text-white transition-colors"
                >
                  {t('linkLogin')}
                </Link>
              </li>
              <li>
                <a
                  href="#stakeholders"
                  className="text-sm text-slate-400 hover:text-white transition-colors"
                >
                  {t('linkInstitution')}
                </a>
              </li>
              <li>
                <a
                  href="#stakeholders"
                  className="text-sm text-slate-400 hover:text-white transition-colors"
                >
                  {t('linkMentor')}
                </a>
              </li>
              <li>
                <a
                  href="#faq"
                  className="text-sm text-slate-400 hover:text-white transition-colors"
                >
                  {t('linkFaq')}
                </a>
              </li>
            </ul>
          </div>

          {/* Tech & Support */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">{t('supportTitle')}</h3>
            <ul className="space-y-2">
              <li className="text-sm text-slate-400">{t('terms')}</li>
              <li className="text-sm text-slate-400">{t('privacy')}</li>
              <li className="text-sm text-slate-400">{t('contact')}</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-8">
          <p className="text-xs text-slate-500 text-center">{t('copyright')}</p>
          <p className="text-xs text-slate-500 text-center mt-1">{t('poweredBy')}</p>
        </div>
      </div>
    </footer>
  )
}
