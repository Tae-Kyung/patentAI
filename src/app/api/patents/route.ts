import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, paginatedResponse, handleApiError } from '@/lib/utils/api-response'

const createSchema = z.object({
  title: z.string().min(1).max(500).default('새 특허 프로젝트'),
  input_type: z.enum(['idea', 'prd', 'paper', 'mixed']).default('idea'),
})

// GET: 내 특허 프로젝트 목록
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10')))
    const offset = (page - 1) * limit

    const supabase = await createClient()

    const { count } = await supabase
      .from('patentai_patent_projects')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    const { data, error } = await supabase
      .from('patentai_patent_projects')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) return errorResponse('프로젝트 목록 조회 실패', 500)

    return paginatedResponse(data ?? [], count ?? 0, page, limit)
  } catch (error) {
    return handleApiError(error)
  }
}

// POST: 새 특허 프로젝트 생성
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) return errorResponse(parsed.error.issues[0].message, 400)

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('patentai_patent_projects')
      .insert({ ...parsed.data, user_id: user.id })
      .select()
      .single()

    if (error) return errorResponse('프로젝트 생성 실패', 500)

    return successResponse(data, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
