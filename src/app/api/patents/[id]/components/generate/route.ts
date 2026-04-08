import { NextRequest } from 'next/server'
import { preparePatentGeneration, stripCodeFence } from '@/lib/services/patent-generator'
import { streamClaude, createSSEResponse } from '@/lib/ai/claude'
import { preparePrompt } from '@/lib/prompts'
import { errorResponse } from '@/lib/utils/api-response'

const PROMPT_KEY = 'patent_component_structuring'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  // GATE 1 통과 확인
  const ctx = await preparePatentGeneration(id, PROMPT_KEY, 1)
  if (ctx instanceof Response) return ctx

  const { supabase, project } = ctx

  // 분석 결과 조회
  const { data: inputs } = await supabase
    .from('patentai_patent_inputs')
    .select('analysis_result')
    .eq('project_id', id)
    .not('analysis_result', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)

  const analysisResult = inputs?.[0]?.analysis_result ?? {
    tech_domain: project.tech_domain,
    ipc_suggestions: project.ipc_codes,
    core_inventions: project.core_inventions,
  }

  const prepared = await preparePrompt(PROMPT_KEY, {
    analysis_result: JSON.stringify(analysisResult, null, 2),
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

      // 기존 구성요소 삭제 후 재삽입
      await supabase
        .from('patentai_patent_components')
        .delete()
        .eq('project_id', id)

      const components: Array<{
        ref_number: string
        name: string
        description: string
        parent_ref: string | null
      }> = json.components ?? []

      // ref_number → id 매핑용
      const refToId = new Map<string, string>()

      // 부모 없는 것부터 삽입 (순서 보장)
      const ordered = [
        ...components.filter((c) => !c.parent_ref),
        ...components.filter((c) => !!c.parent_ref),
      ]

      for (let i = 0; i < ordered.length; i++) {
        const comp = ordered[i]
        const parentId = comp.parent_ref ? refToId.get(comp.parent_ref) ?? null : null

        const { data: inserted } = await supabase
          .from('patentai_patent_components')
          .insert({
            project_id: id,
            parent_id: parentId,
            ref_number: comp.ref_number,
            name: comp.name,
            description: comp.description ?? null,
            order_index: i,
          })
          .select('id')
          .single()

        if (inserted) refToId.set(comp.ref_number, inserted.id)
      }

      yield { type: 'result', data: JSON.stringify(json) }
    } catch (err) {
      console.error('Component structuring parse error:', err)
      yield { type: 'error', data: '구성요소 파싱에 실패했습니다.' }
    }

    yield { type: 'done', data: '' }
  }

  return createSSEResponse(generate())
}
