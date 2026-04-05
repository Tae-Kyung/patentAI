import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, handleApiError, paginatedResponse } from '@/lib/utils/api-response'
import type { ProjectStatus, ProjectType } from '@/types/database'

// 프로젝트 생성 스키마
const createProjectSchema = z.object({
  name: z.string().min(1).max(200),
  project_type: z.enum(['pre_startup', 'startup']).default('pre_startup'),
})

// GET: 프로젝트 목록 조회
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') as ProjectStatus | null
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = (page - 1) * limit

    const supabase = await createClient()

    // 전체 카운트 쿼리
    let countQuery = supabase
      .from('bi_projects')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    if (status) {
      countQuery = countQuery.eq('status', status)
    }

    const { count } = await countQuery

    // 데이터 조회 (평가 점수 + 아이디어 요약 포함)
    let dataQuery = supabase
      .from('bi_projects')
      .select(`
        *,
        evaluation:bi_evaluations(total_score),
        idea_card:bi_idea_cards(problem)
      `)
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) {
      dataQuery = dataQuery.eq('status', status)
    }

    const { data, error } = await dataQuery

    if (error) {
      console.error('Supabase query error:', error.message)
      return errorResponse('프로젝트 목록을 불러오는데 실패했습니다.', 500)
    }

    // Supabase one-to-many join returns arrays — flatten to single objects
    const items = (data || []).map((item: Record<string, unknown>) => ({
      ...item,
      evaluation: Array.isArray(item.evaluation) ? item.evaluation[0] ?? null : item.evaluation,
      idea_card: Array.isArray(item.idea_card) ? item.idea_card[0] ?? null : item.idea_card,
    }))

    return paginatedResponse(items, count || 0, page, limit)
  } catch (error) {
    return handleApiError(error)
  }
}

// POST: 새 프로젝트 생성
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()

    const body = await request.json()
    const validatedData = createProjectSchema.parse(body)

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('bi_projects')
      .insert({
        user_id: user.id,
        name: validatedData.name,
        project_type: validatedData.project_type,
        status: 'draft',
        current_stage: 'idea',
        current_gate: 'gate_1',
      })
      .select()
      .single()

    if (error) {
      console.error('Supabase insert error:', error.message)
      return errorResponse('프로젝트 생성에 실패했습니다.', 500)
    }

    return successResponse(data, 201)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues[0].message, 400, 'VALIDATION_ERROR')
    }
    return handleApiError(error)
  }
}
