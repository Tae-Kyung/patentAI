import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'

// PATCH: 알림 읽음 처리
export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth()
    const { id } = await context.params

    const supabase = await createClient()

    const { error } = await supabase
      .from('bi_notifications')
      .update({ is_read: true })
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Notification read error:', error.message)
      return errorResponse('알림 읽음 처리에 실패했습니다.', 500)
    }

    return successResponse({ message: '읽음 처리되었습니다.' })
  } catch (error) {
    return handleApiError(error)
  }
}
