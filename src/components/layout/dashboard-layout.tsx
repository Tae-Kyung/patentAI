'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  LayoutDashboard,
  Settings,
  LogOut,
  Menu,
  Shield,
  MessageSquare,
  Coins,
  FileText,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/common/theme-toggle'
import { LocaleSelector } from '@/components/common/locale-selector'
import { MobileDrawer } from '@/components/common/mobile-drawer'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
  exactMatch?: boolean
}

interface DashboardLayoutProps {
  children: React.ReactNode
  userEmail?: string | null
  isAdmin?: boolean
}

const USER_NAV: NavItem[] = [
  { href: '/dashboard', label: '특허 프로젝트', icon: <LayoutDashboard className="h-5 w-5" />, exactMatch: true },
  { href: '/credits', label: '크레딧', icon: <Coins className="h-5 w-5" /> },
  { href: '/settings', label: '설정', icon: <Settings className="h-5 w-5" /> },
]

const ADMIN_NAV: NavItem[] = [
  { href: '/admin', label: '관리자 대시보드', icon: <Shield className="h-5 w-5" />, exactMatch: true },
  { href: '/admin/prompts', label: '프롬프트 관리', icon: <MessageSquare className="h-5 w-5" /> },
  { href: '/admin/credits', label: '크레딧 관리', icon: <Coins className="h-5 w-5" /> },
  { href: '/dashboard', label: '특허 프로젝트', icon: <FileText className="h-5 w-5" />, exactMatch: true },
  { href: '/credits', label: '내 크레딧', icon: <Coins className="h-5 w-5" /> },
  { href: '/settings', label: '설정', icon: <Settings className="h-5 w-5" /> },
]

export function DashboardLayout({ children, userEmail, isAdmin = false }: DashboardLayoutProps) {
  const tAuth = useTranslations('auth')
  const pathname = usePathname()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navItems = isAdmin ? ADMIN_NAV : USER_NAV

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    toast.success(tAuth('logoutSuccess'))
    router.push('/login')
  }

  const isActive = (href: string, exactMatch?: boolean) => {
    const pathWithoutLocale = pathname.replace(/^\/[a-z]{2}/, '')
    if (exactMatch) return pathWithoutLocale === href
    return pathWithoutLocale === href || pathWithoutLocale.startsWith(`${href}/`)
  }

  const navContent = (
    <nav className="flex flex-col gap-1">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          onClick={() => setMobileMenuOpen(false)}
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            isActive(item.href, item.exactMatch)
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
          )}
        >
          {item.icon}
          {item.label}
        </Link>
      ))}
    </nav>
  )

  return (
    <div className="flex min-h-screen">
      {/* Desktop Sidebar */}
      <aside className="hidden w-60 flex-col border-r bg-card p-4 md:flex">
        <div className="mb-8">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="text-xl font-bold text-primary">PatentAI</span>
            {isAdmin && (
              <Badge variant="secondary" className="text-xs">Admin</Badge>
            )}
          </Link>
          {userEmail && (
            <p className="mt-1 truncate text-xs text-muted-foreground">{userEmail}</p>
          )}
        </div>

        <div className="flex-1">{navContent}</div>

        <div className="mt-auto space-y-3">
          <div className="flex items-center justify-center gap-2">
            <ThemeToggle />
            <LocaleSelector />
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground"
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5" />
            {tAuth('logout')}
          </Button>
        </div>
      </aside>

      {/* Mobile Drawer */}
      <MobileDrawer
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        title="PatentAI"
      >
        <div className="flex h-full flex-col">
          <div className="flex-1">{navContent}</div>
          <div className="mt-auto space-y-3">
            <div className="flex items-center justify-center gap-2">
              <ThemeToggle />
              <LocaleSelector />
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-muted-foreground"
              onClick={handleLogout}
            >
              <LogOut className="h-5 w-5" />
              {tAuth('logout')}
            </Button>
          </div>
        </div>
      </MobileDrawer>

      {/* Main Content */}
      <div className="flex flex-1 flex-col">
        {/* Mobile Header */}
        <header className="flex items-center justify-between border-b p-4 md:hidden">
          <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <Link href="/dashboard" className="text-lg font-bold text-primary">
            PatentAI
          </Link>
          <div className="w-10" />
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">{children}</main>
      </div>
    </div>
  )
}
