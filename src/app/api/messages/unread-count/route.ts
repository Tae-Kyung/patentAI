import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/guards'
import { createServiceClient } from '@/lib/supabase/service'
import { successResponse, handleApiError } from '@/lib/utils/api-response'

// GET: 미읽은 메시지 수
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()

    const supabase = createServiceClient()

    const { count } = await supabase
      .from('bi_messages')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', user.id)
      .eq('is_read', false)
      .is('thread_id', null)

    return successResponse({ count: count || 0 })
  } catch (error) {
    return handleApiError(error)
  }
}
