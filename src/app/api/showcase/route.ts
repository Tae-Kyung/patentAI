import { NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { successResponse, errorResponse } from '@/lib/utils/api-response'

// GET: 공개 프로젝트 목록 (비인증)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = Math.min(parseInt(searchParams.get('limit') || '12', 10), 50)
    const offset = (page - 1) * limit

    const supabase = createServiceClient()

    // 공개 프로젝트 조회
    const { data: projects, error, count } = await supabase
      .from('bi_projects')
      .select('id, name, status, visibility, industry_tags, created_at, gate_4_passed_at', { count: 'exact' })
      .in('visibility', ['public', 'summary'])
      .eq('status', 'completed')
      .order('gate_4_passed_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      return errorResponse('프로젝트 목록 조회에 실패했습니다.', 500)
    }

    // 각 프로젝트의 아이디어 요약과 평가 점수 가져오기
    const projectIds = (projects || []).map(p => p.id)

    const { data: ideaCards } = await supabase
      .from('bi_idea_cards')
      .select('project_id, problem, solution, target')
      .in('project_id', projectIds.length > 0 ? projectIds : ['__none__'])

    const { data: evaluations } = await supabase
      .from('bi_evaluations')
      .select('project_id, total_score, market_feedback')
      .in('project_id', projectIds.length > 0 ? projectIds : ['__none__'])

    // 프로젝트별로 데이터 합치기
    const enriched = (projects || []).map(project => {
      const idea = ideaCards?.find(ic => ic.project_id === project.id)
      const evaluation = evaluations?.find(ev => ev.project_id === project.id)

      let elevatorPitch: string | null = null
      if (evaluation?.market_feedback) {
        try {
          const mf = JSON.parse(evaluation.market_feedback as string)
          elevatorPitch = mf?.marketStory?.elevatorPitch || null
        } catch {
          // ignore
        }
      }

      return {
        id: project.id,
        name: project.name,
        visibility: project.visibility,
        industryTags: project.industry_tags,
        completedAt: project.gate_4_passed_at,
        problem: idea?.problem || null,
        solution: idea?.solution || null,
        totalScore: evaluation?.total_score || null,
        elevatorPitch,
      }
    })

    return successResponse({
      projects: enriched,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    })
  } catch {
    return errorResponse('쇼케이스 조회에 실패했습니다.', 500)
  }
}
