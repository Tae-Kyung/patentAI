import { requireMentor } from '@/lib/auth/guards'
import { createServiceClient } from '@/lib/supabase/service'
import { successResponse, handleApiError } from '@/lib/utils/api-response'

// GET: 멘토 수당 요약 조회
export async function GET() {
  try {
    const user = await requireMentor()
    const supabase = createServiceClient()

    // 전체 수당 내역 조회
    const { data: payouts, error } = await supabase
      .from('bi_mentor_payouts')
      .select('amount, status')
      .eq('mentor_id', user.id)

    if (error) {
      console.error('Mentor payouts summary error:', error.message)
    }

    const rows = payouts || []

    const totalAmount = rows.reduce((sum, p) => sum + (p.amount || 0), 0)
    const paidAmount = rows
      .filter((p) => p.status === 'paid')
      .reduce((sum, p) => sum + (p.amount || 0), 0)
    const pendingAmount = rows
      .filter((p) => p.status === 'pending')
      .reduce((sum, p) => sum + (p.amount || 0), 0)
    const approvedAmount = rows
      .filter((p) => p.status === 'approved' || p.status === 'processing')
      .reduce((sum, p) => sum + (p.amount || 0), 0)

    const totalCount = rows.length
    const paidCount = rows.filter((p) => p.status === 'paid').length
    const pendingCount = rows.filter((p) => p.status === 'pending').length
    const approvedCount = rows.filter(
      (p) => p.status === 'approved' || p.status === 'processing'
    ).length
    const cancelledCount = rows.filter((p) => p.status === 'cancelled').length

    // 멘토의 활성 매칭 조회
    const { data: matches } = await supabase
      .from('bi_mentor_matches')
      .select('id, project_id, unit_price, status, mentor_role')
      .eq('mentor_id', user.id)
      .neq('status', 'cancelled')

    // 프로젝트 이름 조회
    const projectIds = [...new Set((matches || []).map((m) => m.project_id))]
    let projectMap: Record<string, string> = {}
    if (projectIds.length > 0) {
      const { data: projects } = await supabase
        .from('bi_projects')
        .select('id, name')
        .in('id', projectIds)
      projectMap = (projects || []).reduce((acc, p) => {
        acc[p.id] = p.name
        return acc
      }, {} as Record<string, string>)
    }

    const mentoringProjects = (matches || []).map((m) => ({
      matchId: m.id,
      projectId: m.project_id,
      projectName: projectMap[m.project_id] || '-',
      unitPrice: m.unit_price,
      status: m.status,
      role: m.mentor_role,
    }))

    return successResponse({
      totalAmount,
      paidAmount,
      pendingAmount,
      approvedAmount,
      totalCount,
      paidCount,
      pendingCount,
      approvedCount,
      cancelledCount,
      mentoringProjects,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
