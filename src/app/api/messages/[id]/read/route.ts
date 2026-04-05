import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/guards'
import { createServiceClient } from '@/lib/supabase/service'
import { successResponse, handleApiError } from '@/lib/utils/api-response'

// PATCH: 메시지 읽음 처리
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await context.params

    const supabase = createServiceClient()

    await supabase
      .from('bi_messages')
      .update({ is_read: true })
      .eq('id', id)
      .eq('recipient_id', user.id)

    return successResponse({ message: '읽음 처리되었습니다.' })
  } catch (error) {
    return handleApiError(error)
  }
}
