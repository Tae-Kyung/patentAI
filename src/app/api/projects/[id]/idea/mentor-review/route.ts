import { NextRequest } from 'next/server'
import { requireProjectOwner, requireAuth } from '@/lib/auth/guards'
import { deductCredit } from '@/lib/credits'
import { createClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'
import { z } from 'zod'

interface RouteContext {
  params: Promise<{ id: string }>
}

const reviewRequestSchema = z.object({
  message: z.string().optional(),
})

// POST: 아이디어 단계 멘토 검토 요청
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params
    await requireProjectOwner(id)
    const user = await requireAuth()
    await deductCredit(user.id, 'ai_mentor_review', id)

    const supabase = await createClient()

    // 프로젝트 및 아이디어 카드 조회
    const { data: project, error: projectError } = await supabase
      .from('bi_projects')
      .select(`
        *,
        ideaCard:bi_idea_cards(*)
      `)
      .eq('id', id)
      .single()

    if (projectError || !project) {
      return errorResponse('프로젝트를 찾을 수 없습니다.', 404)
    }

    if (!project.ideaCard) {
      return errorResponse('아이디어가 아직 생성되지 않았습니다.', 400)
    }

    // 이미 Gate 1을 통과한 경우
    if (project.gate_1_passed_at) {
      return errorResponse('이미 Gate 1을 통과한 프로젝트입니다.', 400)
    }

    const body = await request.json()
    const { message } = reviewRequestSchema.parse(body)

    // 기존 Gate 1 승인 요청 확인
    const { data: existingApproval } = await supabase
      .from('bi_approvals')
      .select('*')
      .eq('project_id', id)
      .eq('gate', 'gate_1')
      .eq('status', 'pending')
      .single()

    if (existingApproval) {
      return errorResponse('이미 검토 요청이 진행 중입니다.', 400)
    }

    // 승인 요청 생성
    const { data: approval, error: insertError } = await supabase
      .from('bi_approvals')
      .insert({
        project_id: id,
        gate: 'gate_1',
        status: 'pending',
        requested_at: new Date().toISOString(),
        requested_by: user.id,
        message: message || '아이디어 확장 결과에 대한 멘토 검토를 요청합니다.',
      })
      .select()
      .single()

    if (insertError) throw insertError

    // 프로젝트에 멘토 승인 필요 표시
    await supabase
      .from('bi_projects')
      .update({
        mentor_approval_required: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    return successResponse({
      message: '멘토 검토 요청이 등록되었습니다.',
      approval,
    }, 201)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues[0]?.message || '유효성 검사 오류', 400)
    }
    return handleApiError(error)
  }
}

// GET: 멘토 검토 요청 상태 조회
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params
    await requireAuth()

    const supabase = await createClient()

    const { data: approvals, error } = await supabase
      .from('bi_approvals')
      .select(`
        *,
        reviewer:bi_users!bi_approvals_reviewed_by_fkey(id, name, email)
      `)
      .eq('project_id', id)
      .eq('gate', 'gate_1')
      .order('requested_at', { ascending: false })

    if (error) throw error

    return successResponse(approvals || [])
  } catch (error) {
    return handleApiError(error)
  }
}
