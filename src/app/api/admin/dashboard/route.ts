import { requireAdmin } from '@/lib/auth/guards'
import { createServiceClient } from '@/lib/supabase/service'
import { successResponse, handleApiError } from '@/lib/utils/api-response'

export async function GET() {
  try {
    await requireAdmin()

    const supabase = createServiceClient()

    const [projectsResult, creditLogsResult] = await Promise.all([
      supabase.from('patentai_patent_projects').select('status'),
      supabase.from('patentai_credit_logs').select('amount').order('created_at', { ascending: false }),
    ])

    const projects = projectsResult.data || []
    const projectsByStatus: Record<string, number> = {}
    for (const p of projects) {
      projectsByStatus[p.status] = (projectsByStatus[p.status] || 0) + 1
    }

    const creditLogs = creditLogsResult.data || []
    const totalDistributed = creditLogs.filter(l => l.amount > 0).reduce((s, l) => s + l.amount, 0)
    const totalConsumed = creditLogs.filter(l => l.amount < 0).reduce((s, l) => s + Math.abs(l.amount), 0)

    // 사용자 수 (auth.users via service role)
    const { data: { users } } = await supabase.auth.admin.listUsers({ perPage: 1 })
    const totalUsers = users ? (await supabase.auth.admin.listUsers()).data?.users?.length ?? 0 : 0

    return successResponse({
      totalProjects: projects.length,
      projectsByStatus,
      totalUsers,
      creditStats: { totalDistributed, totalConsumed },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
