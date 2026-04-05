'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import {
  LayoutDashboard,
  FolderKanban,
  Plus,
  Settings,
  LogOut,
  Menu,
  Shield,
  MessageSquare,
  CheckCircle,
  Users,
  Award,
  Coins,
  Building2,
  Link2,
  FileText,
  DollarSign,
  Mail,
  Bell,
  BookOpen,
  BarChart3,
  AlertTriangle,
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
  badge?: number
  exactMatch?: boolean
  warning?: boolean
}

interface NavSection {
  label?: string
  items: NavItem[]
  separator?: boolean
}

interface DashboardLayoutProps {
  children: React.ReactNode
  userRole?: 'user' | 'mentor' | 'institution' | 'admin'
  userName?: string | null
  userEmail?: string | null
  institutionName?: string
}

function getSectionsForRole(
  userRole: 'user' | 'mentor' | 'institution' | 'admin',
  t: ReturnType<typeof useTranslations>,
  pendingCount: number,
  unreadMessages: number,
  unreadNotifications: number,
  mentorDocsIncomplete: boolean
): NavSection[] {
  if (userRole === 'admin') {
    return [
      {
        label: t('nav.adminOverview'),
        items: [
          { href: '/admin', label: t('nav.admin'), icon: <Shield className="h-5 w-5" />, exactMatch: true },
          { href: '/admin/overview', label: t('nav.overview'), icon: <BarChart3 className="h-5 w-5" /> },
        ],
      },
      {
        label: t('nav.management'),
        items: [
          { href: '/admin/approvals', label: t('nav.approvals'), icon: <CheckCircle className="h-5 w-5" />, badge: pendingCount > 0 ? pendingCount : undefined },
          { href: '/admin/users', label: t('nav.users'), icon: <Users className="h-5 w-5" /> },
          { href: '/admin/institutions', label: t('nav.institutions'), icon: <Building2 className="h-5 w-5" /> },
          { href: '/admin/programs', label: t('nav.programs'), icon: <BookOpen className="h-5 w-5" /> },
          { href: '/admin/mentors', label: t('nav.mentors'), icon: <Users className="h-5 w-5" /> },
          { href: '/admin/mappings', label: t('nav.mappings'), icon: <Link2 className="h-5 w-5" /> },
          { href: '/admin/credits', label: t('nav.credits'), icon: <Coins className="h-5 w-5" /> },
          { href: '/admin/prompts', label: t('nav.prompts'), icon: <MessageSquare className="h-5 w-5" /> },
        ],
      },
      {
        separator: true,
        label: t('nav.userView'),
        items: [
          { href: '/dashboard', label: t('nav.dashboard'), icon: <LayoutDashboard className="h-5 w-5" />, exactMatch: true },
          { href: '/projects', label: t('nav.projects'), icon: <FolderKanban className="h-5 w-5" /> },
          { href: '/settings', label: t('nav.settings'), icon: <Settings className="h-5 w-5" /> },
        ],
      },
    ]
  }

  if (userRole === 'institution') {
    return [
      {
        label: t('nav.institutionManagement'),
        items: [
          { href: '/institution/dashboard', label: t('nav.dashboard'), icon: <LayoutDashboard className="h-5 w-5" />, exactMatch: true },
          { href: '/institution/projects', label: t('nav.projects'), icon: <FolderKanban className="h-5 w-5" /> },
          { href: '/institution/mentors', label: t('nav.mentors'), icon: <Users className="h-5 w-5" /> },
          { href: '/institution/matches', label: t('nav.matches'), icon: <Link2 className="h-5 w-5" /> },
          { href: '/institution/reports', label: t('nav.reports'), icon: <FileText className="h-5 w-5" /> },
          { href: '/institution/payouts', label: t('nav.payouts'), icon: <DollarSign className="h-5 w-5" /> },
          { href: '/institution/messages', label: t('nav.messages'), icon: <Mail className="h-5 w-5" />, badge: unreadMessages > 0 ? unreadMessages : undefined },
        ],
      },
      {
        separator: true,
        items: [
          { href: '/notifications', label: t('nav.notifications'), icon: <Bell className="h-5 w-5" />, badge: unreadNotifications > 0 ? unreadNotifications : undefined },
          { href: '/settings', label: t('nav.settings'), icon: <Settings className="h-5 w-5" /> },
        ],
      },
    ]
  }

  if (userRole === 'mentor') {
    return [
      {
        items: [
          { href: '/dashboard', label: t('nav.dashboard'), icon: <LayoutDashboard className="h-5 w-5" />, exactMatch: true },
          { href: '/mentoring/projects', label: t('nav.mentoringProjects'), icon: <Users className="h-5 w-5" /> },
          { href: '/mentoring/payouts', label: t('nav.payouts'), icon: <DollarSign className="h-5 w-5" /> },
        ],
      },
      {
        separator: true,
        label: t('nav.personal'),
        items: [
          { href: '/projects', label: t('nav.projects'), icon: <FolderKanban className="h-5 w-5" /> },
          { href: '/projects/new', label: t('nav.newProject'), icon: <Plus className="h-5 w-5" /> },
        ],
      },
      {
        items: [
          { href: '/messages', label: t('nav.messages'), icon: <Mail className="h-5 w-5" />, badge: unreadMessages > 0 ? unreadMessages : undefined },
          { href: '/notifications', label: t('nav.notifications'), icon: <Bell className="h-5 w-5" />, badge: unreadNotifications > 0 ? unreadNotifications : undefined },
          { href: '/showcase', label: t('nav.showcase'), icon: <Award className="h-5 w-5" /> },
          { href: '/settings', label: t('nav.settings'), icon: <Settings className="h-5 w-5" />, warning: mentorDocsIncomplete },
        ],
      },
    ]
  }

  // user
  return [
    {
      items: [
        { href: '/dashboard', label: t('nav.dashboard'), icon: <LayoutDashboard className="h-5 w-5" />, exactMatch: true },
        { href: '/projects', label: t('nav.projects'), icon: <FolderKanban className="h-5 w-5" /> },
        { href: '/projects/new', label: t('nav.newProject'), icon: <Plus className="h-5 w-5" /> },
        { href: '/showcase', label: t('nav.showcase'), icon: <Award className="h-5 w-5" /> },
      ],
    },
    {
      items: [
        { href: '/messages', label: t('nav.messages'), icon: <Mail className="h-5 w-5" />, badge: unreadMessages > 0 ? unreadMessages : undefined },
        { href: '/notifications', label: t('nav.notifications'), icon: <Bell className="h-5 w-5" />, badge: unreadNotifications > 0 ? unreadNotifications : undefined },
        { href: '/settings', label: t('nav.settings'), icon: <Settings className="h-5 w-5" /> },
      ],
    },
  ]
}

