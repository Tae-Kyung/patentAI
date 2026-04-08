import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'

const addSchema = z.object({
  claim_number: z.number().int().min(1),
  claim_type: z.enum(['independent', 'dependent']).default('independent'),
  parent_claim_id: z.string().uuid().nullable().optional(),
  content: z.string().min(1).max(5000),
})

async function verifyProjectOwner(projectId: string, userId: string) {
  const supabase = await createClient()
  const { data: project } = await supabase
    .from('patentai_patent_projects')
    .select('id')
    .eq('id', projectId)
    .eq('user_id', userId)
    .single()
  return project ? supabase : null
}

// GET: 청구항 목록
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const user = await requireAuth()
    const supabase = await verifyProjectOwner(id, user.id)
    if (!supabase) return errorResponse('프로젝트를 찾을 수 없습니다.', 404)

    const { data, error } = await supabase
      .from('patentai_patent_claims')
      .select('*')
      .eq('project_id', id)
      .order('claim_number', { ascending: true })

    if (error) return errorResponse('청구항 조회 실패', 500)
    return successResponse(data ?? [])
  } catch (error) {
    return handleApiError(error)
  }
}

// POST: 청구항 추가
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const user = await requireAuth()
    const supabase = await verifyProjectOwner(id, user.id)
    if (!supabase) return errorResponse('프로젝트를 찾을 수 없습니다.', 404)

    const body = await request.json()
    const parsed = addSchema.safeParse(body)
    if (!parsed.success) return errorResponse(parsed.error.issues[0].message, 400)

    // 청구항 번호 중복 확인
    const { data: dup } = await supabase
      .from('patentai_patent_claims')
      .select('id')
      .eq('project_id', id)
      .eq('claim_number', parsed.data.claim_number)
      .single()

    if (dup) return errorResponse(`청구항 ${parsed.data.claim_number}번이 이미 존재합니다.`, 409)

    const { data, error } = await supabase
      .from('patentai_patent_claims')
      .insert({ project_id: id, ...parsed.data })
      .select()
      .single()

    if (error) return errorResponse('청구항 추가 실패', 500)
    return successResponse(data, 201)
  } catch (error) {
    return handleApiError(error)
  }
}
