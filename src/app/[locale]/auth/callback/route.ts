import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      let redirectPath = next
      // 기본 리다이렉트(/dashboard)인 경우 역할에 따라 분기
      if (next === '/dashboard') {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: profile } = await supabase
            .from('bi_users')
            .select('role, is_approved')
            .eq('id', user.id)
            .single()

          // 미승인 사용자는 승인 대기 페이지로
          if (profile && !profile.is_approved) {
            redirectPath = '/pending-approval'
          } else if (profile?.role === 'admin') {
            redirectPath = '/admin'
          } else if (profile?.role === 'institution') {
            redirectPath = '/institution/dashboard'
          }
        }
      }
      return NextResponse.redirect(`${origin}${redirectPath}`)
    }
  }

  // 에러 발생 시 로그인 페이지로 리다이렉트
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
}
