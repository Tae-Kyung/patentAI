import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/guards'
import { createServiceClient } from '@/lib/supabase/service'
import { successResponse, handleApiError } from '@/lib/utils/api-response'

// GET: 사용자 검색 (메시지 수신자 찾기용)
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 20)

    if (!query.trim() || query.trim().length < 2) {
      return successResponse([])
    }

    const supabase = createServiceClient()

    const { data: users, error } = await supabase
      .from('bi_users')
      .select('id, name, email, role')
      .or(`name.ilike.%${query.trim()}%,email.ilike.%${query.trim()}%`)
      .neq('id', user.id)
      .limit(limit)

    if (error) {
      console.error('User search error:', error.message)
    }

    const result = (users || []).map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
    }))

    return successResponse(result)
  } catch (error) {
    return handleApiError(error)
  }
}
