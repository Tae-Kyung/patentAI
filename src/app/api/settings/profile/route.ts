import { z } from 'zod'
import { requireAuth } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'

const updateProfileSchema = z.object({
  name: z.string().min(1).max(100),
})

// GET: 현재 사용자 프로필 조회
export async function GET() {
  try {
    const user = await requireAuth()
    const supabase = await createClient()

    const { data: { user: authUser } } = await supabase.auth.getUser()

    return successResponse({
      id: user.id,
      name: user.name,
      email: authUser?.email || user.email,
      role: user.role,
    })
  } catch (error) {
    return handleApiError(error)
  }
}

// PATCH: 이름 변경
export async function PATCH(request: Request) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const parsed = updateProfileSchema.safeParse(body)

    if (!parsed.success) {
      return errorResponse('입력값이 올바르지 않습니다.', 400)
    }

    const supabase = await createClient()
    const { error } = await supabase
      .from('bi_users')
      .update({ name: parsed.data.name, updated_at: new Date().toISOString() })
      .eq('id', user.id)

    if (error) {
      return errorResponse('프로필 업데이트에 실패했습니다.', 500)
    }

    return successResponse({ name: parsed.data.name })
  } catch (error) {
    return handleApiError(error)
  }
}
