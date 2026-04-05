import { NextRequest } from 'next/server'
import { requireAuth, requireProjectAccess } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'
import { z } from 'zod'

interface RouteContext {
  params: Promise<{ id: string }>
}

const feedbackSchema = z.object({
  stage: z.enum(['idea', 'evaluation', 'document', 'deploy', 'done']).optional(),
  gate: z.enum(['gate_1', 'gate_2', 'gate_3', 'gate_4']).optional(),
  comment: z.string().min(10, '피드백은 10자 이상이어야 합니다.'),
  feedback_type: z.enum(['comment', 'approval', 'rejection', 'revision_request']).default('comment'),
})

// GET: 프로젝트 피드백 목록 조회
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params
    const user = await requireProjectAccess(id)

    const supabase = await createClient()
    const serviceClient = createServiceClient()

    const { data: feedbacks, error } = await supabase
      .from('bi_feedbacks')
      .select('*')
      .eq('project_id', id)
      .is('parent_id', null)
      .order('created_at', { ascending: false })

    if (error) throw error

    const feedbackList = feedbacks || []

    // 작성자 정보를 service client로 조회 (RLS 우회)
    const userIds = [...new Set(feedbackList.map((f) => f.user_id))]
    let userMap: Record<string, { id: string; name: string | null; email: string; role: string }> = {}
    if (userIds.length > 0) {
      const { data: users } = await serviceClient
        .from('bi_users')
        .select('id, name, email, role')
        .in('id', userIds)
      for (const u of users || []) {
        userMap[u.id] = u
      }
    }

    const feedbackIds = feedbackList.map((f) => f.id)

    // 좋아요 수 및 본인 좋아요 여부 조회
    let likeCountMap: Record<string, number> = {}
    let myLikeSet = new Set<string>()

    if (feedbackIds.length > 0) {
      // bi_feedback_likes is not in generated types yet, use type assertion
      const likesTable = 'bi_feedback_likes' as unknown as 'bi_feedbacks'
      const [{ data: allLikes }, { data: myLikes }] = await Promise.all([
        serviceClient
          .from(likesTable)
          .select('feedback_id')
          .in('feedback_id', feedbackIds),
        serviceClient
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
      const { data: replies } = await serviceClient
        .from('bi_feedbacks')
        .select('*')
        .in('parent_id', feedbackIds)
        .order('created_at', { ascending: true })

      const replyUserIds = [...new Set((replies || []).map((r) => r.user_id).filter((uid) => !userMap[uid]))]
      if (replyUserIds.length > 0) {
        const { data: replyUsers } = await serviceClient
          .from('bi_users')
          .select('id, name, email, role')
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

    const enriched = feedbackList.map((f) => ({
      ...f,
      author: userMap[f.user_id] || null,
      like_count: likeCountMap[f.id] || 0,
      is_liked: myLikeSet.has(f.id),
      replies: repliesMap[f.id] || [],
    }))

    return successResponse(enriched)
  } catch (error) {
    return handleApiError(error)
  }
}

// POST: 피드백 작성 (멘토/관리자만)
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

    // 멘토 또는 관리자만 피드백 작성 가능
    if (!userProfile || !['mentor', 'admin'].includes(userProfile.role)) {
      return errorResponse('멘토 또는 관리자만 피드백을 작성할 수 있습니다.', 403)
    }

    // 프로젝트 존재 확인
    const { data: project, error: projectError } = await supabase
      .from('bi_projects')
      .select('id, user_id, current_stage')
      .eq('id', id)
      .single()

    if (projectError || !project) {
      return errorResponse('프로젝트를 찾을 수 없습니다.', 404)
    }

    const body = await request.json()
    const validatedData = feedbackSchema.parse(body)

    // 현재 프로젝트 스테이지 조회
    const stage = validatedData.stage || project.current_stage || 'idea'

    const { data: feedback, error: insertError } = await supabase
      .from('bi_feedbacks')
      .insert({
        project_id: id,
        user_id: user.id,
        stage,
        gate: validatedData.gate || null,
        comment: validatedData.comment,
        feedback_type: validatedData.feedback_type,
      })
      .select()
      .single()

    if (insertError) throw insertError

    return successResponse(feedback, 201)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues[0]?.message || '유효성 검사 오류', 400)
    }
    return handleApiError(error)
  }
}
