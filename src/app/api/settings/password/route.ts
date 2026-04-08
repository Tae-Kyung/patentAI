import { z } from 'zod'
import { requireAuth } from '@/lib/auth/guards'
import { createServiceClient } from '@/lib/supabase/service'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'

const changePasswordSchema = z.object({
  newPassword: z.string().min(8, '비밀번호는 8자 이상이어야 합니다.'),
})

// PATCH: 비밀번호 변경
export async function PATCH(request: Request) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const parsed = changePasswordSchema.safeParse(body)

    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0]?.message || '입력값이 올바르지 않습니다.', 400)
    }

    const supabaseAdmin = createServiceClient()
    const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      password: parsed.data.newPassword,
    })

    if (error) {
      return errorResponse('비밀번호 변경에 실패했습니다.', 500)
    }

    return successResponse({ message: 'ok' })
  } catch (error) {
    return handleApiError(error)
  }
}
