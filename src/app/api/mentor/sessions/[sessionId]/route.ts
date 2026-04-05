import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/guards'
import { createServiceClient } from '@/lib/supabase/service'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'
import { isValidUUID } from '@/lib/security/validation'
import { z } from 'zod'

interface RouteContext {
  params: Promise<{ sessionId: string }>
}

const updateSessionSchema = z.object({
  comments: z.union([z.string(), z.record(z.string(), z.unknown())]).optional(),
  revision_summary: z.string().max(5000).optional(),
  session_date: z.string().regex(/^\d{4}-\d{2}-\d{2}/, '날짜 형식이 올바르지 않습니다.').optional(),
  duration_minutes: z.number().int().positive().max(480).optional(),
})

// DELETE: 멘토링 세션 삭제 (draft 상태만)
export async function DELETE(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const { sessionId } = await context.params
    if (!isValidUUID(sessionId)) return errorResponse('잘못된 ID 형식입니다.', 400)
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
      return errorResponse('해당 세션에 대한 삭제 권한이 없습니다.', 403)
    }

    if (session.status !== 'draft') {
      return errorResponse('제출된 세션은 삭제할 수 없습니다.', 400)
    }

    const { error: deleteError } = await supabase
      .from('bi_mentoring_sessions')
      .delete()
      .eq('id', sessionId)

    if (deleteError) throw deleteError

    return successResponse({ id: sessionId })
  } catch (error) {
    return handleApiError(error)
  }
}

// PATCH: 멘토링 세션 수정
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { sessionId } = await context.params
    if (!isValidUUID(sessionId)) return errorResponse('잘못된 ID 형식입니다.', 400)
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
      return errorResponse('해당 세션에 대한 수정 권한이 없습니다.', 403)
    }

    // draft 상태에서만 수정 가능
    if (session.status !== 'draft') {
      return errorResponse('제출된 세션은 수정할 수 없습니다.', 400)
    }

    const body = await request.json()
    const { comments, ...restData } = updateSessionSchema.parse(body)

    const { data: updated, error: updateError } = await supabase
      .from('bi_mentoring_sessions')
      .update({
        ...restData,
        ...(comments !== undefined && { comments: comments as import('@/types/database').Json }),
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
      .select()
      .single()

    if (updateError) throw updateError

    return successResponse(updated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues[0]?.message || '유효성 검사 오류', 400)
    }
    return handleApiError(error)
  }
}
