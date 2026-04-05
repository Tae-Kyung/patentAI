import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'

const updateProgramSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  year: z.number().int().min(2020).max(2030).optional(),
  round: z.number().int().min(1).optional(),
  description: z.string().nullable().optional(),
  start_date: z.string().nullable().optional(),
  end_date: z.string().nullable().optional(),
  status: z.enum(['preparing', 'active', 'completed', 'archived']).optional(),
})

interface RouteContext {
  params: Promise<{ id: string }>
}

// GET: 프로그램 상세
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    await requireAdmin()
    const { id } = await context.params

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('bi_programs')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) {
      return errorResponse('프로그램을 찾을 수 없습니다.', 404)
    }

    return successResponse(data)
  } catch (error) {
    return handleApiError(error)
  }
}

// PATCH: 프로그램 수정
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    await requireAdmin()
    const { id } = await context.params

    const body = await request.json()
    const validatedData = updateProgramSchema.parse(body)

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('bi_programs')
      .update({ ...validatedData, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Program update error:', error.message)
      return errorResponse('프로그램 수정에 실패했습니다.', 500)
    }

    return successResponse(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues[0].message, 400, 'VALIDATION_ERROR')
    }
    return handleApiError(error)
  }
}
