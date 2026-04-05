import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'

const paramsSchema = z.object({
  userId: z.string().uuid(),
})

// GET: 특정 사용자의 크레딧 히스토리 조회 (관리자 전용)
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

    // 총 건수 조회
    const { count, error: countError } = await supabase
      .from('bi_credit_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    if (countError) throw countError

    // 크레딧 로그 조회
    const { data: logs, error } = await supabase
      .from('bi_credit_logs')
      .select('id, amount, balance_after, reason, project_id, created_by, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error

    // created_by에 해당하는 관리자 이름 조회
    const adminIds = [...new Set((logs || []).filter(l => l.created_by && l.created_by !== userId).map(l => l.created_by!))]
    let adminMap: Record<string, string> = {}

    if (adminIds.length > 0) {
      const { data: admins } = await supabase
        .from('bi_users')
        .select('id, name, email')
        .in('id', adminIds)

      if (admins) {
        adminMap = Object.fromEntries(admins.map(a => [a.id, a.name || a.email]))
      }
    }

    // project_id에 해당하는 프로젝트 이름 조회
    const projectIds = [...new Set((logs || []).filter(l => l.project_id).map(l => l.project_id!))]
    let projectMap: Record<string, string> = {}

    if (projectIds.length > 0) {
      const { data: projects } = await supabase
        .from('bi_projects')
        .select('id, name')
        .in('id', projectIds)

      if (projects) {
        projectMap = Object.fromEntries(projects.map(p => [p.id, p.name]))
      }
    }

    const enrichedLogs = (logs || []).map(log => ({
      ...log,
      created_by_name: log.created_by ? adminMap[log.created_by] || null : null,
      project_name: log.project_id ? projectMap[log.project_id] || null : null,
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
