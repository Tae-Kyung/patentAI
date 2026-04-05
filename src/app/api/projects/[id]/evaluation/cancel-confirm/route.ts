import { NextRequest } from 'next/server'
import { requireProjectOwner } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'

interface RouteContext {
  params: Promise<{ id: string }>
}

// POST: 평가 확정 취소 (Gate 2 롤백)
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params
    await requireProjectOwner(id)

    const supabase = await createClient()

    // 평가 조회
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

    if (!evaluation.is_confirmed) {
      return errorResponse('확정되지 않은 평가입니다.', 400)
    }

    // 평가 확정 해제
    const { error: updateError } = await supabase
      .from('bi_evaluations')
      .update({
        is_confirmed: false,
        confirmed_at: null,
        confirmed_by: null,
      })
      .eq('id', evaluation.id)

    if (updateError) throw updateError

    // 프로젝트 상태 롤백 (하위 게이트도 함께 롤백)
    const { error: projectError } = await supabase
      .from('bi_projects')
      .update({
        current_stage: 'evaluation',
        current_gate: 'gate_2',
        gate_2_passed_at: null,
        gate_3_passed_at: null,
        gate_4_passed_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (projectError) throw projectError

    return successResponse({
      message: '평가 확정이 해제되었습니다. 재평가를 진행할 수 있습니다.',
    })
  } catch (error) {
    return handleApiError(error)
  }
}
