import { NextRequest } from 'next/server'
import { preparePatentGeneration, stripCodeFence } from '@/lib/services/patent-generator'
import { streamClaude, createSSEResponse } from '@/lib/ai/claude'
import { preparePrompt } from '@/lib/prompts'
import { errorResponse } from '@/lib/utils/api-response'

const PROMPT_KEY = 'patent_prior_art_avoidance'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  // GATE 1 통과 확인 (avoidance는 Gate 1 이후 실행 가능)
  const ctx = await preparePatentGeneration(id, PROMPT_KEY, 1)
  if (ctx instanceof Response) return ctx

  const { supabase, project } = ctx

  // 선행기술 조사 결과 조회
  const { data: priorArts } = await supabase
    .from('patentai_patent_prior_art')
    .select('*')
    .eq('project_id', id)
    .in('risk_level', ['high', 'medium'])
    .order('similarity_score', { ascending: false })

  if (!priorArts || priorArts.length === 0) {
    return errorResponse('회피 분석 대상 선행기술이 없습니다. 먼저 선행기술 조사를 실행해주세요.', 400)
  }

  // 구성요소 조회
  const { data: components } = await supabase
    .from('patentai_patent_components')
    .select('ref_number, name, description, has_prior_art_conflict, conflict_risk')
    .eq('project_id', id)
    .order('order_index', { ascending: true })

  const prepared = await preparePrompt(PROMPT_KEY, {
    tech_domain: project.tech_domain ?? '',
    core_inventions: JSON.stringify(project.core_inventions, null, 2),
    components: JSON.stringify(
      (components ?? []).map((c) => ({
        ref_number: c.ref_number,
        name: c.name,
        description: c.description,
        has_conflict: c.has_prior_art_conflict,
        conflict_risk: c.conflict_risk,
      })),
      null,
      2,
    ),
    prior_arts: JSON.stringify(
      priorArts.map((p) => ({
        source: p.source_db,
        patent_number: p.patent_number,
        title: p.title,
        abstract: p.abstract?.slice(0, 300),
        similarity_score: p.similarity_score,
        risk_level: p.risk_level,
      })),
      null,
      2,
    ),
  })

  if (!prepared) return errorResponse('프롬프트를 불러올 수 없습니다.', 500)

  async function* generate() {
    let fullText = ''

    for await (const event of streamClaude(prepared!.systemPrompt, prepared!.userPrompt, {
      model: prepared!.model,
      temperature: prepared!.temperature,
      maxTokens: prepared!.maxTokens,
    })) {
      if (event.type === 'text') {
        fullText += event.data
        yield { type: 'text', data: event.data }
      }
    }

    try {
      const json = JSON.parse(stripCodeFence(fullText))

      // 각 선행기술에 회피 전략 저장
      const avoidanceList: Array<{ patent_number: string; suggestion: string }> =
        json.avoidance_strategies ?? []

      for (const item of avoidanceList) {
        await supabase
          .from('patentai_patent_prior_art')
          .update({ avoidance_suggestion: item.suggestion })
          .eq('project_id', id)
          .eq('patent_number', item.patent_number)
      }

      // 전체 위험도 업데이트 (회피 전략 반영)
      if (json.overall_risk) {
        await supabase
          .from('patentai_patent_projects')
          .update({ overall_prior_art_risk: json.overall_risk })
          .eq('id', id)
      }

      yield { type: 'result', data: JSON.stringify(json) }
    } catch (err) {
      console.error('Avoidance parse error:', err)
      yield { type: 'error', data: '회피 전략 파싱에 실패했습니다.' }
    }

    yield { type: 'done', data: '' }
  }

  return createSSEResponse(generate())
}
