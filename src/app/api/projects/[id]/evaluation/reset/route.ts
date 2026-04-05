import { NextRequest } from 'next/server'
import { requireProjectOwner, requireAuth } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'

interface RouteContext {
  params: Promise<{ id: string }>
}

// POST: 평가 확정 해제 (Gate 2 되돌리기)
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params
    await requireProjectOwner(id)
    await requireAuth()

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

    if (!evaluation.is_confirmed) {
      return errorResponse('확정되지 않은 평가입니다.', 400)
    }

    // 확정된 문서가 있는지 확인
    const { data: confirmedDocs } = await supabase
      .from('bi_documents')
      .select('id')
      .eq('project_id', id)
      .eq('is_confirmed', true)
      .limit(1)

    if (confirmedDocs && confirmedDocs.length > 0) {
      return errorResponse('확정된 문서가 있어 되돌릴 수 없습니다.', 400)
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

    // 프로젝트 상태 되돌리기 (evaluation 단계, gate_2)
    const { error: projectError } = await supabase
      .from('bi_projects')
      .update({
        current_stage: 'evaluation',
        current_gate: 'gate_2',
        gate_2_passed_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (projectError) throw projectError

    return successResponse({
      message: '평가 단계로 돌아갔습니다. 재평가를 진행해주세요.',
    })
  } catch (error) {
    return handleApiError(error)
  }
}
