import { NextRequest } from 'next/server'
import { requireInstitutionAccess } from '@/lib/auth/institution'
import { createServiceClient } from '@/lib/supabase/service'
import { handleApiError, paginatedResponse } from '@/lib/utils/api-response'
import { parsePagination } from '@/lib/security/pagination'
import type { ReportStatus } from '@/types/database'

// GET: 제출된 보고서 목록
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const { institutionId } = await requireInstitutionAccess(searchParams.get('institution_id'))
    const { page, limit } = parsePagination(searchParams)
    const status = searchParams.get('status')
    const offset = (page - 1) * limit

    const supabase = createServiceClient()

    // 기관 소속 멘토 매칭 기반 보고서 조회
    const { data: matches } = await supabase
      .from('bi_mentor_matches')
      .select('id')
      .eq('institution_id', institutionId)

    const matchIds = (matches || []).map((m) => m.id)

    if (matchIds.length === 0) {
      return paginatedResponse([], 0, page, limit)
    }

    let countQuery = supabase
      .from('bi_mentoring_reports')
      .select('*', { count: 'exact', head: true })
      .in('match_id', matchIds)

    if (status) countQuery = countQuery.eq('status', status as ReportStatus)

    const { count } = await countQuery

    let dataQuery = supabase
      .from('bi_mentoring_reports')
      .select('*')
      .in('match_id', matchIds)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) dataQuery = dataQuery.eq('status', status as ReportStatus)

    const { data, error } = await dataQuery

    if (error) {
      console.error('Reports query error:', error.message)
    }

    // Fetch match details separately (FK join not supported by generated types)
    const reports = data || []
    const reportMatchIds = [...new Set(reports.map((r) => r.match_id))]
    let matchMap: Record<string, { id: string; mentor_id: string; project_id: string }> = {}
    if (reportMatchIds.length > 0) {
      const { data: matchRows } = await supabase
        .from('bi_mentor_matches')
        .select('*')
        .in('id', reportMatchIds)
      for (const m of matchRows || []) {
        matchMap[m.id] = { id: m.id, mentor_id: m.mentor_id, project_id: m.project_id }
      }
    }

    // Fetch mentor and project info
    const mentorIds = [...new Set(Object.values(matchMap).map((m) => m.mentor_id))]
    const projectIds = [...new Set(Object.values(matchMap).map((m) => m.project_id))]

    let mentorMap: Record<string, { id: string; name: string | null }> = {}
    let projectMap: Record<string, { id: string; name: string }> = {}

    if (mentorIds.length > 0) {
      const { data: mentors } = await supabase
        .from('bi_users')
        .select('id, name')
        .in('id', mentorIds)
      for (const m of mentors || []) {
        mentorMap[m.id] = m
      }
    }
    if (projectIds.length > 0) {
      const { data: projects } = await supabase
        .from('bi_projects')
        .select('id, name')
        .in('id', projectIds)
      for (const p of projects || []) {
        projectMap[p.id] = p
      }
    }

    // Fetch sessions for each match
    let sessionMap: Record<string, Array<{ id: string; round_number: number; session_type: string; session_date: string | null; duration_minutes: number | null; status: string; comments: unknown }>> = {}
    if (reportMatchIds.length > 0) {
      const { data: sessions } = await supabase
        .from('bi_mentoring_sessions')
        .select('id, match_id, round_number, session_type, session_date, duration_minutes, status, comments')
        .in('match_id', reportMatchIds)
        .order('round_number', { ascending: true })

      for (const s of sessions || []) {
        if (!sessionMap[s.match_id]) sessionMap[s.match_id] = []
        sessionMap[s.match_id].push({
          id: s.id,
          round_number: s.round_number,
          session_type: s.session_type,
          session_date: s.session_date,
          duration_minutes: s.duration_minutes,
          status: s.status,
          comments: s.comments,
        })
      }
    }

    const enriched = reports.map((r) => {
      const match = matchMap[r.match_id]
      return {
        ...r,
        match: match ? {
          ...match,
          mentor: mentorMap[match.mentor_id] || null,
          project: projectMap[match.project_id] || null,
        } : null,
        sessions: sessionMap[r.match_id] || [],
      }
    })

    return paginatedResponse(enriched, count || 0, page, limit)
  } catch (error) {
    return handleApiError(error)
  }
}
