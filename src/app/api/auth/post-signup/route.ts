import { NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'

// POST: 회원가입 후 역할 설정 (트리거 대신 API로 처리)
export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()

    if (!userId || typeof userId !== 'string') {
      return errorResponse('userId is required', 400)
    }

    const supabase = createServiceClient()

    // 1. auth.users에서 메타데이터 읽기 (신뢰할 수 있는 소스)
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId)

    if (authError || !authUser?.user) {
      return errorResponse('User not found', 404)
    }

    const metadata = authUser.user.user_metadata
    const role = metadata?.role || 'user'

    // 유효한 역할인지 확인
    const validRoles = ['user', 'mentor', 'institution']
    if (!validRoles.includes(role)) {
      return successResponse({ role: 'user', updated: false })
    }

    // 이미 user 역할이면 추가 작업 불필요
    if (role === 'user') {
      return successResponse({ role: 'user', updated: false })
    }

    const isApproved = false // mentor, institution은 승인 대기

    // 2. bi_users 역할 업데이트
    const { error: updateError } = await supabase
      .from('bi_users')
      .update({
        role,
        is_approved: isApproved,
        approved_at: null,
      })
      .eq('id', userId)

    if (updateError) {
      console.error('Failed to update user role:', updateError)
      return errorResponse('Failed to update role', 500)
    }

    // 3. 멘토인 경우 프로필 생성
    if (role === 'mentor') {
      const specialty = metadata?.specialty
        ? metadata.specialty.split(',').map((s: string) => s.trim()).filter(Boolean)
        : []

      const { error: profileError } = await supabase
        .from('bi_mentor_profiles')
        .upsert({
          user_id: userId,
          specialty,
        }, { onConflict: 'user_id' })

      if (profileError) {
        console.error('Failed to create mentor profile:', profileError)
      }
    }

    // 4. 기관 담당자인 경우 기관 + 멤버십 생성
    if (role === 'institution') {
      const institutionName = metadata?.institution_name || metadata?.name || authUser.user.email?.split('@')[0] || 'My Institution'

      // 기관 생성
      const { data: institution, error: instError } = await supabase
        .from('bi_institutions')
        .insert({
          name: institutionName,
          region: metadata?.region || '미지정',
          type: 'center',
          contact_email: authUser.user.email,
          is_approved: true,
          approved_at: new Date().toISOString(),
        })
        .select('id')
        .single()

      if (instError) {
        console.error('Failed to create institution:', instError)
      } else if (institution) {
        // 멤버십 생성 (manager + approved)
        const { error: memberError } = await supabase
          .from('bi_institution_members')
          .insert({
            user_id: userId,
            institution_id: institution.id,
            role_in_institution: 'manager',
            is_approved: true,
            approved_at: new Date().toISOString(),
          })

        if (memberError) {
          console.error('Failed to create institution membership:', memberError)
        }
      }
    }

    return successResponse({ role, updated: true })
  } catch (error) {
    return handleApiError(error)
  }
}
