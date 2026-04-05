import { NextRequest } from 'next/server'
import { requireProjectOwner } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'

interface RouteContext {
  params: Promise<{ id: string }>
}

// POST: 아이디어 확정 (Gate 1 통과)
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params
    const user = await requireProjectOwner(id)

    const supabase = await createClient()

    // 아이디어 조회
    const { data: ideaCard, error: ideaError } = await supabase
      .from('bi_idea_cards')
      .select('*')
      .eq('project_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (ideaError || !ideaCard) {
      return errorResponse('아이디어를 먼저 입력해주세요.', 400)
    }

    // AI 확장이 완료되었는지 확인
    if (!ideaCard.problem || !ideaCard.solution) {
      return errorResponse('아이디어 확장을 먼저 완료해주세요.', 400)
    }

    // 이미 확정된 경우
    if (ideaCard.is_confirmed) {
      return errorResponse('이미 확정된 아이디어입니다.', 400)
    }

    const now = new Date().toISOString()

    // 아이디어 확정
    const { error: updateIdeaError } = await supabase
      .from('bi_idea_cards')
      .update({
        is_confirmed: true,
        confirmed_at: now,
        confirmed_by: user.id,
      })
      .eq('id', ideaCard.id)

    if (updateIdeaError) {
      return errorResponse('아이디어 확정에 실패했습니다.', 500)
    }

    // 프로젝트 상태 업데이트 (Gate 1 통과)
    const { data: updatedProject, error: updateProjectError } = await supabase
      .from('bi_projects')
      .update({
        current_stage: 'evaluation',
        current_gate: 'gate_2',
        gate_1_passed_at: now,
        updated_at: now,
      })
      .eq('id', id)
      .select()
      .single()

    if (updateProjectError) {
      return errorResponse('프로젝트 상태 업데이트에 실패했습니다.', 500)
    }

    // 승인 기록 생성
    await supabase
      .from('bi_approvals')
      .insert({
        project_id: id,
        gate: 'gate_1',
        requested_by: user.id,
        status: 'approved',
        approved_by: user.id,
        approved_at: now,
        approval_comment: '사용자 자가 승인',
      })

    return successResponse({
      message: '아이디어가 확정되었습니다. 평가 단계로 이동합니다.',
      project: updatedProject,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
