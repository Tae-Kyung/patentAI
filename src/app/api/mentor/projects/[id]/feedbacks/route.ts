import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireMentorMatch } from '@/lib/auth/guards'
import { createServiceClient } from '@/lib/supabase/service'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'
import { createNotification } from '@/lib/notifications'
import type { ProjectStage, FeedbackType } from '@/types/database'

interface RouteContext {
  params: Promise<{ id: string }>
}

const createFeedbackSchema = z.object({
  stage: z.enum(['idea', 'evaluation', 'document', 'deploy', 'done']),
  feedback_type: z.enum(['comment', 'approval', 'rejection', 'revision_request']).default('comment'),
  comment: z.string().min(1).max(5000),
})

// GET: 프로젝트에 대한 멘토 피드백 목록
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params
    const user = await requireMentorMatch(id)

    const supabase = createServiceClient()

    const { data, error } = await supabase
      .from('bi_feedbacks')
      .select('*')
      .eq('project_id', id)
      .eq('feedback_source', 'mentoring')
      .is('parent_id', null)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Mentor feedbacks query error:', error.message)
    }

    // 피드백 작성자 정보 조회
    const feedbacks = data || []
    const userIds = [...new Set(feedbacks.map((f) => f.user_id))]

    let userMap: Record<string, { id: string; name: string | null; email: string }> = {}
    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from('bi_users')
        .select('id, name, email')
        .in('id', userIds)
      for (const u of users || []) {
        userMap[u.id] = u
      }
    }

    // 좋아요 수 및 본인 좋아요 여부 조회
    const feedbackIds = feedbacks.map((f) => f.id)
    let likeCountMap: Record<string, number> = {}
    let myLikeSet = new Set<string>()

    if (feedbackIds.length > 0) {
      // bi_feedback_likes is not in generated types yet, use type assertion
      const likesTable = 'bi_feedback_likes' as unknown as 'bi_feedbacks'
      const [{ data: allLikes }, { data: myLikes }] = await Promise.all([
        supabase
          .from(likesTable)
          .select('feedback_id')
          .in('feedback_id', feedbackIds),
        supabase
          .from(likesTable)
          .select('feedback_id')
          .in('feedback_id', feedbackIds)
          .eq('user_id', user.id),
      ])

      for (const like of (allLikes || []) as unknown as { feedback_id: string }[]) {
        likeCountMap[like.feedback_id] = (likeCountMap[like.feedback_id] || 0) + 1
      }
      for (const like of (myLikes || []) as unknown as { feedback_id: string }[]) {
        myLikeSet.add(like.feedback_id)
      }
    }

    // 답글 조회
    let repliesMap: Record<string, Array<Record<string, unknown>>> = {}
    if (feedbackIds.length > 0) {
      const { data: replies } = await supabase
        .from('bi_feedbacks')
        .select('*')
        .in('parent_id', feedbackIds)
        .order('created_at', { ascending: true })

      // 답글 작성자 정보도 조회
      const replyUserIds = [...new Set((replies || []).map((r) => r.user_id).filter((uid) => !userMap[uid]))]
      if (replyUserIds.length > 0) {
        const { data: replyUsers } = await supabase
          .from('bi_users')
          .select('id, name, email')
          .in('id', replyUserIds)
        for (const u of replyUsers || []) {
          userMap[u.id] = u
        }
      }

      for (const reply of replies || []) {
        const parentId = reply.parent_id as string
        if (!repliesMap[parentId]) repliesMap[parentId] = []
        repliesMap[parentId].push({
          ...reply,
          author: userMap[reply.user_id] || null,
          is_mine: reply.user_id === user.id,
        })
      }
    }

    const enriched = feedbacks.map((f) => ({
      ...f,
      author: userMap[f.user_id] || null,
      is_mine: f.user_id === user.id,
      like_count: likeCountMap[f.id] || 0,
      is_liked: myLikeSet.has(f.id),
      replies: repliesMap[f.id] || [],
    }))

    return successResponse(enriched)
  } catch (error) {
    return handleApiError(error)
  }
}

// POST: 멘토 피드백 작성
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params
    const user = await requireMentorMatch(id)

    const body = await request.json()
    const validated = createFeedbackSchema.parse(body)

    const supabase = createServiceClient()

    const { data, error } = await supabase
      .from('bi_feedbacks')
      .insert({
        project_id: id,
        user_id: user.id,
        stage: validated.stage as ProjectStage,
        feedback_type: validated.feedback_type as FeedbackType,
        comment: validated.comment,
        feedback_source: 'mentoring',
      })
      .select()
      .single()

    if (error) {
      console.error('Mentor feedback insert error:', error.message)
      return errorResponse('피드백 작성에 실패했습니다.', 500)
    }

    // 프로젝트 소유자에게 알림 전송
    const { data: project } = await supabase
      .from('bi_projects')
      .select('user_id, name')
      .eq('id', id)
      .single()

    if (project && project.user_id !== user.id) {
      const mentorName = user.name || user.email || '멘토'
      const commentPreview = validated.comment.length > 50
        ? validated.comment.slice(0, 50) + '...'
        : validated.comment

      await createNotification({
        userId: project.user_id,
        type: 'mentor_feedback',
        title: `${mentorName}님이 ${project.name} 프로젝트에 "${commentPreview}" 의견을 작성했습니다.`,
        link: `/projects/${id}`,
      })
    }

    return successResponse(data, 201)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues[0].message, 400, 'VALIDATION_ERROR')
    }
    return handleApiError(error)
  }
}
