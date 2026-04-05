import { NextRequest } from 'next/server'
import { requireMentorMatch } from '@/lib/auth/guards'
import { createServiceClient } from '@/lib/supabase/service'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'

interface RouteContext {
  params: Promise<{ id: string }>
}

// GET: 멘토가 담당하는 프로젝트 상세 조회
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params
    await requireMentorMatch(id)

    const supabase = createServiceClient()

    // 프로젝트 기본 정보
    const { data: project, error } = await supabase
      .from('bi_projects')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !project) {
      return errorResponse('프로젝트를 찾을 수 없습니다.', 404)
    }

    // 아이디어 카드 조회
    const { data: ideaCards } = await supabase
      .from('bi_idea_cards')
      .select('*')
      .eq('project_id', id)
      .order('created_at', { ascending: false })

    // 평가 조회
    const { data: evaluations } = await supabase
      .from('bi_evaluations')
      .select('*')
      .eq('project_id', id)
      .order('created_at', { ascending: false })

    // 문서 조회
    const { data: documents } = await supabase
      .from('bi_documents')
      .select('*')
      .eq('project_id', id)
      .order('created_at', { ascending: false })

    // 프로젝트 소유자 정보 별도 조회
    const { data: owner } = await supabase
      .from('bi_users')
      .select('id, name, email')
      .eq('id', project.user_id)
      .single()

    return successResponse({
      ...project,
      owner: owner || null,
      ideaCards: ideaCards || [],
      evaluations: evaluations || [],
      documents: documents || [],
    })
  } catch (error) {
    return handleApiError(error)
  }
}
