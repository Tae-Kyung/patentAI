import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/auth/guards'
import { createServiceClient } from '@/lib/supabase/service'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'

interface RouteContext {
  params: Promise<{ id: string }>
}

// GET: 멘토 상세 (프로필 + 사용자 정보)
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    await requireAdmin()
    const { id } = await context.params

    const supabase = createServiceClient()

    const { data: profile, error } = await supabase
      .from('bi_mentor_profiles')
      .select('*, user:user_id(id, email, name, role)')
      .eq('user_id', id)
      .single()

    if (error || !profile) {
      return errorResponse('멘토를 찾을 수 없습니다.', 404)
    }

    // 소속 기관 목록
    const { data: institutions } = await supabase
      .from('bi_mentor_institution_pool')
      .select('*, institution:institution_id(id, name, region)')
      .eq('mentor_id', id)

    // 매칭된 프로젝트 수
    const { count: matchCount } = await supabase
      .from('bi_mentor_matches')
      .select('*', { count: 'exact', head: true })
      .eq('mentor_id', id)

    return successResponse({
      ...profile,
      institutions: institutions || [],
      matchCount: matchCount || 0,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
