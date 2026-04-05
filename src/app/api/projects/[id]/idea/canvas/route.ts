import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireProjectOwner } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'

const canvasSchema = z.object({
  problem: z.string().nullable().optional(),
  solution: z.string().nullable().optional(),
  target: z.string().nullable().optional(),
  differentiation: z.string().nullable().optional(),
  uvp: z.string().nullable().optional(),
  channels: z.string().nullable().optional(),
  revenue_streams: z.string().nullable().optional(),
  cost_structure: z.string().nullable().optional(),
  key_metrics: z.string().nullable().optional(),
})

interface RouteContext {
  params: Promise<{ id: string }>
}

// PATCH: 린 캔버스 수동 저장
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params
    await requireProjectOwner(id)

    const body = await request.json()
    const validatedData = canvasSchema.parse(body)

    const supabase = await createClient()

    const { data: existingIdea, error: findError } = await supabase
      .from('bi_idea_cards')
      .select('id')
      .eq('project_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (findError || !existingIdea) {
      return errorResponse('아이디어를 찾을 수 없습니다.', 404)
    }

    const { data, error } = await supabase
      .from('bi_idea_cards')
      .update({
        problem: validatedData.problem ?? null,
        solution: validatedData.solution ?? null,
        target: validatedData.target ?? null,
        differentiation: validatedData.differentiation ?? null,
        uvp: validatedData.uvp ?? null,
        channels: validatedData.channels ?? null,
        revenue_streams: validatedData.revenue_streams ?? null,
        cost_structure: validatedData.cost_structure ?? null,
        key_metrics: validatedData.key_metrics ?? null,
      })
      .eq('id', existingIdea.id)
      .select()
      .single()

    if (error) {
      console.error('Supabase update error:', error.message)
      return errorResponse('캔버스 저장에 실패했습니다.', 500)
    }

    return successResponse(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues[0].message, 400, 'VALIDATION_ERROR')
    }
    return handleApiError(error)
  }
}
