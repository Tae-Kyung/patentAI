import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, handleApiError, paginatedResponse } from '@/lib/utils/api-response'

const createPromptSchema = z.object({
  key: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  category: z.string().default('patent'),
  system_prompt: z.string().min(1),
  user_prompt_template: z.string().min(1),
  model: z.string().default('claude-sonnet-4-20250514'),
  temperature: z.number().min(0).max(2).default(0.7),
  max_tokens: z.number().min(100).max(8000).default(2000),
  credit_cost: z.number().int().min(0).max(100).default(1),
})

export async function GET(request: NextRequest) {
  try {
    await requireAdmin()

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    const supabase = await createClient()

    let countQuery = supabase.from('patentai_prompts').select('*', { count: 'exact', head: true })
    let dataQuery = supabase.from('patentai_prompts').select('*').order('category').order('name').range(offset, offset + limit - 1)

    if (category) {
      countQuery = countQuery.eq('category', category)
      dataQuery = dataQuery.eq('category', category)
    }
    if (search) {
      countQuery = countQuery.or(`name.ilike.%${search}%,key.ilike.%${search}%`)
      dataQuery = dataQuery.or(`name.ilike.%${search}%,key.ilike.%${search}%`)
    }

    const [{ count }, { data, error }] = await Promise.all([countQuery, dataQuery])

    if (error) return errorResponse('프롬프트 목록을 불러오는데 실패했습니다.', 500)

    return paginatedResponse(data || [], count || 0, page, limit)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin()

    const body = await request.json()
    const validatedData = createPromptSchema.parse(body)

    const supabase = await createClient()

    const { data: existing } = await supabase
      .from('patentai_prompts')
      .select('id')
      .eq('key', validatedData.key)
      .single()

    if (existing) {
      return errorResponse('이미 존재하는 프롬프트 키입니다.', 400, 'DUPLICATE_KEY')
    }

    const { data, error } = await supabase
      .from('patentai_prompts')
      .insert(validatedData)
      .select()
      .single()

    if (error) return errorResponse('프롬프트 생성에 실패했습니다.', 500)

    return successResponse(data, 201)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues[0].message, 400, 'VALIDATION_ERROR')
    }
    return handleApiError(error)
  }
}
