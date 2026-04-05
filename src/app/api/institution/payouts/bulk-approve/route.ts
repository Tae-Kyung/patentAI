import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireInstitutionAccess } from '@/lib/auth/institution'
import { createServiceClient } from '@/lib/supabase/service'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'
import { logAudit, extractRequestInfo } from '@/lib/security/audit'

const bulkApproveSchema = z.object({
  payout_ids: z.array(z.string().uuid()).min(1).max(100),
})

// POST: 수당 일괄 승인
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const { user } = await requireInstitutionAccess(searchParams.get('institution_id'))

    const body = await request.json()
    const { payout_ids } = bulkApproveSchema.parse(body)

    const supabase = createServiceClient()

    const { data, error } = await supabase
      .from('bi_mentor_payouts')
      .update({
        status: 'approved',
        approved_by: user.id,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .in('id', payout_ids)
      .eq('status', 'pending')
      .select()

    if (error) {
      console.error('Bulk approve error:', error.message)
      return errorResponse('일괄 승인에 실패했습니다.', 500)
    }

    const { ipAddress, userAgent } = extractRequestInfo(request)
    await logAudit({
      userId: user.id,
      action: 'payout_bulk_approve',
      resourceType: 'payout',
      details: { count: data?.length || 0 },
      ipAddress,
      userAgent,
    })

    return successResponse({
      message: `${data?.length || 0}건이 승인되었습니다.`,
      count: data?.length || 0,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues[0].message, 400, 'VALIDATION_ERROR')
    }
    return handleApiError(error)
  }
}
