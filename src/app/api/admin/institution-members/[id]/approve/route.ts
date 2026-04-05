import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'
import { logAudit, extractRequestInfo } from '@/lib/security/audit'

// POST: 기관 담당자 승인
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin()
    const { id } = await context.params

    const supabase = await createClient()

    // 담당자 멤버십 조회
    const { data: member, error: fetchError } = await supabase
      .from('bi_institution_members')
      .select('*, user:user_id(id, email, name, role)')
      .eq('id', id)
      .single()

    if (fetchError || !member) {
      return errorResponse('기관 담당자를 찾을 수 없습니다.', 404)
    }

    // 멤버십 승인
    const { error: updateError } = await supabase
      .from('bi_institution_members')
      .update({
        is_approved: true,
        approved_at: new Date().toISOString(),
        approved_by: admin.id,
      })
      .eq('id', id)

    if (updateError) {
      console.error('Member approve error:', updateError.message)
      return errorResponse('담당자 승인에 실패했습니다.', 500)
    }

    // 사용자 계정도 승인
    await supabase
      .from('bi_users')
      .update({
        is_approved: true,
        approved_at: new Date().toISOString(),
      })
      .eq('id', member.user_id)

    const { ipAddress, userAgent } = extractRequestInfo(request)
    await logAudit({
      userId: admin.id,
      action: 'institution_member_approve',
      resourceType: 'institution_member',
      resourceId: id,
      ipAddress,
      userAgent,
    })

    return successResponse({ message: '기관 담당자가 승인되었습니다.' })
  } catch (error) {
    return handleApiError(error)
  }
}
