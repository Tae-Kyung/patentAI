import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth/guards'
import { createServiceClient } from '@/lib/supabase/service'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'
import type { FeedbackType } from '@/types/database'

interface RouteContext {
  params: Promise<{ feedbackId: string }>
}

const updateFeedbackSchema = z.object({
  comment: z.string().min(1).max(5000).optional(),
  feedback_type: z.enum(['comment', 'approval', 'rejection', 'revision_request']).optional(),
}).refine(data => data.comment || data.feedback_type, {
  message: '변경할 항목이 없습니다.',
})

// PATCH: 피드백 수정 (본인만)
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const user = await requireAuth()
    const { feedbackId } = await context.params

    const supabase = createServiceClient()

    // 피드백 소유권 확인
    const { data: feedback, error: fetchError } = await supabase
      .from('bi_feedbacks')
      .select('user_id')
      .eq('id', feedbackId)
      .single()

    if (fetchError || !feedback) {
      return errorResponse('피드백을 찾을 수 없습니다.', 404)
    }

    if (feedback.user_id !== user.id) {
      return errorResponse('본인의 피드백만 수정할 수 있습니다.', 403)
    }

    const body = await request.json()
    const validated = updateFeedbackSchema.parse(body)

    const updateData: Record<string, unknown> = {}
    if (validated.comment) updateData.comment = validated.comment
    if (validated.feedback_type) updateData.feedback_type = validated.feedback_type as FeedbackType

    const { data, error } = await supabase
      .from('bi_feedbacks')
      .update(updateData)
      .eq('id', feedbackId)
      .select()
      .single()

    if (error) {
      console.error('Feedback update error:', error.message)
      return errorResponse('피드백 수정에 실패했습니다.', 500)
    }

    return successResponse(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues[0].message, 400, 'VALIDATION_ERROR')
    }
    return handleApiError(error)
  }
}

// DELETE: 피드백 삭제 (본인만)
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const user = await requireAuth()
    const { feedbackId } = await context.params

    const supabase = createServiceClient()

    // 피드백 소유권 확인
    const { data: feedback, error: fetchError } = await supabase
      .from('bi_feedbacks')
      .select('user_id')
      .eq('id', feedbackId)
      .single()

    if (fetchError || !feedback) {
      return errorResponse('피드백을 찾을 수 없습니다.', 404)
    }

    if (feedback.user_id !== user.id) {
      return errorResponse('본인의 피드백만 삭제할 수 있습니다.', 403)
    }

    const { error } = await supabase
      .from('bi_feedbacks')
      .delete()
      .eq('id', feedbackId)

    if (error) {
      console.error('Feedback delete error:', error.message)
      return errorResponse('피드백 삭제에 실패했습니다.', 500)
    }

    return successResponse({ message: '피드백이 삭제되었습니다.' })
  } catch (error) {
    return handleApiError(error)
  }
}
