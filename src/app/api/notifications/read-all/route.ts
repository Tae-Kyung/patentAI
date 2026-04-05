import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { successResponse, handleApiError } from '@/lib/utils/api-response'

// POST: 전체 읽음 처리
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()

    const supabase = await createClient()

    await supabase
      .from('bi_notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false)

    return successResponse({ message: '모든 알림이 읽음 처리되었습니다.' })
  } catch (error) {
    return handleApiError(error)
  }
}
