import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { successResponse, handleApiError } from '@/lib/utils/api-response'

// GET: 미읽은 알림 수
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()

    const supabase = await createClient()

    const { count } = await supabase
      .from('bi_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false)

    return successResponse({ count: count || 0 })
  } catch (error) {
    return handleApiError(error)
  }
}