export function DashboardLayout({ children, userRole = 'user', userName, userEmail, institutionName }: DashboardLayoutProps) {
  const t = useTranslations()
  const tAuth = useTranslations('auth')
  const tCredits = useTranslations('credits')
  const pathname = usePathname()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [credits, setCredits] = useState<number | null>(null)
  const [pendingCount, setPendingCount] = useState(0)
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const [mentorDocsIncomplete, setMentorDocsIncomplete] = useState(false)

  useEffect(() => {
    fetch('/api/credits')
      .then(res => res.json())
      .then(result => {
        if (result.success) {
          setCredits(result.data.credits)
        }
      })
      .catch(() => {})
  }, [pathname])

  // 읽지 않은 메시지 수 조회
  useEffect(() => {
    fetch('/api/messages/unread-count')
      .then(res => res.json())
      .then(result => {
        if (result.success) {
          setUnreadMessages(result.data.count || 0)
        }
      })
      .catch(() => {})
  }, [pathname])

  // 읽지 않은 알림 수 조회
  useEffect(() => {
    fetch('/api/notifications/unread-count')
      .then(res => res.json())
      .then(result => {
        if (result.success) {
          setUnreadNotifications(result.data.count || 0)
        }
      })
      .catch(() => {})
  }, [pathname])

  // 멘토 서류 미비 확인
  useEffect(() => {
    if (userRole === 'mentor') {
      fetch('/api/mentor/documents')
        .then(res => res.json())
        .then(result => {
          if (result.success) {
            const d = result.data
            setMentorDocsIncomplete(!d.resume || !d.bank_account || !d.privacy_consent || !d.id_card)
          }
        })
        .catch(() => {})
    }
  }, [userRole])

  // 승인 대기 건수 조회 (admin/mentor)
  useEffect(() => {
    if (userRole === 'admin' || userRole === 'mentor') {
      fetch('/api/admin/dashboard')
        .then(res => res.json())
        .then(result => {
          if (result.success) {
            setPendingCount(result.data.pendingApprovals || 0)
          }
        })
        .catch(() => {})
    }
  }, [userRole])

  const sections = getSectionsForRole(userRole, t, pendingCount, unreadMessages, unreadNotifications, mentorDocsIncomplete)

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    toast.success(tAuth('logoutSuccess'))
    router.push('/login')
  }

  const isActive = (href: string, exactMatch?: boolean) => {
    const pathWithoutLocale = pathname.replace(/^\/[a-z]{2}/, '')
    if (exactMatch) {
      return pathWithoutLocale === href
    }
    // /mentoring/projects에서 /projects/:id로 이동한 경우
    // 개인 /projects 메뉴가 활성화되지 않도록 처리
    if (href === '/projects' && userRole === 'mentor') {
      // /projects 정확 매칭 또는 /projects/new만 활성화
      return pathWithoutLocale === '/projects' || pathWithoutLocale === '/projects/new'
    }
    // /mentoring/projects는 /projects/:id 하위경로도 활성화
    if (href === '/mentoring/projects') {
      return pathWithoutLocale === href ||
        pathWithoutLocale.startsWith(`${href}/`) ||
        (pathWithoutLocale.startsWith('/projects/') && pathWithoutLocale !== '/projects/new')
    }
    return pathWithoutLocale === href || pathWithoutLocale.startsWith(`${href}/`)
  }

  const logoHref = userRole === 'admin' ? '/admin' : userRole === 'institution' ? '/institution/dashboard' : '/dashboard'

  const navContent = (
    <nav className="flex flex-col gap-1">
      {sections.map((section, sIdx) => (
        <div key={sIdx}>
          {section.separator && sIdx > 0 && (
            <div className="my-3 border-t border-border" />
          )}
          {section.label && (
            <div className="mb-1 mt-3 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {section.label}
            </div>
          )}
          {section.items.map((item) => (
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
              {item.badge !== undefined && item.badge > 0 && (
                <Badge variant="destructive" className="ml-auto h-5 min-w-[20px] px-1.5 text-xs">
                  {item.badge}
                </Badge>
              )}
              {item.warning && (
                <AlertTriangle className="ml-auto h-4 w-4 text-yellow-500" />
              )}
            </Link>
          ))}
        </div>
      ))}
    </nav>
  )

  return (
    <div className="flex min-h-screen">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 flex-col border-r bg-card p-4 md:flex">
        <div className="mb-8">
          <Link href={logoHref} className="flex items-center gap-2">
            <span className="text-xl font-bold">CASA</span>
            {userRole === 'admin' && (
              <Badge variant="secondary" className="text-xs">
                Admin
              </Badge>
            )}
          </Link>
          {userRole === 'institution' && institutionName && (
            <div className="mt-2 flex items-center gap-2 rounded-lg bg-muted px-3 py-2">
              <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{institutionName}</p>
                {userName && (
                  <p className="text-xs text-muted-foreground truncate">{userName}</p>
                )}
              </div>
            </div>
          )}
          {userRole === 'mentor' && (
            <div className="mt-2 flex items-center gap-2 rounded-lg bg-muted px-3 py-2">
              <Users className="h-4 w-4 text-blue-500 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{userName || t('nav.mentor')}</p>
                <p className="text-xs text-muted-foreground truncate">{t('nav.mentor')}</p>
              </div>
            </div>
          )}
          {userRole === 'user' && (userName || userEmail) && (
            <div className="mt-2 flex items-center gap-2 rounded-lg bg-muted px-3 py-2">
              <Users className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{userName || userEmail}</p>
                {userName && userEmail && (
                  <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex-1">
          {navContent}
        </div>

        <div className="mt-auto space-y-4">
          {credits !== null && (
            <Link
              href="/credits"
              className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 hover:bg-muted/80 transition-colors cursor-pointer"
            >
              <Coins className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-medium">{tCredits('remaining')}</span>
              <span className={`ml-auto text-sm font-bold ${credits <= 0 ? 'text-red-500' : credits <= 5 ? 'text-amber-500' : ''}`}>
                {credits}
              </span>
            </Link>
          )}
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
        title={userRole === 'admin' ? 'CASA Admin' : userRole === 'institution' && institutionName ? `CASA · ${institutionName}` : 'CASA'}
      >
        <div className="flex h-full flex-col">
          <div className="flex-1">
            {navContent}
          </div>
          <div className="mt-auto space-y-4">
            {credits !== null && (
              <Link
                href="/credits"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 hover:bg-muted/80 transition-colors cursor-pointer"
              >
                <Coins className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-medium">{tCredits('remaining')}</span>
                <span className={`ml-auto text-sm font-bold ${credits <= 0 ? 'text-red-500' : credits <= 5 ? 'text-amber-500' : ''}`}>
                  {credits}
                </span>
              </Link>
            )}
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
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <Link href={logoHref} className="flex items-center gap-2 text-lg font-bold">
            CASA
            {userRole === 'admin' && (
              <Badge variant="secondary" className="text-xs">
                Admin
              </Badge>
            )}
          </Link>
          <div className="w-10" /> {/* Spacer for centering */}
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">{children}</main>
      </div>
    </div>
  )
}
