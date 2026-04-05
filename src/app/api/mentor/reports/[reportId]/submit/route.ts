import { NextRequest } from 'next/server'
import { requireMentor } from '@/lib/auth/guards'
import { createServiceClient } from '@/lib/supabase/service'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'

interface RouteContext {
  params: Promise<{ reportId: string }>
}

// POST: 보고서 제출
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { reportId } = await context.params
    const user = await requireMentor()

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

    // 소유권 확인: report -> match -> mentor_id
    const { data: match, error: matchError } = await supabase
      .from('bi_mentor_matches')
      .select('mentor_id')
      .eq('id', report.match_id)
      .single()

    if (matchError || !match) {
      return errorResponse('매칭 정보를 찾을 수 없습니다.', 404)
    }

    if (match.mentor_id !== user.id && user.role !== 'admin') {
      return errorResponse('보고서에 대한 제출 권한이 없습니다.', 403)
    }

    // 상태 확인: draft 또는 rejected만 제출 가능
    if (report.status !== 'draft' && report.status !== 'rejected') {
      return errorResponse('이미 제출된 보고서입니다. 현재 상태: ' + report.status, 400)
    }

    // 세션이 최소 1개 이상 있어야 제출 가능
    const { count: sessionCount } = await supabase
      .from('bi_mentoring_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('match_id', report.match_id)

    if (!sessionCount || sessionCount === 0) {
      return errorResponse('멘토링 세션이 없습니다. 세션을 1개 이상 생성한 후 보고서를 제출해 주세요.', 400)
    }

    const { data: updatedReport, error: updateError } = await supabase
      .from('bi_mentoring_reports')
      .update({
        status: 'submitted',
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', reportId)
      .select()
      .single()

    if (updateError) {
      console.error('Report submit error:', updateError.message)
      return errorResponse('보고서 제출에 실패했습니다.', 500)
    }

    return successResponse(updatedReport)
  } catch (error) {
    return handleApiError(error)
  }
}
