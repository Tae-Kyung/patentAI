import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { handleApiError, paginatedResponse } from '@/lib/utils/api-response'
import { parsePagination } from '@/lib/security/pagination'

// GET: 내 알림 목록
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()

    const { searchParams } = new URL(request.url)
    const { page, limit } = parsePagination(searchParams)
    const offset = (page - 1) * limit

    const supabase = await createClient()

    const { count } = await supabase
      .from('bi_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    const { data, error } = await supabase
      .from('bi_notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Notifications query error:', error.message)
    }

    return paginatedResponse(data || [], count || 0, page, limit)
  } catch (error) {
    return handleApiError(error)
  }
}
