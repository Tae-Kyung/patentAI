import { NextRequest } from 'next/server'
import { requireProjectOwner } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'

interface RouteContext {
  params: Promise<{ id: string }>
}

// POST: 전략 확정 (Gate 3 통과 - 스타트업 트랙)
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params
    const user = await requireProjectOwner(id)

    const supabase = await createClient()

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

    if (!review.strategy_result) {
      return errorResponse('성장 전략을 먼저 생성해주세요.', 400)
    }

    if (review.is_strategy_confirmed) {
      return errorResponse('이미 확정된 전략입니다.', 400)
    }

    const now = new Date().toISOString()

    // 전략 확정
    const { data: updatedReview, error: updateError } = await supabase
      .from('bi_business_reviews')
      .update({
        is_strategy_confirmed: true,
        strategy_confirmed_at: now,
      })
      .eq('id', review.id)
      .select()
      .single()

    if (updateError) throw updateError

    // 프로젝트 상태 업데이트 (Gate 3 → Gate 4)
    const { data: updatedProject, error: projectError } = await supabase
      .from('bi_projects')
      .update({
        current_stage: 'deploy',
        current_gate: 'gate_4',
        gate_3_passed_at: now,
        updated_at: now,
      })
      .eq('id', id)
      .select()
      .single()

    if (projectError) throw projectError

    // 승인 기록 생성
    await supabase
      .from('bi_approvals')
      .insert({
        project_id: id,
        gate: 'gate_3',
        requested_by: user.id,
        status: 'approved',
        approved_by: user.id,
        approved_at: now,
        approval_comment: '성장 전략 확정 - 스타트업 트랙 Gate 3 통과',
      })

    return successResponse({
      message: 'Gate 3를 통과했습니다. 보고서 생성 단계로 진행할 수 있습니다.',
      review: updatedReview,
      project: updatedProject,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
