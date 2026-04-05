import { NextRequest } from 'next/server'
import { requireProjectOwner } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'

interface RouteContext {
  params: Promise<{ id: string }>
}

// POST: 아이디어 확정 취소 (Gate 1 롤백 - 예비창업자 트랙)
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

    // 아이디어 카드 조회
    const { data: ideaCard, error: ideaError } = await supabase
      .from('bi_idea_cards')
      .select('*')
      .eq('project_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (ideaError || !ideaCard) {
      return errorResponse('아이디어 카드가 없습니다.', 404)
    }

    if (!ideaCard.is_confirmed) {
      return errorResponse('확정되지 않은 아이디어입니다.', 400)
    }

    const now = new Date().toISOString()

    // 아이디어 확정 취소
    const { error: updateError } = await supabase
      .from('bi_idea_cards')
      .update({
        is_confirmed: false,
        confirmed_at: null,
        confirmed_by: null,
      })
      .eq('id', ideaCard.id)

    if (updateError) throw updateError

    // 프로젝트 상태 롤백 (Gate 1로)
    const { error: projectUpdateError } = await supabase
      .from('bi_projects')
      .update({
        current_stage: 'idea',
        current_gate: 'gate_1',
        gate_1_passed_at: null,
        gate_2_passed_at: null,
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
      .eq('gate', 'gate_1')

    return successResponse({
      message: 'Gate 1 확정이 취소되었습니다.',
    })
  } catch (error) {
    return handleApiError(error)
  }
}
