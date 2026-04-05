import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/guards'
import { createServiceClient } from '@/lib/supabase/service'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'

interface RouteContext {
  params: Promise<{ sessionId: string }>
}

// POST: 멘토링 세션 제출 (draft -> submitted)
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { sessionId } = await context.params
    const user = await requireAuth()

    const supabase = createServiceClient()

    // 세션 조회
    const { data: session, error: sessionError } = await supabase
      .from('bi_mentoring_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return errorResponse('멘토링 세션을 찾을 수 없습니다.', 404)
    }

    // 해당 세션의 매칭이 현재 사용자(멘토)의 것인지 확인
    const { data: match, error: matchError } = await supabase
      .from('bi_mentor_matches')
      .select('id')
      .eq('id', session.match_id)
      .eq('mentor_id', user.id)
      .single()

    if (matchError || !match) {
      return errorResponse('해당 세션에 대한 제출 권한이 없습니다.', 403)
    }

    // draft 상태에서만 제출 가능
    if (session.status !== 'draft') {
      return errorResponse('이미 제출된 세션입니다.', 400)
    }

    // 상태를 submitted로 변경
    const { data: updated, error: updateError } = await supabase
      .from('bi_mentoring_sessions')
      .update({
        status: 'submitted',
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
      .select()
      .single()

    if (updateError) throw updateError

    return successResponse(updated)
  } catch (error) {
    return handleApiError(error)
  }
}
