import { NextRequest } from 'next/server'
import { requireMentor } from '@/lib/auth/guards'
import { createServiceClient } from '@/lib/supabase/service'
import { handleApiError, paginatedResponse } from '@/lib/utils/api-response'
import { parsePagination } from '@/lib/security/pagination'
import type { PayoutStatus } from '@/types/database'

// GET: 멘토 수당 지급 내역 조회
export async function GET(request: NextRequest) {
  try {
    const user = await requireMentor()

    const { searchParams } = new URL(request.url)
    const { page, limit } = parsePagination(searchParams)
    const status = searchParams.get('status')
    const offset = (page - 1) * limit

    const supabase = createServiceClient()

    // 카운트 쿼리
    let countQuery = supabase
      .from('bi_mentor_payouts')
      .select('*', { count: 'exact', head: true })
      .eq('mentor_id', user.id)

    if (status) countQuery = countQuery.eq('status', status as PayoutStatus)

    const { count } = await countQuery

    // 데이터 쿼리
    let dataQuery = supabase
      .from('bi_mentor_payouts')
      .select('*')
      .eq('mentor_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) dataQuery = dataQuery.eq('status', status as PayoutStatus)

    const { data, error } = await dataQuery

    if (error) {
      console.error('Mentor payouts query error:', error.message)
    }

    const payouts = data || []

    // report_id → match_id → project name 조회
    const reportIds = [...new Set(payouts.map(p => p.report_id).filter(Boolean))]
    let projectNameMap: Record<string, string> = {}

    if (reportIds.length > 0) {
      const { data: reports } = await supabase
        .from('bi_mentoring_reports')
        .select('id, match_id')
        .in('id', reportIds)

      const matchIds = [...new Set((reports || []).map(r => r.match_id).filter(Boolean))]
      if (matchIds.length > 0) {
        const { data: matches } = await supabase
          .from('bi_mentor_matches')
          .select('id, project_id')
          .in('id', matchIds)

        const projectIds = [...new Set((matches || []).map(m => m.project_id).filter(Boolean))]
        if (projectIds.length > 0) {
          const { data: projects } = await supabase
            .from('bi_projects')
            .select('id, name')
            .in('id', projectIds)

          const projectLookup: Record<string, string> = {}
          for (const p of projects || []) projectLookup[p.id] = p.name

          const matchLookup: Record<string, string> = {}
          for (const m of matches || []) matchLookup[m.id] = m.project_id

          for (const r of reports || []) {
            const pid = matchLookup[r.match_id]
            if (pid) projectNameMap[r.id] = projectLookup[pid] || ''
          }
        }
      }
    }

    const enriched = payouts.map(p => ({
      ...p,
      project_name: projectNameMap[p.report_id] || null,
    }))

    return paginatedResponse(enriched, count || 0, page, limit)
  } catch (error) {
    return handleApiError(error)
  }
}
