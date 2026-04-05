import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'

interface RouteContext {
  params: Promise<{ id: string }>
}

// GET: 프로젝트에 배정된 멘토 정보 조회
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params
    const user = await requireAuth()

    const supabase = await createClient()

    // 프로젝트 소유자 확인
    const { data: project, error: projectError } = await supabase
      .from('bi_projects')
      .select('user_id')
      .eq('id', id)
      .single()

    if (projectError || !project) {
      return errorResponse('프로젝트를 찾을 수 없습니다.', 404)
    }

    if (project.user_id !== user.id && user.role !== 'admin') {
      return errorResponse('프로젝트에 대한 접근 권한이 없습니다.', 403)
    }

    // 멘토 매칭 정보 조회
    const { data: matches, error: matchError } = await supabase
      .from('bi_mentor_matches')
      .select('id, mentor_id, mentor_role, status, created_at')
      .eq('project_id', id)

    if (matchError) throw matchError

    if (!matches || matches.length === 0) {
      return successResponse([])
    }

    const mentorIds = matches.map((m) => m.mentor_id)

    // 멘토 프로필 조회
    const { data: mentorProfiles, error: profileError } = await supabase
      .from('bi_mentor_profiles')
      .select('user_id, specialty, career_summary, is_approved')
      .in('user_id', mentorIds)

    if (profileError) throw profileError

    // 멘토 사용자 정보 조회
    const { data: mentorUsers, error: userError } = await supabase
      .from('bi_users')
      .select('id, name, email')
      .in('id', mentorIds)

    if (userError) throw userError

    // 멘토 정보 병합
    const enrichedMentors = matches.map((match) => {
      const profile = mentorProfiles?.find((p) => p.user_id === match.mentor_id)
      const userInfo = mentorUsers?.find((u) => u.id === match.mentor_id)

      return {
        match_id: match.id,
        mentor_id: match.mentor_id,
        mentor_role: match.mentor_role,
        status: match.status,
        matched_at: match.created_at,
        name: userInfo?.name || null,
        email: userInfo?.email || null,
        specialty: profile?.specialty || null,
        career_summary: profile?.career_summary || null,
        is_approved: profile?.is_approved || false,
      }
    })

    return successResponse(enrichedMentors)
  } catch (error) {
    return handleApiError(error)
  }
}
