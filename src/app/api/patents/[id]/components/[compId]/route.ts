import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'

const patchSchema = z.object({
  ref_number: z.string().min(1).max(10).optional(),
  name: z.string().min(1).max(200).optional(),
  description: z.string().nullable().optional(),
  parent_id: z.string().uuid().nullable().optional(),
  order_index: z.number().int().min(0).optional(),
})

async function verifyOwner(projectId: string, compId: string, userId: string) {
  const supabase = await createClient()

  const { data: comp } = await supabase
    .from('patentai_patent_components')
    .select('id, project_id')
    .eq('id', compId)
    .eq('project_id', projectId)
    .single()

  if (!comp) return null

  const { data: project } = await supabase
    .from('patentai_patent_projects')
    .select('id')
    .eq('id', projectId)
    .eq('user_id', userId)
    .single()

  return project ? supabase : null
}

// PATCH: 구성요소 수정
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; compId: string }> },
) {
  try {
    const { id, compId } = await params
    const user = await requireAuth()

    const supabase = await verifyOwner(id, compId, user.id)
    if (!supabase) return errorResponse('구성요소를 찾을 수 없습니다.', 404)

    const body = await request.json()
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) return errorResponse(parsed.error.issues[0].message, 400)
    if (Object.keys(parsed.data).length === 0) return errorResponse('수정할 항목이 없습니다.', 400)

    // ref_number 변경 시 중복 확인
    if (parsed.data.ref_number) {
      const { data: dup } = await supabase
        .from('patentai_patent_components')
        .select('id')
        .eq('project_id', id)
        .eq('ref_number', parsed.data.ref_number)
        .neq('id', compId)
        .single()

      if (dup) return errorResponse(`참조번호 (${parsed.data.ref_number})이 이미 사용 중입니다.`, 409)
    }

    const { data, error } = await supabase
      .from('patentai_patent_components')
      .update(parsed.data)
      .eq('id', compId)
      .select()
      .single()

    if (error) return errorResponse('구성요소 수정 실패', 500)

    return successResponse(data)
  } catch (error) {
    return handleApiError(error)
  }
}

// DELETE: 구성요소 삭제 (CASCADE로 자식 포함 삭제)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; compId: string }> },
) {
  try {
    const { id, compId } = await params
    const user = await requireAuth()

    const supabase = await verifyOwner(id, compId, user.id)
    if (!supabase) return errorResponse('구성요소를 찾을 수 없습니다.', 404)

    const { error } = await supabase
      .from('patentai_patent_components')
      .delete()
      .eq('id', compId)

    if (error) return errorResponse('구성요소 삭제 실패', 500)

    return successResponse({ deleted: compId })
  } catch (error) {
    return handleApiError(error)
  }
}
