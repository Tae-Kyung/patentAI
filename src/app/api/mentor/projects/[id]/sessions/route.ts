import { NextRequest } from 'next/server'
import { requireMentorMatch } from '@/lib/auth/guards'
import { createServiceClient } from '@/lib/supabase/service'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'
import { z } from 'zod'

interface RouteContext {
  params: Promise<{ id: string }>
}

const createSessionSchema = z.object({
  session_type: z.enum(['review', 'feedback', 'revision', 'final']).default('review'),
  session_date: z.string().optional(),
  duration_minutes: z.number().int().positive().optional(),
})

// GET: 프로젝트 멘토링 세션 목록 조회
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params
    const user = await requireMentorMatch(id)

    const supabase = createServiceClient()

    // 해당 프로젝트의 매칭 정보 조회
    const { data: match, error: matchError } = await supabase
      .from('bi_mentor_matches')
      .select('id')
      .eq('project_id', id)
      .eq('mentor_id', user.id)
      .single()

    if (matchError || !match) {
      return errorResponse('멘토 매칭 정보를 찾을 수 없습니다.', 404)
    }

    // 해당 매칭의 모든 세션 조회
    const { data: sessions, error: sessionsError } = await supabase
      .from('bi_mentoring_sessions')
      .select('*')
      .eq('match_id', match.id)
      .order('round_number', { ascending: true })

    if (sessionsError) throw sessionsError

    return successResponse(sessions || [])
  } catch (error) {
    return handleApiError(error)
  }
}

// POST: 새 멘토링 세션 생성
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params
    const user = await requireMentorMatch(id)

    const supabase = createServiceClient()

    // 해당 프로젝트의 매칭 정보 조회
    const { data: match, error: matchError } = await supabase
      .from('bi_mentor_matches')
      .select('id')
      .eq('project_id', id)
      .eq('mentor_id', user.id)
      .single()

    if (matchError || !match) {
      return errorResponse('멘토 매칭 정보를 찾을 수 없습니다.', 404)
    }

    // 보고서가 제출된 경우 세션 생성 차단
    const { data: submittedReport } = await supabase
      .from('bi_mentoring_reports')
      .select('id, status')
      .eq('match_id', match.id)
      .in('status', ['submitted', 'confirmed'])
      .maybeSingle()

    if (submittedReport) {
      return errorResponse('멘토링 보고서가 제출된 이후에는 세션을 추가할 수 없습니다.', 400)
    }

    let body = {}
    try { body = await request.json() } catch { /* empty body is ok */ }
    const validatedData = createSessionSchema.parse(body)

    // 현재 최대 round_number 조회
    const { data: maxRoundData, error: roundError } = await supabase
      .from('bi_mentoring_sessions')
      .select('round_number')
      .eq('match_id', match.id)
      .order('round_number', { ascending: false })
      .limit(1)

    if (roundError) throw roundError

    const nextRound = (maxRoundData && maxRoundData.length > 0)
      ? maxRoundData[0].round_number + 1
      : 1

    // 세션 생성
    const { data: session, error: insertError } = await supabase
      .from('bi_mentoring_sessions')
      .insert({
        match_id: match.id,
        round_number: nextRound,
        session_type: validatedData.session_type,
        session_date: validatedData.session_date || null,
        duration_minutes: validatedData.duration_minutes || null,
        status: 'draft',
      })
      .select()
      .single()

    if (insertError) throw insertError

    return successResponse(session, 201)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return errorResponse(error.issues[0]?.message || '유효성 검사 오류', 400)
    }
    return handleApiError(error)
  }
}
