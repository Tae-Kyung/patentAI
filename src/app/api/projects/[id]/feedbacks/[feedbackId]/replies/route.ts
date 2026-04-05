import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/guards'
import { createServiceClient } from '@/lib/supabase/service'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'
import { createNotification } from '@/lib/notifications'
import { z } from 'zod'

interface RouteContext {
  params: Promise<{ id: string; feedbackId: string }>
}

const replySchema = z.object({
  comment: z.string().min(1, '답글을 입력해주세요.').max(2000),
})

// POST: 피드백에 답글 작성 (프로젝트 소유자 또는 멘토)
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id: projectId, feedbackId } = await context.params
    const user = await requireAuth()

    const supabase = createServiceClient()

    // 프로젝트 확인
    const { data: project, error: projectError } = await supabase
      .from('bi_projects')
      .select('id, user_id, name, current_stage')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      return errorResponse('프로젝트를 찾을 수 없습니다.', 404)
    }

    // 사용자 역할 확인
    const { data: userProfile } = await supabase
      .from('bi_users')
      .select('role, name, email')
      .eq('id', user.id)
      .single()

    const isProjectOwner = project.user_id === user.id
    const isMentorOrAdmin = userProfile && ['mentor', 'admin'].includes(userProfile.role)

    if (!isProjectOwner && !isMentorOrAdmin) {
      return errorResponse('답글을 작성할 권한이 없습니다.', 403)
    }

    // 부모 피드백 확인 (1단 깊이만 허용)
    const { data: parentFeedback, error: parentError } = await supabase
      .from('bi_feedbacks')
      .select('id, user_id, parent_id, project_id')
      .eq('id', feedbackId)
      .single()

    if (parentError || !parentFeedback) {
      return errorResponse('피드백을 찾을 수 없습니다.', 404)
    }

    if (parentFeedback.project_id !== projectId) {
      return errorResponse('프로젝트와 피드백이 일치하지 않습니다.', 400)
    }

    // 답글에 대한 답글 방지 (1단 깊이만)
    if (parentFeedback.parent_id) {
      return errorResponse('답글에는 답글을 달 수 없습니다.', 400)
    }

    const body = await request.json()
    const validated = replySchema.parse(body)

    const { data: reply, error: insertError } = await supabase
      .from('bi_feedbacks')
      .insert({
        project_id: projectId,
        user_id: user.id,
        stage: project.current_stage || 'idea',
        feedback_type: 'comment',
        comment: validated.comment,
        feedback_source: 'mentoring',
        parent_id: feedbackId,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Reply insert error:', insertError.message)
      return errorResponse('답글 작성에 실패했습니다.', 500)
    }

    // 부모 피드백 작성자에게 알림 (자기 자신이 아닌 경우)
    if (parentFeedback.user_id !== user.id) {
      const authorName = userProfile?.name || userProfile?.email || '사용자'
      const commentPreview = validated.comment.length > 50
        ? validated.comment.slice(0, 50) + '...'
        : validated.comment

      await createNotification({
        userId: parentFeedback.user_id,
        type: 'feedback_reply',
        title: `${authorName}님이 회원님의 의견에 답글을 작성했습니다: "${commentPreview}"`,
        link: `/projects/${projectId}`,
      })
    }

    return successResponse(reply, 201)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues[0]?.message || '유효성 검사 오류', 400)
    }
    return handleApiError(error)
  }
}
