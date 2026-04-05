import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'
import { z } from 'zod'

interface RouteContext {
  params: Promise<{ id: string; feedbackId: string }>
}

const updateSchema = z.object({
  comment: z.string().min(10, '피드백은 10자 이상이어야 합니다.').optional(),
  feedback_type: z.enum(['comment', 'approval', 'rejection', 'revision_request']).optional(),
})

// GET: 피드백 상세 조회
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { feedbackId } = await context.params
    await requireAuth()

    const supabase = await createClient()

    const { data: feedback, error } = await supabase
      .from('bi_feedbacks')
      .select(`
        *,
        author:bi_users!bi_feedbacks_user_id_fkey(id, name, email, role)
      `)
      .eq('id', feedbackId)
      .single()

    if (error || !feedback) {
      return errorResponse('피드백을 찾을 수 없습니다.', 404)
    }

    return successResponse(feedback)
  } catch (error) {
    return handleApiError(error)
  }
}

// PATCH: 피드백 수정 (작성자만)
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { feedbackId } = await context.params
    const user = await requireAuth()

    const supabase = await createClient()

    // 피드백 조회 및 작성자 확인
    const { data: feedback, error: fetchError } = await supabase
      .from('bi_feedbacks')
      .select('*')
      .eq('id', feedbackId)
      .single()

    if (fetchError || !feedback) {
      return errorResponse('피드백을 찾을 수 없습니다.', 404)
    }

    if (feedback.user_id !== user.id) {
      return errorResponse('피드백 작성자만 수정할 수 있습니다.', 403)
    }

    const body = await request.json()
    const validatedData = updateSchema.parse(body)

    const { data: updated, error: updateError } = await supabase
      .from('bi_feedbacks')
      .update({
        ...validatedData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', feedbackId)
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

// DELETE: 피드백 삭제 (작성자만)
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { feedbackId } = await context.params
    const user = await requireAuth()

    const supabase = await createClient()

    // 피드백 조회 및 작성자 확인
    const { data: feedback, error: fetchError } = await supabase
      .from('bi_feedbacks')
      .select('*')
      .eq('id', feedbackId)
      .single()

    if (fetchError || !feedback) {
      return errorResponse('피드백을 찾을 수 없습니다.', 404)
    }

    if (feedback.user_id !== user.id) {
      return errorResponse('피드백 작성자만 삭제할 수 있습니다.', 403)
    }

    const { error: deleteError } = await supabase
      .from('bi_feedbacks')
      .delete()
      .eq('id', feedbackId)

    if (deleteError) throw deleteError

    return successResponse({ message: '피드백이 삭제되었습니다.' })
  } catch (error) {
    return handleApiError(error)
  }
}
