import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireInstitutionAccess } from '@/lib/auth/institution'
import { createServiceClient } from '@/lib/supabase/service'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'

const schema = z.object({
  mentor_id: z.string().uuid(),
  confirmed: z.boolean(),
})

// POST: 멘토 서류 완비 확인/해제
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const { user, institutionId } = await requireInstitutionAccess(searchParams.get('institution_id'))

    const body = await request.json()
    const { mentor_id, confirmed } = schema.parse(body)

    const supabase = createServiceClient()

    // 해당 멘토가 기관 소속인지 확인
    const { data: poolEntry } = await supabase
      .from('bi_mentor_institution_pool')
      .select('mentor_id')
      .eq('institution_id', institutionId)
      .eq('mentor_id', mentor_id)
      .single()

    if (!poolEntry) {
      return errorResponse('기관 소속 멘토가 아닙니다.', 403)
    }

    // 확인 시 documents_complete 검증 (select('*')로 타입 오류 우회)
    if (confirmed) {
      const { data: profileRaw } = await supabase
        .from('bi_mentor_profiles')
        .select('*')
        .eq('user_id', mentor_id)
        .single()

      const profile = profileRaw as unknown as Record<string, unknown> | null
      if (!profile?.resume_url || !profile?.bank_account_url || !profile?.privacy_consent_url || !profile?.id_card_url) {
        return errorResponse('서류가 완비되지 않아 확인할 수 없습니다.', 400)
      }
    }

    // update 시 타입 오류 우회: 알려진 컬럼을 통해 업데이트 후 직접 SQL 방식 사용
    const updatePayload = confirmed
      ? { documents_confirmed: true, documents_confirmed_at: new Date().toISOString(), documents_confirmed_by: user.id }
      : { documents_confirmed: false, documents_confirmed_at: null as string | null, documents_confirmed_by: null as string | null }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('bi_mentor_profiles')
      .update(updatePayload)
      .eq('user_id', mentor_id)

    if (error) {
      console.error('Document confirm error:', error.message)
      return errorResponse('서류 확인 처리에 실패했습니다.', 500)
    }

    return successResponse({ mentor_id, documents_confirmed: confirmed })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues[0].message, 400, 'VALIDATION_ERROR')
    }
    return handleApiError(error)
  }
}
