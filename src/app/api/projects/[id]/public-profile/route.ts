import { NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { successResponse, errorResponse } from '@/lib/utils/api-response'

interface RouteContext {
  params: Promise<{ id: string }>
}

// GET: 공개 프로필 조회 (비인증)
export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params
    const supabase = createServiceClient()

    // 프로젝트 조회 (public 또는 summary만)
    const { data: project, error } = await supabase
      .from('bi_projects')
      .select('id, name, status, current_stage, visibility, industry_tags, created_at, gate_4_passed_at')
      .eq('id', id)
      .in('visibility', ['public', 'summary'])
      .single()

    if (error || !project) {
      return errorResponse('프로젝트를 찾을 수 없습니다.', 404)
    }

    // 아이디어 카드 (요약)
    const { data: ideaCard } = await supabase
      .from('bi_idea_cards')
      .select('problem, solution, target, differentiation, uvp, channels, revenue_streams, cost_structure, key_metrics')
      .eq('project_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    // 평가 결과
    const { data: evaluation } = await supabase
      .from('bi_evaluations')
      .select('investor_score, market_score, tech_score, total_score, market_feedback, recommendations')
      .eq('project_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    // 시장 스토리에서 엘리베이터 피치 추출
    let elevatorPitch: string | null = null
    if (evaluation?.market_feedback) {
      try {
        const marketData = JSON.parse(evaluation.market_feedback)
        elevatorPitch = marketData?.marketStory?.elevatorPitch || null
      } catch {
        // ignore parse error
      }
    }

    const profile: Record<string, unknown> = {
      id: project.id,
      name: project.name,
      industryTags: project.industry_tags,
      completedAt: project.gate_4_passed_at,
      ideaSummary: ideaCard ? {
        problem: ideaCard.problem,
        solution: ideaCard.solution,
        target: ideaCard.target,
        differentiation: ideaCard.differentiation,
        uvp: ideaCard.uvp,
        channels: ideaCard.channels,
        revenueStreams: ideaCard.revenue_streams,
        costStructure: ideaCard.cost_structure,
        keyMetrics: ideaCard.key_metrics,
      } : null,
      scores: evaluation ? {
        investor: evaluation.investor_score,
        market: evaluation.market_score,
        tech: evaluation.tech_score,
        total: evaluation.total_score,
      } : null,
      elevatorPitch,
      recommendations: evaluation?.recommendations || [],
    }

    // 전체 공개일 경우 문서 목록도 포함
    if (project.visibility === 'public') {
      const { data: documents } = await supabase
        .from('bi_documents')
        .select('id, type, title, is_confirmed, created_at')
        .eq('project_id', id)
        .eq('is_confirmed', true)
        .order('created_at', { ascending: false })

      profile.documents = documents || []
    }

    return successResponse(profile)
  } catch {
    return errorResponse('공개 프로필 조회에 실패했습니다.', 500)
  }
}
