import { NextRequest } from 'next/server'
import { requireInstitutionAccess } from '@/lib/auth/institution'
import { createServiceClient } from '@/lib/supabase/service'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'

// GET: 보고서 상세 조회
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { searchParams } = new URL(request.url)
    const { institutionId } = await requireInstitutionAccess(searchParams.get('institution_id'))
    const { id: reportId } = await context.params

    const supabase = createServiceClient()

    // 보고서 조회
    const { data: report, error: reportError } = await supabase
      .from('bi_mentoring_reports')
      .select('*')
      .eq('id', reportId)
      .single()

    if (reportError || !report) {
      return errorResponse('보고서를 찾을 수 없습니다.', 404)
    }

    // 매칭 조회 및 기관 소속 확인
    const { data: match } = await supabase
      .from('bi_mentor_matches')
      .select('id, mentor_id, project_id, mentor_role, institution_id')
      .eq('id', report.match_id)
      .single()

    if (!match || match.institution_id !== institutionId) {
      return errorResponse('접근 권한이 없습니다.', 403)
    }

    // 멘토, 프로젝트 정보, 세션 조회
    const [{ data: mentor }, { data: project }, { data: sessions }] = await Promise.all([
      supabase.from('bi_users').select('id, name, email').eq('id', match.mentor_id).single(),
      supabase.from('bi_projects').select('id, name, current_stage').eq('id', match.project_id).single(),
      supabase
        .from('bi_mentoring_sessions')
        .select('id, match_id, round_number, session_type, session_date, duration_minutes, status, comments')
        .eq('match_id', match.id)
        .order('round_number', { ascending: true }),
    ])

    return successResponse({
      ...report,
      match: {
        ...match,
        mentor: mentor || null,
        project: project || null,
      },
      sessions: sessions || [],
    })
  } catch (error) {
    return handleApiError(error)
  }
}
