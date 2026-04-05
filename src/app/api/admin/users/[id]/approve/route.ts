import { NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/auth/guards'
import { createServiceClient } from '@/lib/supabase/service'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()
    const { id } = await params
    const { action } = await request.json()

    if (!['approve', 'reject'].includes(action)) {
      return errorResponse('Invalid action', 400)
    }

    const supabase = createServiceClient()

    // 사용자 역할 조회
    const { data: user } = await supabase
      .from('bi_users')
      .select('role')
      .eq('id', id)
      .single()

    if (action === 'approve') {
      const now = new Date().toISOString()
      const { error } = await supabase
        .from('bi_users')
        .update({
          is_approved: true,
          approved_at: now,
        })
        .eq('id', id)

      if (error) throw error

      // 멘토인 경우 멘토 프로필도 승인
      if (user?.role === 'mentor') {
        await supabase
          .from('bi_mentor_profiles')
          .update({ is_approved: true, approved_at: now })
          .eq('user_id', id)
      }

      return successResponse({ message: 'User approved' })
    } else {
      // reject: 미승인 상태 유지
      const { error } = await supabase
        .from('bi_users')
        .update({
          is_approved: false,
          approved_at: null,
        })
        .eq('id', id)

      if (error) throw error

      // 멘토인 경우 멘토 프로필도 미승인
      if (user?.role === 'mentor') {
        await supabase
          .from('bi_mentor_profiles')
          .update({ is_approved: false, approved_at: null })
          .eq('user_id', id)
      }

      return successResponse({ message: 'User rejected' })
    }
  } catch (error) {
    return handleApiError(error)
  }
}
