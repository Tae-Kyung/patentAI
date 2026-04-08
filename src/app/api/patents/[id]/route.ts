import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'

const patchSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  status: z.enum(['draft', 'step1_done', 'step2_done', 'step3_done', 'step4_done', 'step5_done', 'completed']).optional(),
  tech_domain: z.string().nullable().optional(),
  ipc_codes: z.array(z.string()).optional(),
  core_inventions: z.array(z.string()).optional(),
})

// GET: 프로젝트 상세
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const user = await requireAuth()
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('patentai_patent_projects')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error || !data) return errorResponse('프로젝트를 찾을 수 없습니다.', 404)
    return successResponse(data)
  } catch (error) {
    return handleApiError(error)
  }
}

// PATCH: 프로젝트 메타데이터 수정
export async function PATCH(
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
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) return errorResponse(parsed.error.issues[0].message, 400)
    if (Object.keys(parsed.data).length === 0) return errorResponse('수정할 항목이 없습니다.', 400)

    const { data, error } = await supabase
      .from('patentai_patent_projects')
      .update(parsed.data)
      .eq('id', id)
      .select()
      .single()

    if (error) return errorResponse('프로젝트 수정 실패', 500)
    return successResponse(data)
  } catch (error) {
    return handleApiError(error)
  }
}

// DELETE: 프로젝트 삭제
export async function DELETE(
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

    const { error } = await supabase
      .from('patentai_patent_projects')
      .delete()
      .eq('id', id)

    if (error) return errorResponse('프로젝트 삭제 실패', 500)
    return successResponse({ deleted: id })
  } catch (error) {
    return handleApiError(error)
  }
}
