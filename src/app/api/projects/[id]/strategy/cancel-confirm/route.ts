import { NextRequest } from 'next/server'
import { requireProjectOwner } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'

interface RouteContext {
  params: Promise<{ id: string }>
}

// POST: 전략 확정 취소 (Gate 3 롤백 - 스타트업 트랙)
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params
    await requireProjectOwner(id)

    const supabase = await createClient()

    // 프로젝트 조회 (다음 게이트 확인)
    const { data: project, error: projectError } = await supabase
      .from('bi_projects')
      .select('*')
      .eq('id', id)
      .single()

    if (projectError || !project) {
      return errorResponse('프로젝트를 찾을 수 없습니다.', 404)
    }

    // 다음 게이트(Gate 4)가 이미 통과된 경우에도 함께 롤백

    // 사업 리뷰 조회
    const { data: review, error: reviewError } = await supabase
      .from('bi_business_reviews')
      .select('*')
      .eq('project_id', id)
      .limit(1)
      .single()

    if (reviewError || !review) {
      return errorResponse('사업 리뷰가 없습니다.', 404)
    }

    if (!review.is_strategy_confirmed) {
      return errorResponse('확정되지 않은 전략입니다.', 400)
    }

    const now = new Date().toISOString()

    // 전략 확정 취소
    const { data: updatedReview, error: updateError } = await supabase
      .from('bi_business_reviews')
      .update({
        is_strategy_confirmed: false,
        strategy_confirmed_at: null,
      })
      .eq('id', review.id)
      .select()
      .single()

    if (updateError) throw updateError

    // 프로젝트 상태 롤백 (Gate 3로, 하위 게이트도 함께 롤백)
    const { error: projectUpdateError } = await supabase
      .from('bi_projects')
      .update({
        current_stage: 'document',
        current_gate: 'gate_3',
        gate_3_passed_at: null,
        gate_4_passed_at: null,
        updated_at: now,
      })
      .eq('id', id)

    if (projectUpdateError) throw projectUpdateError

    // 승인 기록 삭제
    await supabase
      .from('bi_approvals')
      .delete()
      .eq('project_id', id)
      .eq('gate', 'gate_3')

    return successResponse({
      message: 'Gate 3 확정이 취소되었습니다.',
      review: updatedReview,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
