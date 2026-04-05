import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/auth/guards'
import { createServiceClient } from '@/lib/supabase/service'
import { successResponse, errorResponse, handleApiError, paginatedResponse } from '@/lib/utils/api-response'
import { parsePagination } from '@/lib/security/pagination'

// GET: 멘토 목록
export async function GET(request: NextRequest) {
  try {
    await requireAdmin()

    const { searchParams } = new URL(request.url)
    const { page, limit } = parsePagination(searchParams)
    const approved = searchParams.get('approved')
    const offset = (page - 1) * limit

    const supabase = createServiceClient()

    let countQuery = supabase
      .from('bi_mentor_profiles')
      .select('*', { count: 'exact', head: true })

    if (approved === 'true') countQuery = countQuery.eq('is_approved', true)
    if (approved === 'false') countQuery = countQuery.eq('is_approved', false)

    const { count } = await countQuery

    let dataQuery = supabase
      .from('bi_mentor_profiles')
      .select('*, user:user_id(id, email, name, role)')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (approved === 'true') dataQuery = dataQuery.eq('is_approved', true)
    if (approved === 'false') dataQuery = dataQuery.eq('is_approved', false)

    const { data, error } = await dataQuery

    if (error) {
      console.error('Mentors query error:', error.message)
      return errorResponse('멘토 목록을 불러오는데 실패했습니다.', 500)
    }

    return paginatedResponse(data || [], count || 0, page, limit)
  } catch (error) {
    return handleApiError(error)
  }
}
