import { NextRequest } from 'next/server'
import { requireProjectAccess } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { successResponse, handleApiError } from '@/lib/utils/api-response'

interface RouteContext {
  params: Promise<{ id: string }>
}

// GET: 프로젝트의 멘토 피드백(멘토링 세션) 조회
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params
    await requireProjectAccess(id)

    const supabase = await createClient()

    // 프로젝트에 매칭된 멘토 매치 조회
    const { data: matches, error: matchError } = await supabase
      .from('bi_mentor_matches')
      .select('id, mentor_id, mentor_role, status')
      .eq('project_id', id)

    if (matchError) throw matchError

    if (!matches || matches.length === 0) {
      return successResponse([])
    }

    const matchIds = matches.map((m) => m.id)

    // 멘토링 세션 조회 (멘토 코멘트 포함)
    const { data: sessions, error: sessionError } = await supabase
      .from('bi_mentoring_sessions')
      .select('*')
      .in('match_id', matchIds)
      .order('round_number', { ascending: true })

    if (sessionError) throw sessionError

    return successResponse(sessions || [])
  } catch (error) {
    return handleApiError(error)
  }
}
