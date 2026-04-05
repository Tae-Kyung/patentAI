import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'
import { z } from 'zod'

interface RouteContext {
  params: Promise<{ id: string }>
}

const approvalActionSchema = z.object({
  approvalId: z.string().uuid(),
  action: z.enum(['approve', 'reject', 'request_revision']),
  comment: z.string().optional(),
})

// POST: 멘토 승인/반려 처리
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params
    const user = await requireAuth()

    const supabase = await createClient()

    // 사용자 역할 확인
    const { data: userProfile, error: userError } = await supabase
      .from('bi_users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userError) throw userError

    if (!userProfile || !['mentor', 'admin'].includes(userProfile.role)) {
      return errorResponse('멘토 또는 관리자만 승인 처리할 수 있습니다.', 403)
    }

    const body = await request.json()
    const { approvalId, action, comment } = approvalActionSchema.parse(body)

    // 승인 요청 조회
    const { data: approval, error: approvalError } = await supabase
      .from('bi_approvals')
      .select('*')
      .eq('id', approvalId)
      .eq('project_id', id)
      .single()

    if (approvalError || !approval) {
      return errorResponse('승인 요청을 찾을 수 없습니다.', 404)
    }

    if (approval.status !== 'pending') {
      return errorResponse('이미 처리된 승인 요청입니다.', 400)
    }

    // 승인 처리
    const newStatus = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'revision_requested'

    const { data: updatedApproval, error: updateError } = await supabase
      .from('bi_approvals')
      .update({
        status: newStatus,
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id,
        review_comment: comment,
      })
      .eq('id', approvalId)
      .select()
      .single()

    if (updateError) throw updateError

    // 승인인 경우 해당 게이트 통과 처리
    if (action === 'approve') {
      const gateField = `${approval.gate}_passed_at`
      const nextStageMap: Record<string, string> = {
        gate_1: 'evaluation',
        gate_2: 'document',
        gate_3: 'deploy',
        gate_4: 'done',
      }
      const nextGateMap: Record<string, string> = {
        gate_1: 'gate_2',
        gate_2: 'gate_3',
        gate_3: 'gate_4',
        gate_4: 'completed',
      }

      const projectUpdate: Record<string, unknown> = {
        [gateField]: new Date().toISOString(),
        current_stage: nextStageMap[approval.gate],
        current_gate: nextGateMap[approval.gate],
        updated_at: new Date().toISOString(),
      }

      if (approval.gate === 'gate_4') {
        projectUpdate.status = 'completed'
      }

      await supabase
        .from('bi_projects')
        .update(projectUpdate)
        .eq('id', id)
    }

    // 피드백 자동 생성
    if (comment) {
      type ProjectStage = 'idea' | 'evaluation' | 'document' | 'deploy' | 'done'
      type FeedbackType = 'comment' | 'approval' | 'rejection' | 'revision_request'

      const stageMap: Record<string, ProjectStage> = {
        gate_1: 'idea',
        gate_2: 'evaluation',
        gate_3: 'document',
        gate_4: 'deploy',
      }

      const feedbackTypeMap: Record<string, FeedbackType> = {
        approve: 'approval',
        reject: 'rejection',
        request_revision: 'revision_request',
      }

      await supabase.from('bi_feedbacks').insert({
        project_id: id,
        user_id: user.id,
        stage: stageMap[approval.gate] || 'idea',
        gate: approval.gate as 'gate_1' | 'gate_2' | 'gate_3' | 'gate_4',
        comment,
        feedback_type: feedbackTypeMap[action] || 'comment',
      })
    }

    const actionMessages = {
      approve: '승인되었습니다.',
      reject: '반려되었습니다.',
      request_revision: '수정이 요청되었습니다.',
    }

    return successResponse({
      message: actionMessages[action],
      approval: updatedApproval,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues[0]?.message || '유효성 검사 오류', 400)
    }
    return handleApiError(error)
  }
}
