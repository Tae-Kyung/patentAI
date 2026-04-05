import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireInstitutionAccess } from '@/lib/auth/institution'
import { createServiceClient } from '@/lib/supabase/service'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'
import type { MentorMatchStatus, MentorMatchRole } from '@/types/database'

const updateMatchSchema = z.object({
  status: z.enum(['assigned', 'in_progress', 'review', 'completed', 'cancelled']).optional(),
  mentor_id: z.string().uuid().optional(),
  mentor_role: z.enum(['primary', 'secondary']).optional(),
  unit_price: z.number().int().min(0).max(10000000).optional(),
}).refine(data => data.status || data.mentor_id || data.mentor_role || data.unit_price !== undefined, {
  message: '변경할 항목이 없습니다.',
})

// PATCH: 매칭 상태 변경
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { searchParams } = new URL(request.url)
    await requireInstitutionAccess(searchParams.get('institution_id'))
    const { id } = await context.params

    const body = await request.json()
    const validated = updateMatchSchema.parse(body)

    const supabase = createServiceClient()

    const updateData: Record<string, unknown> = {}
    if (validated.status) updateData.status = validated.status as MentorMatchStatus
    if (validated.mentor_id) updateData.mentor_id = validated.mentor_id
    if (validated.mentor_role) updateData.mentor_role = validated.mentor_role as MentorMatchRole
    if (validated.unit_price !== undefined) updateData.unit_price = validated.unit_price

    const { data, error } = await supabase
      .from('bi_mentor_matches')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Match update error:', error.message)
      return errorResponse('매칭 상태 변경에 실패했습니다.', 500)
    }

    return successResponse(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues[0].message, 400, 'VALIDATION_ERROR')
    }
    return handleApiError(error)
  }
}

// DELETE: 매칭 삭제
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { searchParams } = new URL(request.url)
    await requireInstitutionAccess(searchParams.get('institution_id'))
    const { id } = await context.params

    const supabase = createServiceClient()

    const { error } = await supabase
      .from('bi_mentor_matches')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Match delete error:', error.message)
      return errorResponse('매칭 삭제에 실패했습니다.', 500)
    }

    return successResponse({ message: '매칭이 삭제되었습니다.' })
  } catch (error) {
    return handleApiError(error)
  }
}
