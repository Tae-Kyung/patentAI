import { NextRequest } from 'next/server'
import { requireInstitutionAccess } from '@/lib/auth/institution'
import { createServiceClient } from '@/lib/supabase/service'
import { handleApiError, paginatedResponse } from '@/lib/utils/api-response'
import { parsePagination } from '@/lib/security/pagination'

// GET: 소속 멘토 목록
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const { institutionId } = await requireInstitutionAccess(searchParams.get('institution_id'))
    const { page, limit } = parsePagination(searchParams)
    const offset = (page - 1) * limit
    const docsFilter = searchParams.get('docs_filter') // 'all' | 'incomplete' | 'confirmed'

    const supabase = createServiceClient()

    // 전체 풀 조회 (필터링을 위해 페이징 전에 전체 조회)
    const { data: allPoolData } = await supabase
      .from('bi_mentor_institution_pool')
      .select('*')
      .eq('institution_id', institutionId)
      .order('created_at', { ascending: false })

    const allPool = allPoolData || []
    const allMentorIds = [...new Set(allPool.map((p) => p.mentor_id))]

    let mentorMap: Record<string, { id: string; name: string | null; email: string }> = {}
    let profileMap: Record<string, { specialty: string[]; is_approved: boolean; is_active: boolean; documents_complete: boolean; documents_confirmed: boolean }> = {}

    if (allMentorIds.length > 0) {
      const [{ data: mentors }, { data: profilesRaw }] = await Promise.all([
        supabase.from('bi_users').select('id, name, email').in('id', allMentorIds),
        supabase.from('bi_mentor_profiles').select('*').in('user_id', allMentorIds),
      ])
      for (const m of mentors || []) {
        mentorMap[m.id] = m
      }
      for (const pAny of (profilesRaw || []) as unknown as Record<string, unknown>[]) {
        const documents_complete = !!(pAny.resume_url && pAny.bank_account_url && pAny.privacy_consent_url && pAny.id_card_url)
        profileMap[pAny.user_id as string] = {
          specialty: (pAny.specialty as string[]) || [],
          is_approved: !!(pAny.is_approved),
          is_active: !!(pAny.is_active),
          documents_complete,
          documents_confirmed: !!(pAny.documents_confirmed),
        }
      }
    }

    // docs_filter 적용
    let filteredPool = allPool
    if (docsFilter === 'incomplete') {
      filteredPool = allPool.filter((p) => {
        const profile = profileMap[p.mentor_id]
        return !profile || !profile.documents_complete
      })
    } else if (docsFilter === 'confirmed') {
      filteredPool = allPool.filter((p) => {
        const profile = profileMap[p.mentor_id]
        return profile && profile.documents_confirmed
      })
    }

    const total = filteredPool.length
    const pool = filteredPool.slice(offset, offset + limit)
    const mentorIds = [...new Set(pool.map((p) => p.mentor_id))]

    // 멘토별 활동 통계: 매칭, 세션, 보고서
    let activityMap: Record<string, {
      projects: Array<{ id: string; name: string; mentorRole: string; matchStatus: string; totalSessions: number; completedSessions: number; reportStatus: string | null }>
      totalProjects: number
      totalSessions: number
      completedSessions: number
      reportsSubmitted: number
      reportsTotal: number
    }> = {}

    if (mentorIds.length > 0) {
      const { data: matches } = await supabase
        .from('bi_mentor_matches')
        .select('id, project_id, mentor_id, mentor_role, status')
        .eq('institution_id', institutionId)
        .in('mentor_id', mentorIds)

      const matchRows = matches || []
      const matchIds = matchRows.map((m) => m.id)
      const projectIds = [...new Set(matchRows.map((m) => m.project_id))]

      // 프로젝트명, 세션, 보고서 병렬 조회
      const [projectsRes, sessionsRes, reportsRes] = await Promise.all([
        projectIds.length > 0
          ? supabase.from('bi_projects').select('id, name').in('id', projectIds)
          : Promise.resolve({ data: [] as { id: string; name: string }[] }),
        matchIds.length > 0
          ? supabase.from('bi_mentoring_sessions').select('match_id, status').in('match_id', matchIds)
          : Promise.resolve({ data: [] as { match_id: string; status: string }[] }),
        matchIds.length > 0
          ? supabase.from('bi_mentoring_reports').select('match_id, status').in('match_id', matchIds)
          : Promise.resolve({ data: [] as { match_id: string; status: string }[] }),
      ])

      const projectNameMap: Record<string, string> = {}
      for (const p of projectsRes.data || []) projectNameMap[p.id] = p.name

      const sessionsByMatch: Record<string, { total: number; completed: number }> = {}
      for (const s of sessionsRes.data || []) {
        if (!sessionsByMatch[s.match_id]) sessionsByMatch[s.match_id] = { total: 0, completed: 0 }
        sessionsByMatch[s.match_id].total++
        if (s.status === 'acknowledged') sessionsByMatch[s.match_id].completed++
      }

      const reportByMatch: Record<string, string> = {}
      for (const r of reportsRes.data || []) reportByMatch[r.match_id] = r.status

      // 멘토별 집계
      for (const mid of mentorIds) {
        const mentorMatches = matchRows.filter((m) => m.mentor_id === mid)
        const projects = mentorMatches.map((m) => {
          const sess = sessionsByMatch[m.id] || { total: 0, completed: 0 }
          return {
            id: m.project_id,
            name: projectNameMap[m.project_id] || '-',
            mentorRole: m.mentor_role,
            matchStatus: m.status,
            totalSessions: sess.total,
            completedSessions: sess.completed,
            reportStatus: reportByMatch[m.id] || null,
          }
        })
        const totalSessions = projects.reduce((s, p) => s + p.totalSessions, 0)
        const completedSessions = projects.reduce((s, p) => s + p.completedSessions, 0)
        const reportsTotal = projects.length
        const reportsSubmitted = projects.filter((p) => p.reportStatus === 'submitted' || p.reportStatus === 'confirmed').length

        activityMap[mid] = { projects, totalProjects: projects.length, totalSessions, completedSessions, reportsSubmitted, reportsTotal }
      }
    }

    const enriched = pool.map((p) => ({
      ...p,
      mentor: mentorMap[p.mentor_id] || null,
      profile: profileMap[p.mentor_id] || null,
      activity: activityMap[p.mentor_id] || { projects: [], totalProjects: 0, totalSessions: 0, completedSessions: 0, reportsSubmitted: 0, reportsTotal: 0 },
    }))

    return paginatedResponse(enriched, total, page, limit)
  } catch (error) {
    return handleApiError(error)
  }
}
