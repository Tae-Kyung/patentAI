import { NextRequest } from 'next/server'
import { requireInstitutionAccess } from '@/lib/auth/institution'
import { createServiceClient } from '@/lib/supabase/service'
import { successResponse, handleApiError } from '@/lib/utils/api-response'

// GET: 기관 종합 통계
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const { institutionId } = await requireInstitutionAccess(searchParams.get('institution_id'))

    const supabase = createServiceClient()

    const [projectsRes, mentorsRes, sessionsRes, pendingPayoutsRes] = await Promise.all([
      supabase
        .from('bi_project_institution_maps')
        .select('*', { count: 'exact', head: true })
        .eq('institution_id', institutionId),
      supabase
        .from('bi_mentor_institution_pool')
        .select('*', { count: 'exact', head: true })
        .eq('institution_id', institutionId),
      supabase
        .from('bi_mentoring_sessions')
        .select('id, match:match_id!inner(id, project_id)')
        .eq('status', 'acknowledged'),
      supabase
        .from('bi_mentor_payouts')
        .select('*', { count: 'exact', head: true })
        .eq('institution_id', institutionId)
        .eq('status', 'pending'),
    ])

    // 전체 세션 수 + 대기 수당 총액 병렬 조회
    const [{ count: totalSessionCount }, { data: pendingPayoutData }] = await Promise.all([
      supabase.from('bi_mentoring_sessions').select('*', { count: 'exact', head: true }),
      supabase.from('bi_mentor_payouts').select('amount').eq('institution_id', institutionId).eq('status', 'pending'),
    ])

    const pendingTotalAmount = (pendingPayoutData || []).reduce((sum, p) => sum + (p.amount || 0), 0)

    // 프로젝트별 멘토링 현황 조회
    const { data: projectMaps } = await supabase
      .from('bi_project_institution_maps')
      .select('project_id')
      .eq('institution_id', institutionId)

    const projectIds = (projectMaps || []).map((m) => m.project_id)

    let mentoringOverview: Array<{
      project: { id: string; name: string; current_stage: string }
      mentors: Array<{
        id: string
        name: string | null
        role: string
        matchStatus: string
        reportStatus: string | null
        reportId: string | null
      }>
    }> = []

    if (projectIds.length > 0) {
      // 프로젝트 정보
      const { data: projects } = await supabase
        .from('bi_projects')
        .select('id, name, current_stage')
        .in('id', projectIds)
        .order('created_at', { ascending: false })
        .limit(20)

      // 매칭 정보
      const { data: matches } = await supabase
        .from('bi_mentor_matches')
        .select('id, project_id, mentor_id, mentor_role, status')
        .eq('institution_id', institutionId)
        .in('project_id', projectIds)

      const matchRows = matches || []
      const matchIds = matchRows.map((m) => m.id)
      const mentorIds = [...new Set(matchRows.map((m) => m.mentor_id))]

      // 멘토 이름, 보고서 상태 병렬 조회
      let mentorMap: Record<string, { name: string | null }> = {}
      let reportMap: Record<string, { status: string; id: string }> = {}

      if (mentorIds.length > 0) {
        const [{ data: mentorUsers }, { data: reports }] = await Promise.all([
          supabase.from('bi_users').select('id, name').in('id', mentorIds),
          matchIds.length > 0
            ? supabase.from('bi_mentoring_reports').select('id, match_id, status').in('match_id', matchIds)
            : Promise.resolve({ data: [] as { id: string; match_id: string; status: string }[] }),
        ])
        for (const u of mentorUsers || []) mentorMap[u.id] = { name: u.name }
        for (const r of reports || []) reportMap[r.match_id] = { status: r.status, id: r.id }
      }

      // 프로젝트별 조합
      mentoringOverview = (projects || []).map((p) => {
        const projectMatches = matchRows.filter((m) => m.project_id === p.id)
        return {
          project: { id: p.id, name: p.name, current_stage: p.current_stage },
          mentors: projectMatches.map((m) => ({
            id: m.mentor_id,
            name: mentorMap[m.mentor_id]?.name || null,
            role: m.mentor_role,
            matchStatus: m.status,
            reportStatus: reportMap[m.id]?.status || null,
            reportId: reportMap[m.id]?.id || null,
          })),
        }
      })
    }

    return successResponse({
      projectCount: projectsRes.count || 0,
      mentorCount: mentorsRes.count || 0,
      sessionCount: totalSessionCount || 0,
      completedSessions: sessionsRes.data?.length || 0,
      pendingPayouts: {
        count: pendingPayoutsRes.count || 0,
        totalAmount: pendingTotalAmount,
      },
      mentoringOverview,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
