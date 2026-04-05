import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'

// GET: 멘토/관리자용 승인 대기 목록
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()

    const supabase = await createClient()

    // 사용자 역할 확인
    const { data: userProfile, error: userError } = await supabase
      .from('bi_users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userError) throw userError

    if (!userProfile || !['mentor', 'admin'].includes(userProfile.role)) {
      return errorResponse('멘토 또는 관리자만 접근할 수 있습니다.', 403)
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'pending'
    const gate = searchParams.get('gate')
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '10', 10)
    const offset = (page - 1) * limit

    type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'revision_requested'
    type GateType = 'gate_1' | 'gate_2' | 'gate_3' | 'gate_4'

    // 쿼리 빌드
    let query = supabase
      .from('bi_approvals')
      .select(`
        *,
        project:bi_projects!bi_approvals_project_id_fkey(
          id, name, current_stage, current_gate,
          user:bi_users!bi_projects_user_id_fkey(id, name, email)
        ),
        requester:bi_users!bi_approvals_requested_by_fkey(id, name, email),
        reviewer:bi_users!bi_approvals_reviewed_by_fkey(id, name, email)
      `, { count: 'exact' })
      .eq('status', status as ApprovalStatus)
      .order('requested_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (gate) {
      query = query.eq('gate', gate as GateType)
    }

    const { data: approvals, count, error } = await query

    if (error) throw error

    return successResponse({
      approvals: approvals || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
