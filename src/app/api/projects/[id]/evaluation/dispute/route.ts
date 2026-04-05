import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireProjectOwner } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'

interface RouteContext {
  params: Promise<{ id: string }>
}

const disputeSchema = z.object({
  comment: z.string().min(10, '이의 제기 내용은 최소 10자 이상이어야 합니다.').max(2000),
})

// POST: 이의 제기
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params
    await requireProjectOwner(id)

    const body = await request.json()
    const validationResult = disputeSchema.safeParse(body)

    if (!validationResult.success) {
      return errorResponse(validationResult.error.issues[0]?.message || '입력이 올바르지 않습니다.', 400)
    }

    const { comment } = validationResult.data

    const supabase = await createClient()

    // 기존 평가 조회
    const { data: evaluation, error: evalError } = await supabase
      .from('bi_evaluations')
      .select('*')
      .eq('project_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (evalError || !evaluation) {
      return errorResponse('평가 결과가 없습니다.', 404)
    }

    if (evaluation.is_confirmed) {
      return errorResponse('이미 확정된 평가에는 이의를 제기할 수 없습니다.', 400)
    }

    // 이의 제기 저장
    const { data: updated, error } = await supabase
      .from('bi_evaluations')
      .update({
        dispute_comment: comment,
      })
      .eq('id', evaluation.id)
      .select()
      .single()

    if (error) throw error

    return successResponse({
      message: '이의 제기가 접수되었습니다.',
      evaluation: updated,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
