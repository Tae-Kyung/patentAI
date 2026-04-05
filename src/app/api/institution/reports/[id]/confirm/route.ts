import { NextRequest } from 'next/server'
import { requireInstitutionAccess } from '@/lib/auth/institution'
import { createServiceClient } from '@/lib/supabase/service'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'
import { isValidUUID } from '@/lib/security/validation'
import { createNotification } from '@/lib/notifications'

// POST: 보고서 확인(승인) → 수당 레코드 자동 생성
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { searchParams } = new URL(request.url)
    const { user, institutionId } = await requireInstitutionAccess(searchParams.get('institution_id'))
    const { id } = await context.params
    if (!isValidUUID(id)) return errorResponse('잘못된 ID 형식입니다.', 400)

    const supabase = createServiceClient()

    // 보고서 조회
    const { data: report, error: reportError } = await supabase
      .from('bi_mentoring_reports')
      .select('id, match_id, status')
      .eq('id', id)
      .single()

    if (reportError || !report) {
      return errorResponse('보고서를 찾을 수 없습니다.', 404)
    }

    if (report.status === 'confirmed') {
      return errorResponse('이미 확인된 보고서입니다.', 400)
    }

    // 보고서 확인 처리
    const { error } = await supabase
      .from('bi_mentoring_reports')
      .update({
        status: 'confirmed',
        confirmed_by: user.id,
        confirmed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) {
      console.error('Report confirm error:', error.message)
      return errorResponse('보고서 확인에 실패했습니다.', 500)
    }

    // 매칭 정보 조회 (멘토, 기관, 프로그램)
    const { data: match } = await supabase
      .from('bi_mentor_matches')
      .select('id, mentor_id, institution_id, program_id, project_id')
      .eq('id', report.match_id)
      .single()

    if (match) {
      // 프로젝트명 조회
      let projectName = '프로젝트'
      if (match.project_id) {
        const { data: project } = await supabase
          .from('bi_projects')
          .select('name')
          .eq('id', match.project_id)
          .single()
        if (project?.name) projectName = project.name
      }

      // 모든 세션(draft, submitted)을 자동으로 acknowledged 처리
      await supabase
        .from('bi_mentoring_sessions')
        .update({
          status: 'acknowledged',
          updated_at: new Date().toISOString(),
        })
        .eq('match_id', match.id)
        .in('status', ['draft', 'submitted'])

      // 세션 통계 집계 (acknowledged 세션)
      const { data: sessions } = await supabase
        .from('bi_mentoring_sessions')
        .select('duration_minutes, status')
        .eq('match_id', match.id)
        .eq('status', 'acknowledged')

      const totalSessions = sessions?.length || 0
      const totalMinutes = sessions?.reduce((sum, s) => sum + (s.duration_minutes || 0), 0) || 0
      const totalHours = Math.round(totalMinutes / 60 * 10) / 10

      // 기관 단가 조회
      const { data: institution } = await supabase
        .from('bi_institutions')
        .select('session_unit_price')
        .eq('id', match.institution_id)
        .single()

      const unitPrice = institution?.session_unit_price || 200000
      const amount = totalSessions * unitPrice

      // 중복 방지: 동일 report_id로 이미 생성된 수당이 있는지 확인
      const { data: existingPayout } = await supabase
        .from('bi_mentor_payouts')
        .select('id')
        .eq('report_id', id)
        .limit(1)

      if (!existingPayout || existingPayout.length === 0) {
        const { error: payoutError } = await supabase
          .from('bi_mentor_payouts')
          .insert({
            report_id: id,
            mentor_id: match.mentor_id,
            institution_id: match.institution_id,
            program_id: match.program_id,
            amount,
            total_sessions: totalSessions,
            total_hours: totalHours,
            status: 'pending',
          })

        if (payoutError) {
          console.error('Payout creation error:', payoutError.message)
          // 수당 생성 실패해도 보고서 확인은 완료된 상태이므로 경고만 반환
        }
      }

      // 매칭 상태를 completed로 변경
      await supabase
        .from('bi_mentor_matches')
        .update({
          status: 'completed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', match.id)

      // 멘토에게 보고서 확인 알림
      await createNotification({
        userId: match.mentor_id,
        type: 'report_confirmed',
        title: `[${projectName}] 보고서가 확인되었습니다.`,
        message: `세션 ${totalSessions}회, 수당 ${amount.toLocaleString()}원이 등록되었습니다.`,
        link: match.project_id ? `/projects/${match.project_id}/mentoring/report` : '/dashboard',
      })
    }

    return successResponse({ message: '보고서가 확인되었습니다.' })
  } catch (error) {
    return handleApiError(error)
  }
}
