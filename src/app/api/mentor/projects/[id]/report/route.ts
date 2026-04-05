import { NextRequest } from 'next/server'
import { requireMentorMatch } from '@/lib/auth/guards'
import { createServiceClient } from '@/lib/supabase/service'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'

interface RouteContext {
  params: Promise<{ id: string }>
}

// POST: 보고서 생성 또는 기존 보고서 반환
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params
    const user = await requireMentorMatch(id)

    const supabase = createServiceClient()

    // 매칭 정보 조회
    const { data: match, error: matchError } = await supabase
      .from('bi_mentor_matches')
      .select('id')
      .eq('project_id', id)
      .eq('mentor_id', user.id)
      .limit(1)
      .single()

    if (matchError || !match) {
      return errorResponse('해당 프로젝트에 대한 멘토 매칭을 찾을 수 없습니다.', 404)
    }

    // 기존 보고서 확인
    const { data: existingReport } = await supabase
      .from('bi_mentoring_reports')
      .select('*')
      .eq('match_id', match.id)
      .limit(1)
      .single()

    if (existingReport) {
      return successResponse(existingReport)
    }

    // 새 보고서 생성 (빈 상태로)
    const { data: report, error: insertError } = await supabase
      .from('bi_mentoring_reports')
      .insert({
        match_id: match.id,
        status: 'draft',
      })
      .select()
      .single()

    if (insertError) {
      console.error('Report insert error:', insertError.message)
      return errorResponse('보고서 생성에 실패했습니다.', 500)
    }

    return successResponse(report, 201)
  } catch (error) {
    return handleApiError(error)
  }
}

// GET: 프로젝트 매칭 보고서 조회
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params
    const user = await requireMentorMatch(id)

    const supabase = createServiceClient()

    // 매칭 정보 조회
    const { data: match, error: matchError } = await supabase
      .from('bi_mentor_matches')
      .select('id')
      .eq('project_id', id)
      .eq('mentor_id', user.id)
      .limit(1)
      .single()

    if (matchError || !match) {
      return errorResponse('해당 프로젝트에 대한 멘토 매칭을 찾을 수 없습니다.', 404)
    }

    // 보고서 조회
    const { data: report, error: reportError } = await supabase
      .from('bi_mentoring_reports')
      .select('*')
      .eq('match_id', match.id)
      .limit(1)
      .single()

    if (reportError || !report) {
      return errorResponse('보고서를 찾을 수 없습니다.', 404)
    }

    return successResponse(report)
  } catch (error) {
    return handleApiError(error)
  }
}
