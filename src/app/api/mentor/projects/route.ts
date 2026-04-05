import { NextRequest } from 'next/server'
import { requireMentor } from '@/lib/auth/guards'
import { createServiceClient } from '@/lib/supabase/service'
import { handleApiError, paginatedResponse } from '@/lib/utils/api-response'
import { parsePagination } from '@/lib/security/pagination'
import type { MentorMatchStatus } from '@/types/database'

// GET: 멘토에게 배정된 프로젝트 목록
export async function GET(request: NextRequest) {
  try {
    const user = await requireMentor()

    const { searchParams } = new URL(request.url)
    const { page, limit } = parsePagination(searchParams)
    const status = searchParams.get('status')
    const offset = (page - 1) * limit

    const supabase = createServiceClient()

    // 멘토에게 매칭된 프로젝트 ID 조회
    let matchQuery = supabase
      .from('bi_mentor_matches')
      .select('project_id, mentor_role, status')
      .eq('mentor_id', user.id)

    if (status) matchQuery = matchQuery.eq('status', status as MentorMatchStatus)

    const { data: matches } = await matchQuery
    const matchList = matches || []
    const projectIds = [...new Set(matchList.map((m) => m.project_id))]

    if (projectIds.length === 0) {
      return paginatedResponse([], 0, page, limit)
    }

    // 프로젝트 수 카운트
    const { count } = await supabase
      .from('bi_projects')
      .select('*', { count: 'exact', head: true })
      .in('id', projectIds)

    // 프로젝트 상세 조회
    const { data: projects, error } = await supabase
      .from('bi_projects')
      .select('*')
      .in('id', projectIds)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Mentor projects query error:', error.message)
    }

    const projectRows = projects || []

    // 프로젝트 소유자 정보 별도 조회
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

    // 매칭 정보를 project_id 기준으로 매핑
    const matchMap: Record<string, { mentor_role: string; status: string }> = {}
    for (const m of matchList) {
      matchMap[m.project_id] = { mentor_role: m.mentor_role, status: m.status }
    }

    // 프로젝트-기관 매핑 조회
    const { data: mappings } = await supabase
      .from('bi_project_institution_maps')
      .select('project_id, institution_id')
      .in('project_id', projectIds)
      .eq('status', 'approved')

    let institutionMap: Record<string, { id: string; name: string }> = {}
    const mappingList = mappings || []
    if (mappingList.length > 0) {
      const institutionIds = [...new Set(mappingList.map((m) => m.institution_id))]
      const { data: institutions } = await supabase
        .from('bi_institutions')
        .select('id, name')
        .in('id', institutionIds)

      const instLookup: Record<string, { id: string; name: string }> = {}
      for (const inst of institutions || []) {
        instLookup[inst.id] = inst
      }

      for (const m of mappingList) {
        if (instLookup[m.institution_id]) {
          institutionMap[m.project_id] = instLookup[m.institution_id]
        }
      }
    }

    // 매칭 ID 매핑 (보고서 조회용)
    const matchIdMap: Record<string, string> = {}
    for (const m of matchList) {
      if (!matchIdMap[m.project_id]) {
        // match_id를 별도 조회
      }
    }
    // match_id 조회 (matchList에는 project_id만 있으므로)
    const { data: matchDetails } = await supabase
      .from('bi_mentor_matches')
      .select('id, project_id')
      .eq('mentor_id', user.id)
      .in('project_id', projectIds)

    const matchIdByProject: Record<string, string> = {}
    for (const m of matchDetails || []) {
      matchIdByProject[m.project_id] = m.id
    }

    // 보고서 상태 조회
    const matchIdsForReports = Object.values(matchIdByProject)
    let reportMap: Record<string, { status: string; session_count: number }> = {}
    if (matchIdsForReports.length > 0) {
      const { data: reports } = await supabase
        .from('bi_mentoring_reports')
        .select('match_id, status')
        .in('match_id', matchIdsForReports)

      // 세션 수 조회
      const { data: sessionCounts } = await supabase
        .from('bi_mentoring_sessions')
        .select('match_id')
        .in('match_id', matchIdsForReports)

      const sessionCountMap: Record<string, number> = {}
      for (const s of sessionCounts || []) {
        sessionCountMap[s.match_id] = (sessionCountMap[s.match_id] || 0) + 1
      }

      for (const r of reports || []) {
        // match_id → project_id 역매핑
        const pid = Object.entries(matchIdByProject).find(([, mid]) => mid === r.match_id)?.[0]
        if (pid) {
          reportMap[pid] = {
            status: r.status,
            session_count: sessionCountMap[r.match_id] || 0,
          }
        }
      }
    }

    // 프로젝트에 소유자 + 매칭 + 기관 + 보고서 정보 결합
    const enriched = projectRows.map((p) => ({
      ...p,
      user: userMap[p.user_id] || null,
      match: matchMap[p.id] || null,
      institution: institutionMap[p.id] || null,
      report: reportMap[p.id] || null,
    }))

    return paginatedResponse(enriched, count || 0, page, limit)
  } catch (error) {
    return handleApiError(error)
  }
}
