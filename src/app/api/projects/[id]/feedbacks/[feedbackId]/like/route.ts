import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/guards'
import { createServiceClient } from '@/lib/supabase/service'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'

interface RouteContext {
  params: Promise<{ id: string; feedbackId: string }>
}

// bi_feedback_likes is not in generated types yet
const LIKES_TABLE = 'bi_feedback_likes' as unknown as 'bi_feedbacks'

// POST: 좋아요 토글 (추가/제거)
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const user = await requireAuth()
    const { id: projectId, feedbackId } = await context.params

    const supabase = createServiceClient()

    // 피드백이 해당 프로젝트에 속하는지 확인
    const { data: feedback, error: feedbackError } = await supabase
      .from('bi_feedbacks')
      .select('id, project_id')
      .eq('id', feedbackId)
      .eq('project_id', projectId)
      .single()

    if (feedbackError || !feedback) {
      return errorResponse('피드백을 찾을 수 없습니다.', 404)
    }

    // 기존 좋아요 확인
    const { data: existing } = await supabase
      .from(LIKES_TABLE)
      .select('id')
      .eq('feedback_id' as never, feedbackId)
      .eq('user_id', user.id)
      .maybeSingle()

    const row = existing as { id: string } | null

    if (row) {
      // 이미 좋아요 → 제거
      await supabase
        .from(LIKES_TABLE)
        .delete()
        .eq('id', row.id)

      return successResponse({ liked: false })
    } else {
      // 좋아요 추가
      const { error: insertError } = await supabase
        .from(LIKES_TABLE)
        .insert({ feedback_id: feedbackId, user_id: user.id } as never)

      if (insertError) {
        console.error('Feedback like insert error:', insertError.message)
        return errorResponse('좋아요 처리에 실패했습니다.', 500)
      }

      return successResponse({ liked: true })
    }
  } catch (error) {
    return handleApiError(error)
  }
}
