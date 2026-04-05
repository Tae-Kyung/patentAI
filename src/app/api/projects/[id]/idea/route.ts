import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireProjectOwner } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'

// 아이디어 저장 스키마
const saveIdeaSchema = z.object({
  raw_input: z.string().min(1),
})

interface RouteContext {
  params: Promise<{ id: string }>
}

// GET: 아이디어 조회
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params
    await requireProjectOwner(id)

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('bi_idea_cards')
      .select('*')
      .eq('project_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error) {
      // 아이디어가 없는 경우
      return successResponse(null)
    }

    return successResponse(data)
  } catch (error) {
    return handleApiError(error)
  }
}

// POST: 아이디어 저장 (새로 생성)
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params
    await requireProjectOwner(id)

    const body = await request.json()
    const validatedData = saveIdeaSchema.parse(body)

    const supabase = await createClient()

    // 기존 아이디어 확인
    const { data: existingIdea } = await supabase
      .from('bi_idea_cards')
      .select('id')
      .eq('project_id', id)
      .limit(1)
      .single()

    if (existingIdea) {
      return errorResponse('이미 아이디어가 존재합니다. PATCH를 사용하세요.', 400)
    }

    const { data, error } = await supabase
      .from('bi_idea_cards')
      .insert({
        project_id: id,
        raw_input: validatedData.raw_input,
        ai_model_used: 'claude-sonnet-4-20250514',
      })
      .select()
      .single()

    if (error) {
      console.error('Supabase insert error:', error.message)
      return errorResponse('아이디어 저장에 실패했습니다.', 500)
    }

    // 프로젝트 상태 업데이트
    await supabase
      .from('bi_projects')
      .update({
        status: 'in_progress',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    return successResponse(data, 201)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues[0].message, 400, 'VALIDATION_ERROR')
    }
    return handleApiError(error)
  }
}

// PATCH: 아이디어 수정
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params
    await requireProjectOwner(id)

    const body = await request.json()
    const validatedData = saveIdeaSchema.parse(body)

    const supabase = await createClient()

    // 기존 아이디어 조회
    const { data: existingIdea, error: findError } = await supabase
      .from('bi_idea_cards')
      .select('id, revision_count')
      .eq('project_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (findError || !existingIdea) {
      return errorResponse('아이디어를 찾을 수 없습니다.', 404)
    }

    const { data, error } = await supabase
      .from('bi_idea_cards')
      .update({
        raw_input: validatedData.raw_input,
        revision_count: existingIdea.revision_count + 1,
        // AI 확장 결과 초기화 (린 캔버스 9-Block + 유사 기업)
        problem: null,
        solution: null,
        target: null,
        differentiation: null,
        uvp: null,
        channels: null,
        revenue_streams: null,
        cost_structure: null,
        key_metrics: null,
        similar_companies: null,
        ai_expanded: null,
        is_confirmed: false,
        confirmed_at: null,
        confirmed_by: null,
      })
      .eq('id', existingIdea.id)
      .select()
      .single()

    if (error) {
      console.error('Supabase update error:', error.message)
      return errorResponse('아이디어 수정에 실패했습니다.', 500)
    }

    return successResponse(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues[0].message, 400, 'VALIDATION_ERROR')
    }
    return handleApiError(error)
  }
}
