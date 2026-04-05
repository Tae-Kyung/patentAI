import { NextRequest } from 'next/server'
import { requireProjectOwner } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'

interface RouteContext {
  params: Promise<{ id: string }>
}

// POST: 평가 확정 (Gate 2 통과)
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params
    const user = await requireProjectOwner(id)

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
      return errorResponse('이미 확정된 평가입니다.', 400)
    }

    // 평가 완료 여부 확인
    if (evaluation.total_score === null) {
      return errorResponse('평가가 완료되지 않았습니다. 먼저 평가를 실행해주세요.', 400)
    }

    // 평가 확정
    const { data: updatedEvaluation, error: updateError } = await supabase
      .from('bi_evaluations')
      .update({
        is_confirmed: true,
        confirmed_at: new Date().toISOString(),
        confirmed_by: user.id,
      })
      .eq('id', evaluation.id)
      .select()
      .single()

    if (updateError) throw updateError

    // 프로젝트 상태 업데이트 (Gate 2 → Gate 3)
    const { error: projectError } = await supabase
      .from('bi_projects')
      .update({
        current_stage: 'document',
        current_gate: 'gate_3',
        gate_2_passed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (projectError) throw projectError

    return successResponse({
      message: 'Gate 2를 통과했습니다. 이제 문서 생성 단계로 진행할 수 있습니다.',
      evaluation: updatedEvaluation,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
