import { requireAuth } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { successResponse, handleApiError } from '@/lib/utils/api-response'

// GET: 현재 사용자 프로필 조회
export async function GET() {
  try {
    const user = await requireAuth()

    return successResponse({
      id: user.id,
      email: user.email,
      name: user.user_metadata?.full_name ?? user.email,
    })
  } catch (error) {
    return handleApiError(error)
  }
}

// PATCH: 표시 이름 변경 (user_metadata 업데이트)
export async function PATCH(request: Request) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const name = typeof body.name === 'string' ? body.name.trim() : null

    if (!name) return successResponse({ name: user.user_metadata?.full_name })

    const supabase = await createClient()
    const { error } = await supabase.auth.updateUser({ data: { full_name: name } })

    if (error) {
      return successResponse({ name: user.user_metadata?.full_name })
    }

    return successResponse({ name })
  } catch (error) {
    return handleApiError(error)
  }
}
