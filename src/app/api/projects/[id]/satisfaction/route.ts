import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'
import { z } from 'zod'

interface RouteContext {
  params: Promise<{ id: string }>
}

const ratingField = z.number().int().min(1, '최소 1점입니다.').max(5, '최대 5점입니다.')

const satisfactionSchema = z.object({
  expertise: ratingField,
  specificity: ratingField,
  responsiveness: ratingField,
  overall: ratingField,
  comment: z.string().max(1000, '코멘트는 1000자 이내로 입력해주세요.').optional(),
})

// POST: 만족도 평가 제출
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params
    const user = await requireAuth()

    const supabase = await createClient()

    // 프로젝트 소유자 확인
    const { data: project, error: projectError } = await supabase
      .from('bi_projects')
      .select('user_id, current_stage')
      .eq('id', id)
      .single()

    if (projectError || !project) {
      return errorResponse('프로젝트를 찾을 수 없습니다.', 404)
    }

    if (project.user_id !== user.id) {
      return errorResponse('프로젝트에 대한 접근 권한이 없습니다.', 403)
    }

    const body = await request.json()
    const { expertise, specificity, responsiveness, overall, comment } = satisfactionSchema.parse(body)

    // 기존 만족도 평가 중복 확인
    const { data: existing, error: existingError } = await supabase
      .from('bi_feedbacks')
      .select('id')
      .eq('project_id', id)
      .eq('user_id', user.id)
      .eq('feedback_type', 'comment')
      .eq('feedback_source', 'mentoring')
      .like('comment', '%"type":"satisfaction"%')

    if (existingError) throw existingError

    if (existing && existing.length > 0) {
      return errorResponse('이미 만족도 평가를 제출하였습니다.', 400)
    }

    // 만족도 데이터를 JSON으로 comment에 저장
    const satisfactionData = JSON.stringify({
      type: 'satisfaction',
      ratings: {
        expertise,
        specificity,
        responsiveness,
        overall,
      },
      comment: comment || null,
    })

    const { data: feedback, error: insertError } = await supabase
      .from('bi_feedbacks')
      .insert({
        project_id: id,
        user_id: user.id,
        stage: project.current_stage || 'idea',
        feedback_type: 'comment',
        feedback_source: 'mentoring',
        comment: satisfactionData,
      })
      .select()
      .single()

    if (insertError) throw insertError

    return successResponse({
      message: '만족도 평가가 제출되었습니다.',
      feedback,
    }, 201)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues[0]?.message || '유효성 검사 오류', 400)
    }
    return handleApiError(error)
  }
}

// GET: 내 만족도 평가 조회
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params
    const user = await requireAuth()

    const supabase = await createClient()

    // 프로젝트 소유자 확인
    const { data: project, error: projectError } = await supabase
      .from('bi_projects')
      .select('user_id')
      .eq('id', id)
      .single()

    if (projectError || !project) {
      return errorResponse('프로젝트를 찾을 수 없습니다.', 404)
    }

    if (project.user_id !== user.id && user.role !== 'admin') {
      return errorResponse('프로젝트에 대한 접근 권한이 없습니다.', 403)
    }

    // 만족도 평가 피드백 조회
    const { data: feedbacks, error } = await supabase
      .from('bi_feedbacks')
      .select('*')
      .eq('project_id', id)
      .eq('user_id', user.id)
      .eq('feedback_type', 'comment')
      .eq('feedback_source', 'mentoring')
      .like('comment', '%"type":"satisfaction"%')
      .order('created_at', { ascending: false })
      .limit(1)

    if (error) throw error

    if (!feedbacks || feedbacks.length === 0) {
      return successResponse(null)
    }

    // comment JSON 파싱하여 반환
    const feedback = feedbacks[0]
    let parsedData = null
    try {
      parsedData = JSON.parse(feedback.comment)
    } catch {
      parsedData = { raw: feedback.comment }
    }

    return successResponse({
      id: feedback.id,
      project_id: feedback.project_id,
      ratings: parsedData.ratings || null,
      comment: parsedData.comment || null,
      created_at: feedback.created_at,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
