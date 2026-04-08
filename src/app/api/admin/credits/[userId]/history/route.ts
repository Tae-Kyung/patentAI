import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'

const paramsSchema = z.object({ userId: z.string().uuid() })

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    await requireAdmin()

    const { userId } = paramsSchema.parse(await params)

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')))
    const offset = (page - 1) * limit

    const supabase = await createClient()

    const { count } = await supabase
      .from('patentai_credit_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    const { data: logs, error } = await supabase
      .from('patentai_credit_logs')
      .select('id, amount, balance_after, reason, project_id, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error

    const projectIds = [...new Set((logs || []).filter(l => l.project_id).map(l => l.project_id!))]
    let projectMap: Record<string, string> = {}

    if (projectIds.length > 0) {
      const { data: projects } = await supabase
        .from('patentai_patent_projects')
        .select('id, title')
        .in('id', projectIds)

      if (projects) projectMap = Object.fromEntries(projects.map(p => [p.id, p.title]))
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
    if (error instanceof z.ZodError) {
      return errorResponse('유효하지 않은 사용자 ID입니다.', 400, 'VALIDATION_ERROR')
    }
    return handleApiError(error)
  }
}
