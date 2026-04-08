import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'

const createInputSchema = z.object({
  type: z.literal('text'),
  content: z.string().min(1).max(5000),
})

// POST: 텍스트 입력 저장
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const user = await requireAuth()
    const supabase = await createClient()

    const { data: project } = await supabase
      .from('patentai_patent_projects')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (!project) return errorResponse('프로젝트를 찾을 수 없습니다.', 404)

    const body = await request.json()
    const parsed = createInputSchema.safeParse(body)
    if (!parsed.success) return errorResponse(parsed.error.issues[0].message, 400)

    const { data, error } = await supabase
      .from('patentai_patent_inputs')
      .insert({ project_id: id, type: 'text', content: parsed.data.content })
      .select()
      .single()

    if (error) return errorResponse('입력 저장 실패', 500)

    return successResponse(data, 201)
  } catch (error) {
    return handleApiError(error)
  }
}

// GET: 입력 목록 조회
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const user = await requireAuth()
    const supabase = await createClient()

    const { data: project } = await supabase
      .from('patentai_patent_projects')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (!project) return errorResponse('프로젝트를 찾을 수 없습니다.', 404)

    const { data, error } = await supabase
      .from('patentai_patent_inputs')
      .select('*')
      .eq('project_id', id)
      .order('created_at', { ascending: true })

    if (error) return errorResponse('입력 목록 조회 실패', 500)

    return successResponse(data ?? [])
  } catch (error) {
    return handleApiError(error)
  }
}
