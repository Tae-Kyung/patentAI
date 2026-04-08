import { NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'

// POST: 회원가입 후 초기 크레딧 설정
export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()

    if (!userId || typeof userId !== 'string') {
      return errorResponse('userId is required', 400)
    }

    const supabase = createServiceClient()

    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId)

    if (authError || !authUser?.user) {
      return errorResponse('User not found', 404)
    }

    // 기본 크레딧 지급 (트리거가 없는 경우 폴백)
    await supabase
      .from('patentai_user_credits')
      .upsert({ user_id: userId, credits: 30 }, { onConflict: 'user_id' })

    return successResponse({ initialized: true })
  } catch (error) {
    return handleApiError(error)
  }
}
