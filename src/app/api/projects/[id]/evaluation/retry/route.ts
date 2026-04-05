import { NextRequest } from 'next/server'
import { requireProjectOwner } from '@/lib/auth/guards'
import { deductCredit } from '@/lib/credits'
import { createClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'

interface RouteContext {
  params: Promise<{ id: string }>
}

// POST: 재평가 요청
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params
    const user = await requireProjectOwner(id)
    await deductCredit(user.id, 'ai_evaluation_retry', id)

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
      return errorResponse('이미 확정된 평가는 재평가할 수 없습니다.', 400)
    }

    // 재평가 횟수 증가 및 결과 초기화
    const { data: updated, error } = await supabase
      .from('bi_evaluations')
      .update({
        investor_score: null,
        investor_feedback: null,
        market_score: null,
        market_feedback: null,
        tech_score: null,
        tech_feedback: null,
        total_score: null,
        recommendations: null,
        reevaluation_count: (evaluation.reevaluation_count || 0) + 1,
      })
      .eq('id', evaluation.id)
      .select()
      .single()

    if (error) throw error

    return successResponse({
      message: '재평가 준비가 완료되었습니다.',
      evaluation: updated,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
