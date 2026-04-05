import { NextRequest } from 'next/server'
import { requireProjectOwner, requireAuth } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'

interface RouteContext {
  params: Promise<{ id: string }>
}

// POST: 프로젝트 완료 (Gate 4 통과)
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params
    await requireProjectOwner(id)
    const user = await requireAuth()

    const supabase = await createClient()

    // 프로젝트 조회
    const { data: project, error: projectError } = await supabase
      .from('bi_projects')
      .select('*')
      .eq('id', id)
      .single()

    if (projectError || !project) {
      return errorResponse('프로젝트를 찾을 수 없습니다.', 404)
    }

    // Gate 3 통과 확인
    if (!project.gate_3_passed_at) {
      return errorResponse('문서 단계(Gate 3)를 먼저 완료해주세요.', 400)
    }

    // 이미 완료된 경우
    if (project.gate_4_passed_at) {
      return errorResponse('이미 완료된 프로젝트입니다.', 400)
    }

    // 멘토 승인 필요 여부 확인
    if (project.mentor_approval_required) {
      // 승인 요청 확인
      const { data: approval } = await supabase
        .from('bi_approvals')
        .select('*')
        .eq('project_id', id)
        .eq('gate', 'gate_4')
        .eq('status', 'approved')
        .single()

      if (!approval) {
        return errorResponse('멘토 승인이 필요합니다. 먼저 승인 요청을 해주세요.', 400)
      }
    }

    // 프로젝트 완료 처리
    const { data: updated, error: updateError } = await supabase
      .from('bi_projects')
      .update({
        status: 'completed',
        current_stage: 'done',
        current_gate: 'completed',
        gate_4_passed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (updateError) throw updateError

    return successResponse({
      message: '축하합니다! 프로젝트가 완료되었습니다.',
      project: updated,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
