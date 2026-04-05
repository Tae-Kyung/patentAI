import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'
import { logAudit, extractRequestInfo } from '@/lib/security/audit'

// POST: 기관 승인
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin()
    const { id } = await context.params

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('bi_institutions')
      .update({
        is_approved: true,
        approved_at: new Date().toISOString(),
        approved_by: admin.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Institution approve error:', error.message)
      return errorResponse('기관 승인에 실패했습니다.', 500)
    }

    const { ipAddress, userAgent } = extractRequestInfo(request)
    await logAudit({
      userId: admin.id,
      action: 'institution_approve',
      resourceType: 'institution',
      resourceId: id,
      ipAddress,
      userAgent,
    })

    return successResponse(data)
  } catch (error) {
    return handleApiError(error)
  }
}
