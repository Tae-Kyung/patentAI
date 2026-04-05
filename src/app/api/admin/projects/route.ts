import { NextRequest } from 'next/server'
import { requireRole } from '@/lib/auth/guards'
import { createServiceClient } from '@/lib/supabase/service'
import { successResponse, handleApiError } from '@/lib/utils/api-response'

// GET: 프로젝트 검색 (관리자용)
export async function GET(request: NextRequest) {
  try {
    await requireRole(['admin'])

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)

    const supabase = createServiceClient()

    let dbQuery = supabase
      .from('bi_projects')
      .select('id, name, current_stage, user_id')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (query.trim()) {
      dbQuery = dbQuery.ilike('name', `%${query.trim()}%`)
    }

    const { data: projects, error } = await dbQuery

    if (error) {
      console.error('Admin projects search error:', error.message)
    }

    // 프로젝트 소유자 이름 조회
    const projectList = projects || []
    const userIds = [...new Set(projectList.map((p) => p.user_id))]

    let userMap: Record<string, string> = {}
    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from('bi_users')
        .select('id, name, email')
        .in('id', userIds)
      for (const u of users || []) {
        userMap[u.id] = u.name || u.email
      }
    }

    const result = projectList.map((p) => ({
      id: p.id,
      name: p.name,
      current_stage: p.current_stage,
      owner_name: userMap[p.user_id] || '-',
    }))

    return successResponse(result)
  } catch (error) {
    return handleApiError(error)
  }
}
