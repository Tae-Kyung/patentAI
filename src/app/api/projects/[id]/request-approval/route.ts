import { NextRequest } from 'next/server'
import { requireProjectOwner, requireAuth } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'
import { z } from 'zod'

interface RouteContext {
  params: Promise<{ id: string }>
}

const approvalRequestSchema = z.object({
  gate: z.enum(['gate_1', 'gate_2', 'gate_3', 'gate_4']),
  message: z.string().optional(),
})

// POST: 멘토 승인 요청 생성
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params
    const user = await requireProjectOwner(id)

    const supabase = await createClient()

    const body = await request.json()
    const { gate, message } = approvalRequestSchema.parse(body)

    // 프로젝트 조회
    const { data: project, error: projectError } = await supabase
      .from('bi_projects')
      .select('*')
      .eq('id', id)
      .single()

    if (projectError || !project) {
      return errorResponse('프로젝트를 찾을 수 없습니다.', 404)
    }

    // 이미 해당 게이트에 대한 승인 요청이 있는지 확인
    const { data: existingApproval } = await supabase
      .from('bi_approvals')
      .select('*')
      .eq('project_id', id)
      .eq('gate', gate)
      .eq('status', 'pending')
      .single()

    if (existingApproval) {
      return errorResponse('이미 승인 대기 중인 요청이 있습니다.', 400)
    }

    // 승인 요청 생성
    const { data: approval, error: insertError } = await supabase
      .from('bi_approvals')
      .insert({
        project_id: id,
        gate,
        status: 'pending',
        requested_at: new Date().toISOString(),
        requested_by: user.id,
        message,
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
      message: '멘토 승인 요청이 생성되었습니다.',
      approval,
    }, 201)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues[0]?.message || '유효성 검사 오류', 400)
    }
    return handleApiError(error)
  }
}

// GET: 프로젝트의 승인 요청 목록 조회
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
        requester:bi_users!bi_approvals_requested_by_fkey(id, name, email),
        reviewer:bi_users!bi_approvals_reviewed_by_fkey(id, name, email)
      `)
      .eq('project_id', id)
      .order('requested_at', { ascending: false })

    if (error) throw error

    return successResponse(approvals || [])
  } catch (error) {
    return handleApiError(error)
  }
}
