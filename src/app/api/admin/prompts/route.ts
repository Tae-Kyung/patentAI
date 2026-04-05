import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, handleApiError, paginatedResponse } from '@/lib/utils/api-response'
import type { PromptCategory } from '@/types/database'

// 프롬프트 생성 스키마
const createPromptSchema = z.object({
  key: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  category: z.enum(['ideation', 'evaluation', 'document', 'marketing', 'startup', 'mentoring'] as const),
  system_prompt: z.string().min(1),
  user_prompt_template: z.string().min(1),
  model: z.string().default('claude-sonnet-4-20250514'),
  temperature: z.number().min(0).max(2).default(0.7),
  max_tokens: z.number().min(100).max(8000).default(2000),
  credit_cost: z.number().int().min(0).max(100).default(1),
})

// GET: 프롬프트 목록 조회
export async function GET(request: NextRequest) {
  try {
    await requireAdmin()

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category') as PromptCategory | null
    const track = searchParams.get('track') // 'pre_startup' | 'startup'
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = (page - 1) * limit

    const supabase = await createClient()

    // 트랙/카테고리 필터 적용 헬퍼
    function applyFilters(query: typeof countQuery) {
      if (category) {
        query = query.eq('category', category)
      } else if (track === 'startup') {
        query = query.eq('category', 'startup')
      } else if (track === 'pre_startup') {
        query = query.neq('category', 'startup')
      }
      if (search) {
        query = query.or(`name.ilike.%${search}%,key.ilike.%${search}%`)
      }
      return query
    }

    // 전체 카운트 쿼리
    let countQuery = supabase
      .from('bi_prompts')
      .select('*', { count: 'exact', head: true })

    countQuery = applyFilters(countQuery)

    const { count } = await countQuery

    // 데이터 조회
    let dataQuery = supabase
      .from('bi_prompts')
      .select('*')
      .order('category')
      .order('name')
      .range(offset, offset + limit - 1)

    dataQuery = applyFilters(dataQuery)

    const { data, error } = await dataQuery

    if (error) {
      console.error('Supabase query error:', error.message)
      return errorResponse('프롬프트 목록을 불러오는데 실패했습니다.', 500)
    }

    return paginatedResponse(data || [], count || 0, page, limit)
  } catch (error) {
    return handleApiError(error)
  }
}

// POST: 새 프롬프트 생성
export async function POST(request: NextRequest) {
  try {
    const user = await requireAdmin()

    const body = await request.json()
    const validatedData = createPromptSchema.parse(body)

    const supabase = await createClient()

    // 중복 키 체크
    const { data: existing } = await supabase
      .from('bi_prompts')
      .select('id')
      .eq('key', validatedData.key)
      .single()

    if (existing) {
      return errorResponse('이미 존재하는 프롬프트 키입니다.', 400, 'DUPLICATE_KEY')
    }

    const { data, error } = await supabase
      .from('bi_prompts')
      .insert({
        ...validatedData,
        created_by: user.id,
        updated_by: user.id,
      })
      .select()
      .single()

    if (error) {
      console.error('Supabase insert error:', error.message)
      return errorResponse('프롬프트 생성에 실패했습니다.', 500)
    }

    return successResponse(data, 201)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues[0].message, 400, 'VALIDATION_ERROR')
    }
    return handleApiError(error)
  }
}
