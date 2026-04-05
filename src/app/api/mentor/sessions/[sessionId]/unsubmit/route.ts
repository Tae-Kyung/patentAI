import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/guards'
import { createServiceClient } from '@/lib/supabase/service'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'

interface RouteContext {
  params: Promise<{ sessionId: string }>
}

// POST: 멘토링 세션 제출 취소 (submitted -> draft)
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { sessionId } = await context.params
    const user = await requireAuth()

    const supabase = createServiceClient()

    const { data: session, error: sessionError } = await supabase
      .from('bi_mentoring_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (sessionError || !session) {
      return errorResponse('멘토링 세션을 찾을 수 없습니다.', 404)
    }

    const { data: match, error: matchError } = await supabase
      .from('bi_mentor_matches')
      .select('id')
      .eq('id', session.match_id)
      .eq('mentor_id', user.id)
      .single()

    if (matchError || !match) {
      return errorResponse('해당 세션에 대한 권한이 없습니다.', 403)
    }

    if (session.status !== 'submitted') {
      return errorResponse('제출된 세션만 취소할 수 있습니다.', 400)
    }

    const { data: updated, error: updateError } = await supabase
      .from('bi_mentoring_sessions')
      .update({
        status: 'draft',
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
