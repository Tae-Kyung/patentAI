import { NextRequest } from 'next/server'
import { requireInstitutionAccess } from '@/lib/auth/institution'
import { createServiceClient } from '@/lib/supabase/service'
import { handleApiError, paginatedResponse } from '@/lib/utils/api-response'
import { parsePagination } from '@/lib/security/pagination'
import type { MappingStatus } from '@/types/database'

// GET: 관할 프로젝트 목록
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const { institutionId } = await requireInstitutionAccess(searchParams.get('institution_id'))
    const { page, limit } = parsePagination(searchParams)
    const status = searchParams.get('status')
    const offset = (page - 1) * limit

    const supabase = createServiceClient()

    // 매핑된 프로젝트 ID 조회
    let mappingQuery = supabase
      .from('bi_project_institution_maps')
      .select('project_id')
      .eq('institution_id', institutionId)

    if (status) mappingQuery = mappingQuery.eq('status', status as MappingStatus)

    const { data: mappings } = await mappingQuery
    const projectIds = (mappings || []).map((m) => m.project_id)

    if (projectIds.length === 0) {
      return paginatedResponse([], 0, page, limit)
    }

    const { count } = await supabase
      .from('bi_projects')
      .select('*', { count: 'exact', head: true })
      .in('id', projectIds)

    const { data: projects, error } = await supabase
      .from('bi_projects')
      .select('*')
      .in('id', projectIds)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Institution projects error:', error.message)
    }

    // Fetch user info separately (FK join not supported by generated types)
    const projectRows = projects || []
    const userIds = [...new Set(projectRows.map((p) => p.user_id))]

    let userMap: Record<string, { id: string; name: string | null; email: string }> = {}
    if (userIds.length > 0) {
      const { data: users } = await supabase
        .from('bi_users')
        .select('id, name, email')
        .in('id', userIds)
      for (const u of users || []) {
        userMap[u.id] = u
      }
    }

    // Fetch mentor counts per project
    const pagedProjectIds = projectRows.map((p) => p.id)
    let mentorCountMap: Record<string, number> = {}
    if (pagedProjectIds.length > 0) {
      const { data: matchCounts } = await supabase
        .from('bi_mentor_matches')
        .select('project_id')
        .in('project_id', pagedProjectIds)
        .neq('status', 'cancelled')
      for (const m of matchCounts || []) {
        mentorCountMap[m.project_id] = (mentorCountMap[m.project_id] || 0) + 1
      }
    }

    const enriched = projectRows.map((p) => ({
      ...p,
      user: userMap[p.user_id] || null,
      mentor_count: mentorCountMap[p.id] || 0,
    }))

    return paginatedResponse(enriched, count || 0, page, limit)
  } catch (error) {
    return handleApiError(error)
  }
}
