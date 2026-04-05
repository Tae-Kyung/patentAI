import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireMentor } from '@/lib/auth/guards'
import { createServiceClient } from '@/lib/supabase/service'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'

interface RouteContext {
  params: Promise<{ reportId: string }>
}

const updateReportSchema = z.object({
  mentor_opinion: z.string().optional(),
  strengths: z.string().optional(),
  improvements: z.string().optional(),
  overall_rating: z.number().min(1).max(5).optional(),
})

// PATCH: 보고서 수정 (draft 또는 rejected 상태만 가능)
export async function PATCH(
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
      return errorResponse('보고서에 대한 수정 권한이 없습니다.', 403)
    }

    // 상태 확인: draft 또는 rejected만 수정 가능
    if (report.status !== 'draft' && report.status !== 'rejected') {
      return errorResponse('제출된 보고서는 수정할 수 없습니다. 현재 상태: ' + report.status, 400)
    }

    const body = await request.json()
    const validatedData = updateReportSchema.parse(body)

    const { data: updatedReport, error: updateError } = await supabase
      .from('bi_mentoring_reports')
      .update({
        ...validatedData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', reportId)
      .select()
      .single()

    if (updateError) {
      console.error('Report update error:', updateError.message)
      return errorResponse('보고서 수정에 실패했습니다.', 500)
    }

    return successResponse(updatedReport)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues[0]?.message || '유효성 검사 오류', 400, 'VALIDATION_ERROR')
    }
    return handleApiError(error)
  }
}
