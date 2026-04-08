import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

const publicPaths = ['/login', '/signup', '/auth/callback', '/forgot-password']
const adminPaths = ['/admin']

function createRedirect(url: URL, response: NextResponse): NextResponse {
  const redirect = NextResponse.redirect(url)
  response.headers.getSetCookie().forEach((cookie) => {
    redirect.headers.append('set-cookie', cookie)
  })
  return redirect
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/share') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  const handleI18nRouting = createMiddleware(routing)
  const response = handleI18nRouting(request)

  if (response.headers.get('location')) {
    return response
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const pathWithoutLocale = pathname.replace(/^\/(ko|en)/, '') || '/'
  const isPublicPath = publicPaths.some((p) => pathWithoutLocale.startsWith(p))

  // 미인증 → 로그인으로
  if (!user && !isPublicPath && pathWithoutLocale !== '/') {
    const locale = pathname.split('/')[1] || 'ko'
    const url = request.nextUrl.clone()
    url.pathname = `/${locale}/login`
    return createRedirect(url, response)
  }

  // 로그인한 사용자가 로그인/회원가입 페이지 접근 시
  if (user && ['/login', '/signup'].some((p) => pathWithoutLocale.startsWith(p))) {
    const locale = pathname.split('/')[1] || 'ko'
    const url = request.nextUrl.clone()
    url.pathname = `/${locale}/dashboard`
    return createRedirect(url, response)
  }

  // 관리자 경로: app_metadata.role === 'admin' 확인
  if (user && adminPaths.some((p) => pathWithoutLocale.startsWith(p))) {
    if (user.app_metadata?.role !== 'admin') {
      const locale = pathname.split('/')[1] || 'ko'
      const url = request.nextUrl.clone()
      url.pathname = `/${locale}/dashboard`
      return createRedirect(url, response)
    }
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api|share|.*\\..*).*)'],
}
