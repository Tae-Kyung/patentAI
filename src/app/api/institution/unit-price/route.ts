import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireInstitutionAccess } from '@/lib/auth/institution'
import { createServiceClient } from '@/lib/supabase/service'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'

const updateSchema = z.object({
  session_unit_price: z.number().int().min(0).max(10000000),
})

// GET: 현재 단가 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const { institutionId } = await requireInstitutionAccess(searchParams.get('institution_id'))

    const supabase = createServiceClient()

    const { data, error } = await supabase
      .from('bi_institutions')
      .select('session_unit_price')
      .eq('id', institutionId)
      .single()

    if (error) {
      return errorResponse('단가 정보를 불러올 수 없습니다.', 500)
    }

    return successResponse({ session_unit_price: data.session_unit_price })
  } catch (error) {
    return handleApiError(error)
  }
}

// PATCH: 단가 수정
export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const { institutionId } = await requireInstitutionAccess(searchParams.get('institution_id'))

    const body = await request.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) {
      return errorResponse('유효하지 않은 금액입니다.', 400)
    }

    const supabase = createServiceClient()

    const { data, error } = await supabase
      .from('bi_institutions')
      .update({ session_unit_price: parsed.data.session_unit_price })
      .eq('id', institutionId)
      .select('session_unit_price')
      .single()

    if (error) {
      return errorResponse('단가 수정에 실패했습니다.', 500)
    }

    return successResponse(data)
  } catch (error) {
    return handleApiError(error)
  }
}
