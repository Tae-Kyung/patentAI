import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'

const patchSchema = z.object({
  claim_number: z.number().int().min(1).optional(),
  claim_type: z.enum(['independent', 'dependent']).optional(),
  parent_claim_id: z.string().uuid().nullable().optional(),
  content: z.string().min(1).max(5000).optional(),
})

async function verifyClaim(projectId: string, claimId: string, userId: string) {
  const supabase = await createClient()

  const { data: claim } = await supabase
    .from('patentai_patent_claims')
    .select('id, project_id')
    .eq('id', claimId)
    .eq('project_id', projectId)
    .single()

  if (!claim) return null

  const { data: project } = await supabase
    .from('patentai_patent_projects')
    .select('id')
    .eq('id', projectId)
    .eq('user_id', userId)
    .single()

  return project ? supabase : null
}

// PATCH: 청구항 수정
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; claimId: string }> },
) {
  try {
    const { id, claimId } = await params
    const user = await requireAuth()

    const supabase = await verifyClaim(id, claimId, user.id)
    if (!supabase) return errorResponse('청구항을 찾을 수 없습니다.', 404)

    const body = await request.json()
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) return errorResponse(parsed.error.issues[0].message, 400)
    if (Object.keys(parsed.data).length === 0) return errorResponse('수정할 항목이 없습니다.', 400)

    // 번호 변경 시 중복 확인
    if (parsed.data.claim_number !== undefined) {
      const { data: dup } = await supabase
        .from('patentai_patent_claims')
        .select('id')
        .eq('project_id', id)
        .eq('claim_number', parsed.data.claim_number)
        .neq('id', claimId)
        .single()

      if (dup) return errorResponse(`청구항 ${parsed.data.claim_number}번이 이미 존재합니다.`, 409)
    }

    const { data, error } = await supabase
      .from('patentai_patent_claims')
      .update(parsed.data)
      .eq('id', claimId)
      .select()
      .single()

    if (error) return errorResponse('청구항 수정 실패', 500)
    return successResponse(data)
  } catch (error) {
    return handleApiError(error)
  }
}

// DELETE: 청구항 삭제
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; claimId: string }> },
) {
  try {
    const { id, claimId } = await params
    const user = await requireAuth()

    const supabase = await verifyClaim(id, claimId, user.id)
    if (!supabase) return errorResponse('청구항을 찾을 수 없습니다.', 404)

    // 이 청구항을 부모로 가진 종속 청구항의 parent 해제
    await supabase
      .from('patentai_patent_claims')
      .update({ parent_claim_id: null, claim_type: 'independent' })
      .eq('project_id', id)
      .eq('parent_claim_id', claimId)

    const { error } = await supabase
      .from('patentai_patent_claims')
      .delete()
      .eq('id', claimId)

    if (error) return errorResponse('청구항 삭제 실패', 500)
    return successResponse({ deleted: claimId })
  } catch (error) {
    return handleApiError(error)
  }
}
