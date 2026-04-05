import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireProjectOwner } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'

const createReviewSchema = z.object({
  business_plan_text: z.string().min(50, '사업계획서는 최소 50자 이상이어야 합니다.'),
  company_name: z.string().nullable().optional(),
  industry: z.string().nullable().optional(),
  founded_year: z.number().nullable().optional(),
  employee_count: z.number().nullable().optional(),
  annual_revenue: z.string().nullable().optional(),
  funding_stage: z.string().nullable().optional(),
})

const updateReviewSchema = z.object({
  business_plan_text: z.string().min(50, '사업계획서는 최소 50자 이상이어야 합니다.').optional(),
  company_name: z.string().nullable().optional(),
  industry: z.string().nullable().optional(),
  founded_year: z.number().nullable().optional(),
  employee_count: z.number().nullable().optional(),
  annual_revenue: z.string().nullable().optional(),
  funding_stage: z.string().nullable().optional(),
})

interface RouteContext {
  params: Promise<{ id: string }>
}

// GET: 사업 리뷰 조회
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params
    await requireProjectOwner(id)

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('bi_business_reviews')
      .select('*')
      .eq('project_id', id)
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    return successResponse(data || null)
  } catch (error) {
    return handleApiError(error)
  }
}

// POST: 새 사업 리뷰 생성
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params
    await requireProjectOwner(id)

    const body = await request.json()
    const validatedData = createReviewSchema.parse(body)

    const supabase = await createClient()

    // 기존 리뷰 확인
    const { data: existingReview } = await supabase
      .from('bi_business_reviews')
      .select('id')
      .eq('project_id', id)
      .limit(1)
      .single()

    if (existingReview) {
      return errorResponse('이미 사업 리뷰가 존재합니다. PATCH를 사용하세요.', 400)
    }

    const { data, error } = await supabase
      .from('bi_business_reviews')
      .insert({
        project_id: id,
        business_plan_text: validatedData.business_plan_text,
        company_name: validatedData.company_name || null,
        industry: validatedData.industry || null,
        founded_year: validatedData.founded_year || null,
        employee_count: validatedData.employee_count || null,
        annual_revenue: validatedData.annual_revenue || null,
        funding_stage: validatedData.funding_stage || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Supabase insert error:', error.message)
      return errorResponse('사업 검토 저장에 실패했습니다.', 500)
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

// PATCH: 사업 리뷰 수정
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params
    await requireProjectOwner(id)

    const body = await request.json()
    const validatedData = updateReviewSchema.parse(body)

    const supabase = await createClient()

    // 기존 리뷰 조회
    const { data: existingReview, error: findError } = await supabase
      .from('bi_business_reviews')
      .select('id')
      .eq('project_id', id)
      .limit(1)
      .single()

    if (findError || !existingReview) {
      return errorResponse('사업 리뷰를 찾을 수 없습니다.', 404)
    }

    const { data, error } = await supabase
      .from('bi_business_reviews')
      .update({
        ...validatedData,
        // AI 분석 결과 초기화
        ai_review: null,
        review_score: null,
        swot_analysis: null,
        diagnosis_result: null,
        strategy_result: null,
        action_items: null,
        report_content: null,
        executive_summary: null,
        is_review_confirmed: false,
        is_diagnosis_confirmed: false,
        is_strategy_confirmed: false,
      })
      .eq('id', existingReview.id)
      .select()
      .single()

    if (error) {
      console.error('Supabase update error:', error.message)
      return errorResponse('사업 검토 수정에 실패했습니다.', 500)
    }

    // 프로젝트 상태 업데이트
    await supabase
      .from('bi_projects')
      .update({
        status: 'in_progress',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    return successResponse(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues[0].message, 400, 'VALIDATION_ERROR')
    }
    return handleApiError(error)
  }
}
