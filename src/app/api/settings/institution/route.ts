import { z } from 'zod'
import { requireInstitutionAccess } from '@/lib/auth/institution'
import { createClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'

const updateInstitutionSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  contact_email: z.string().email().nullable().optional(),
  contact_phone: z.string().max(30).nullable().optional(),
  address: z.string().max(500).nullable().optional(),
})

// GET: 소속 기관 정보 조회
export async function GET() {
  try {
    const { institutionId } = await requireInstitutionAccess()
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('bi_institutions')
      .select('id, name, region, type, address, contact_email, contact_phone')
      .eq('id', institutionId)
      .single()

    if (error || !data) {
      return errorResponse('기관 정보를 찾을 수 없습니다.', 404)
    }

    return successResponse(data)
  } catch (error) {
    return handleApiError(error)
  }
}

// PATCH: 기관 정보 수정
export async function PATCH(request: Request) {
  try {
    const { institutionId } = await requireInstitutionAccess()
    const body = await request.json()
    const parsed = updateInstitutionSchema.safeParse(body)

    if (!parsed.success) {
      return errorResponse('입력값이 올바르지 않습니다.', 400)
    }

    const supabase = await createClient()
    const { error } = await supabase
      .from('bi_institutions')
      .update({ ...parsed.data, updated_at: new Date().toISOString() })
      .eq('id', institutionId)

    if (error) {
      return errorResponse('기관 정보 업데이트에 실패했습니다.', 500)
    }

    return successResponse({ message: 'ok' })
  } catch (error) {
    return handleApiError(error)
  }
}
