import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireProjectOwner } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'

const visibilitySchema = z.object({
  visibility: z.enum(['public', 'summary', 'private']),
})

interface RouteContext {
  params: Promise<{ id: string }>
}

// PATCH: 프로젝트 공개 범위 설정
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params
    await requireProjectOwner(id)

    const body = await request.json()
    const { visibility } = visibilitySchema.parse(body)

    const supabase = await createClient()

    // Gate 4 통과 여부 확인 (공개는 완료된 프로젝트만)
    if (visibility !== 'private') {
      const { data: project } = await supabase
        .from('bi_projects')
        .select('current_gate, status')
        .eq('id', id)
        .single()

      if (!project || (project.current_gate !== 'completed' && project.status !== 'completed')) {
        return errorResponse('프로젝트가 완료된 후에만 공개할 수 있습니다.', 400)
      }
    }

    const { data, error } = await supabase
      .from('bi_projects')
      .update({
        visibility,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return errorResponse('공개 범위 설정에 실패했습니다.', 500)
    }

    return successResponse(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues[0].message, 400, 'VALIDATION_ERROR')
    }
    return handleApiError(error)
  }
}
