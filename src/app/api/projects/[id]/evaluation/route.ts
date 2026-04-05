import { NextRequest } from 'next/server'
import { requireProjectOwner } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'

interface RouteContext {
  params: Promise<{ id: string }>
}

// GET: 평가 결과 조회
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params
    await requireProjectOwner(id)

    const supabase = await createClient()

    const { data: evaluation, error } = await supabase
      .from('bi_evaluations')
      .select('*')
      .eq('project_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    return successResponse(evaluation || null)
  } catch (error) {
    return handleApiError(error)
  }
}

// POST: 새 평가 생성 (빈 레코드)
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params
    await requireProjectOwner(id)

    const supabase = await createClient()

    // Gate 1 통과 확인
    const { data: project, error: projectError } = await supabase
      .from('bi_projects')
      .select('current_gate, gate_1_passed_at')
      .eq('id', id)
      .single()

    if (projectError) throw projectError

    if (!project.gate_1_passed_at) {
      return errorResponse('아이디어 확정(Gate 1)을 먼저 완료해주세요.', 400)
    }

    // 기존 평가 확인
    const { data: existingEvaluation } = await supabase
      .from('bi_evaluations')
      .select('id, is_confirmed')
      .eq('project_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (existingEvaluation?.is_confirmed) {
      return errorResponse('이미 확정된 평가가 있습니다.', 400)
    }

    // 새 평가 생성
    const { data: evaluation, error } = await supabase
      .from('bi_evaluations')
      .insert({
        project_id: id,
      })
      .select()
      .single()

    if (error) throw error

    return successResponse(evaluation, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
