import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { successResponse, handleApiError } from '@/lib/utils/api-response'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const offset = (page - 1) * limit

    const supabase = await createClient()

    const { count } = await supabase
      .from('patentai_credit_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    const { data: logs, error } = await supabase
      .from('patentai_credit_logs')
      .select('id, amount, balance_after, reason, project_id, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error

    // project_id에 해당하는 프로젝트 제목 조회
    const projectIds = [...new Set((logs || []).filter(l => l.project_id).map(l => l.project_id!))]
    let projectMap: Record<string, string> = {}

    if (projectIds.length > 0) {
      const { data: projects } = await supabase
        .from('patentai_patent_projects')
        .select('id, title')
        .in('id', projectIds)

      if (projects) {
        projectMap = Object.fromEntries(projects.map(p => [p.id, p.title]))
      }
    }

    const enrichedLogs = (logs || []).map(log => ({
      ...log,
      project_name: log.project_id ? projectMap[log.project_id] ?? null : null,
    }))

    return successResponse({
      logs: enrichedLogs,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    })
  } catch (error) {
    return handleApiError(error)
  }
}
