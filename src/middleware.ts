import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

// 인증이 필요 없는 경로
const publicPaths = ['/login', '/signup', '/auth/callback', '/forgot-password', '/showcase', '/pending-approval']

// 관리자만 접근 가능한 경로
const adminPaths = ['/admin']

// 기관 담당자 경로
const institutionPaths = ['/institution']

// 승인 대기 페이지
const pendingApprovalPath = '/pending-approval'

// 리다이렉트 응답 생성 시 Supabase 세션 쿠키를 유지하기 위한 헬퍼
function createRedirect(url: URL, response: NextResponse): NextResponse {
  const redirect = NextResponse.redirect(url)
  // i18n 응답에 설정된 Supabase 세션 쿠키를 리다이렉트 응답에 복사 (원본 옵션 유지)
  response.headers.getSetCookie().forEach((cookie) => {
    redirect.headers.append('set-cookie', cookie)
  })
  return redirect
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 정적 파일 및 API 라우트 제외
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/share') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // next-intl 미들웨어 적용
  const handleI18nRouting = createMiddleware(routing)
  const response = handleI18nRouting(request)

  // next-intl이 locale prefix 리다이렉트를 반환하는 경우 (예: /credits → /ko/credits)
  // 인증 체크 없이 바로 리다이렉트 (리다이렉트 대상에서 다시 미들웨어 실행됨)
  if (response.headers.get('location')) {
    return response
  }

  // Supabase 세션 갱신 — 기존 i18n 응답에 쿠키만 추가
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 경로에서 로케일 제거
  const pathWithoutLocale = pathname.replace(/^\/(ko|en)/, '') || '/'

  // 공개 경로 체크
  const isPublicPath = publicPaths.some((p) => pathWithoutLocale.startsWith(p))

  // 인증되지 않은 사용자가 보호된 경로 접근 시
  if (!user && !isPublicPath && pathWithoutLocale !== '/') {
    const locale = pathname.split('/')[1] || 'ko'
    const url = request.nextUrl.clone()
    url.pathname = `/${locale}/login`
    return createRedirect(url, response)
  }

  // 인증된 사용자 정보 조회 (한 번만)
  let userData: { role: string; is_approved: boolean } | null = null
  if (user) {
    const { data } = await supabase
      .from('bi_users')
      .select('role, is_approved')
      .eq('id', user.id)
      .single()
    userData = data
  }

  // 인증된 사용자가 로그인/회원가입 페이지 접근 시 (showcase는 제외)
  const isAuthOnlyPath = ['/login', '/signup'].some((p) => pathWithoutLocale.startsWith(p))
  if (user && isAuthOnlyPath) {
    const locale = pathname.split('/')[1] || 'ko'
    const url = request.nextUrl.clone()

    // 미승인 사용자는 승인 대기 페이지로
    if (userData && !userData.is_approved) {
      url.pathname = `/${locale}${pendingApprovalPath}`
      return createRedirect(url, response)
    }

    // 역할별 리다이렉트
    if (userData?.role === 'admin') {
      url.pathname = `/${locale}/admin/overview`
    } else if (userData?.role === 'institution') {
      url.pathname = `/${locale}/institution/dashboard`
    } else {
      url.pathname = `/${locale}/dashboard`
    }
    return createRedirect(url, response)
  }

  // 미승인 사용자: 승인 대기 페이지 외 접근 차단
  if (user && userData && !userData.is_approved) {
    if (pathWithoutLocale !== pendingApprovalPath && !isPublicPath && pathWithoutLocale !== '/') {
      const locale = pathname.split('/')[1] || 'ko'
      const url = request.nextUrl.clone()
      url.pathname = `/${locale}${pendingApprovalPath}`
      return createRedirect(url, response)
    }
  }

  // 관리자 경로 체크
  if (user && adminPaths.some((p) => pathWithoutLocale.startsWith(p))) {
    if (!userData || (userData.role !== 'admin' && userData.role !== 'mentor')) {
      const locale = pathname.split('/')[1] || 'ko'
      const url = request.nextUrl.clone()
      url.pathname = `/${locale}/dashboard`
      return createRedirect(url, response)
    }
  }

  // 기관 담당자 경로 체크
  if (user && institutionPaths.some((p) => pathWithoutLocale.startsWith(p))) {
    if (!userData || (userData.role !== 'institution' && userData.role !== 'admin')) {
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
