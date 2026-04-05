import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth/guards'
import { createServiceClient } from '@/lib/supabase/service'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'

const updateMappingSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'completed']).optional(),
  institution_id: z.string().uuid().optional(),
  program_id: z.string().uuid().optional(),
}).refine(data => data.status || data.institution_id || data.program_id, {
  message: '변경할 항목이 없습니다.',
})

interface RouteContext {
  params: Promise<{ id: string }>
}

// PATCH: 매핑 상태 수정
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    await requireAdmin()
    const { id } = await context.params

    const body = await request.json()
    const validatedData = updateMappingSchema.parse(body)

    const supabase = createServiceClient()

    // 기관 변경 시 중복 체크
    if (validatedData.institution_id) {
      const { data: currentMapping } = await supabase
        .from('bi_project_institution_maps')
        .select('project_id')
        .eq('id', id)
        .single()

      if (currentMapping) {
        const { data: existing } = await supabase
          .from('bi_project_institution_maps')
          .select('id')
          .eq('project_id', currentMapping.project_id)
          .eq('institution_id', validatedData.institution_id)
          .neq('id', id)
          .limit(1)
          .single()

        if (existing) {
          return errorResponse('해당 프로젝트는 이미 선택한 기관에 매핑되어 있습니다.', 409)
        }
      }
    }

    const updateData: Record<string, unknown> = {}
    if (validatedData.status) updateData.status = validatedData.status
    if (validatedData.institution_id) updateData.institution_id = validatedData.institution_id
    if (validatedData.program_id) updateData.program_id = validatedData.program_id

    const { data, error } = await supabase
      .from('bi_project_institution_maps')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Mapping update error:', error.message)
      return errorResponse('매핑 수정에 실패했습니다.', 500)
    }

    return successResponse(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues[0].message, 400, 'VALIDATION_ERROR')
    }
    return handleApiError(error)
  }
}

// DELETE: 매핑 삭제
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    await requireAdmin()
    const { id } = await context.params

    const supabase = createServiceClient()

    const { error } = await supabase
      .from('bi_project_institution_maps')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Mapping delete error:', error.message)
      return errorResponse('매핑 삭제에 실패했습니다.', 500)
    }

    return successResponse({ message: '매핑이 삭제되었습니다.' })
  } catch (error) {
    return handleApiError(error)
  }
}
